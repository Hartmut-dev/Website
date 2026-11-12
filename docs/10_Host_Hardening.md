## Host Hardening Overview
The host was hardened in two rounds, each written as a re-runnable shell script. Every change is a separate drop-in file, so any single change can be undone by deleting that file.

*   **Scripts:** `~/homelab/scripts/harden-root.sh` and `~/homelab/scripts/harden-root-2.sh`
*   **Result:** Lynis hardening index **66 -> 71**, zero warnings.

---

##  SSH
**File:** `/etc/ssh/sshd_config.d/00-hardening.conf`

```
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
AllowUsers <admin-user>
AllowAgentForwarding no
AllowTcpForwarding local
LogLevel VERBOSE
ClientAliveInterval 300
ClientAliveCountMax 2
```

*   **Key-only login** (ed25519), no passwords, no root.
*   **`AllowTcpForwarding local`** keeps `ssh -L` and VS Code Remote working but blocks reverse tunnels (`-R`).
*   **`LogLevel VERBOSE`** logs which key was used for each login.

**Verification:**
```bash
sudo sshd -t     # syntax check before reloading
sudo sshd -T | grep -E '^(passwordauthentication|permitrootlogin)'
```

---

##  Firewall (ufw)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow in on tailscale0
sudo ufw allow 41641/udp                                  # Tailscale direct connections
sudo ufw allow from <home-lan-subnet> to any port 22 proto tcp
sudo ufw allow in on virbr0 to any port 53                # libvirt VM DNS
sudo ufw allow in on virbr0 to any port 67 proto udp      # libvirt VM DHCP
sudo ufw enable
```

---

##  fail2ban
Bans IPs after repeated SSH failures, while never banning the tailnet or home LAN.

**File:** `/etc/fail2ban/jail.d/sshd.local`
```
[sshd]
enabled  = true
backend  = systemd
maxretry = 5
findtime = 10m
bantime  = 1h
ignoreip = 127.0.0.1/8 ::1 100.64.0.0/10 <home-lan-subnet>
```

---

##  Kernel Hardening (sysctl)
**File:** `/etc/sysctl.d/90-hardening.conf`

*   **Network:** ignore ICMP redirects and source-routed packets, don't send redirects, log martian packets, SYN cookies on.
*   **`rp_filter = 2` (loose)** - strict mode breaks Tailscale routing.
*   **`ip_forward` left on** - Docker, Tailscale, and libvirt need it.
*   **Kernel info leaks:** `kptr_restrict = 2`, `dmesg_restrict = 1`, `sysrq = 0`.
*   **BPF:** `unprivileged_bpf_disabled = 1`, `bpf_jit_harden = 2`.
*   **Filesystem:** `suid_dumpable = 0`, `protected_fifos = 2`, `protected_regular = 2`.

> **Lesson learned:** `bpf_jit_harden = 2` broke the NVIDIA Container Toolkit's legacy GPU mode, which only showed up at the next reboot two weeks later. Fixed by moving GPU containers to CDI mode instead of relaxing the setting. See [[03_Media_Server_Jellyfin]].

---

##  Unused Network Protocols
**File:** `/etc/modprobe.d/90-unused-protocols.conf`
```
install dccp /bin/false
install sctp /bin/false
install rds /bin/false
install tipc /bin/false
```
(Rarely used protocols with a history of kernel vulnerabilities. Nothing on this host needs them.)

---

##  Secrets Management (sops + age)
Service secrets (VPN credentials, tunnel key, API keys) used to sit in plain-text `.env` files, and the nightly backup copied them to the HDD every day with 30-day retention. They are now **encrypted at rest** and only decrypted in memory when a container is created.

*   **age** - modern file encryption. One key pair: the public key locks, the private key unlocks.
*   **sops** - encrypts the *values* in a secrets file with that key, and runs a command with them decrypted into its environment (`sops exec-env`).
*   **Key storage:** private key in `~/.config/sops/age/keys.txt` (mode 600), with an offline copy in a password manager. It is deliberately **not** included in backups, so a stolen backup is useless on its own.
*   **Why not a cloud secrets manager?** Proton Pass CLI was evaluated first (scoped, read-only access tokens), but it requires a higher plan tier. sops + age is free, offline, and an industry-standard pattern.

**1. Install (verified):**
```bash
sudo apt install -y age                       # signed Ubuntu repo
curl -sLO https://github.com/getsops/sops/releases/download/v3.13.3/sops-v3.13.3.linux.amd64
curl -sLO https://github.com/getsops/sops/releases/download/v3.13.3/sops-v3.13.3.checksums.txt
grep ' sops-v3.13.3.linux.amd64$' sops-v3.13.3.checksums.txt | sha256sum -c -
install -m 755 sops-v3.13.3.linux.amd64 ~/.local/bin/sops
```

**2. Generate the Key (never printed to screen or logs):**
```bash
mkdir -p ~/.config/sops/age && chmod 700 ~/.config/sops ~/.config/sops/age
(umask 077; age-keygen -o ~/.config/sops/age/keys.txt)
```

**3. Encryption Rule (`~/.sops.yaml`, public key only):**
```yaml
creation_rules:
  - path_regex: secrets\.enc\.env$
    age: <age-public-key>
