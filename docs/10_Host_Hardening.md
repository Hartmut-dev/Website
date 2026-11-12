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