```

**4. Compose Refuses to Start Without Secrets:**
```yaml
environment:
  OPENVPN_PASSWORD: ${OPENVPN_PASSWORD:?run via compose-secrets}
```

**5. Helper Script (`~/homelab/scripts/compose-secrets`):**
```bash
#!/bin/bash
set -euo pipefail
dir=$1; shift
cd "$dir"
cmd="docker compose $(printf '%q ' "$@")"     # quote every argument safely
exec "$HOME/.local/bin/sops" exec-env secrets.enc.env "$cmd"
```
```bash
compose-secrets ~/docker/qbittorrent up -d     # start / recreate
sops ~/docker/qbittorrent/secrets.enc.env      # edit (decrypts in an editor, re-encrypts on save)
```

**6. Migration & Verification:**
*   Each secret was checked after encryption by comparing its **length** or a **hash prefix** against the running container, never the value itself.
*   Containers were recreated through the helper and re-tested (VPN IP, kill switch, tunnel connected).
*   All plain-text copies were removed with `shred`: the live `.env` files, old `.env.bak` copies, and **15 daily config snapshots** on the backup disk. A final search for one of the keys across the home folder and backup disk found no plain-text copies.

**Limits (honest threat model):**
*   Protects files, backups, and accidental leaks, **not** a fully compromised host: root can still read a running container's environment (`docker inspect`).
*   `shred` on a journaling filesystem or SSD is best-effort. For truly sensitive keys, the complete fix is **rotation** (issuing new keys).
*   Lose the age key and the secrets are unrecoverable, hence the offline backup.

---

##  Secret Scanning (Documentation Repo)
These docs are published from the server to a public GitHub repo, so every commit is scanned for secrets before it is allowed.

*   **Tool:** gitleaks 8.30.1, installed to `~/.local/bin` (release checksum verified, no root needed).
*   **Built-in rules:** API keys, tokens, passwords, private keys.
*   **Custom rules:** internal hostnames, private IP ranges, tunnel addresses, server IDs, and personal email addresses.
*   **Custom rules live outside the repo** (`~/.config/gitleaks/`). A public rules file listing private details would leak exactly what it protects.

**1. Install (verified download):**
```bash
curl -sLO https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz
curl -sLO https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_checksums.txt
grep linux_x64.tar.gz gitleaks_8.30.1_checksums.txt | sha256sum -c -
tar -xzf gitleaks_8.30.1_linux_x64.tar.gz gitleaks
install -m 755 gitleaks ~/.local/bin/gitleaks
```

**2. Custom Rule Example (`~/.config/gitleaks/homelab.toml`):**
```toml
[extend]
useDefault = true          # keep all built-in rules

[[rules]]
id = "lan-ip"
description = "Home LAN address"
regex = '''\b192\.168\.\d{1,3}\.\d{1,3}\b'''
```

**3. Pre-commit Hook (`.git/hooks/pre-commit`):**
```sh
#!/bin/sh
GL="$HOME/.local/bin/gitleaks"
CFG="$HOME/.config/gitleaks/homelab.toml"
if [ ! -x "$GL" ] || [ ! -f "$CFG" ]; then
  echo "pre-commit: gitleaks or its config is missing; refusing to commit." >&2
  exit 1               # fail closed, never skip the scan silently
fi
exec "$GL" git --pre-commit --staged --redact --no-banner --config "$CFG" .
```

**4. Verification:**
```bash
# Full history scan
gitleaks git --config ~/.config/gitleaks/homelab.toml .
# Planted test: a fake internal hostname must block the commit
echo "https://myhost.tail<hex-id>.ts.net" > leaktest.md   # real hex ID used in the actual test && git add leaktest.md && git commit -m test
```
(The test commit was blocked with `leaks found: 1`, and the full history scanned clean. The hook also caught the fake hostname in the first draft of this very page.)

**Known gap:** Edits made directly on github.com bypass the local hook.

---

##  Auditing with Lynis
```bash
sudo lynis audit system
grep hardening_index /var/log/lynis-report.dat
```
| Scan | Hardening Index |
|---|---|
| Baseline (Oct 2026) | 66 |
| After round 2 | 71, no warnings |

**Remaining (optional):** auditd, off-site backups, disabling UPnP on both routers.
