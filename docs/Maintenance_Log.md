## Maintenance Log
Running notes on updates, fixes, and changes. Newest first.

---

### 2026-11-25
*   **Updates + reboot:** new kernel from unattended-upgrades plus pending packages, then a reboot. Checked before rebooting that the NVIDIA DKMS module was already built for the new kernel (the lesson from the GPU incident). After: all containers healthy, GPU visible in Ollama, DNS and the tunnel back, no failed units. The remaining updates are Ubuntu *phased* updates, which arrive in stages on their own.
*   **Janitor drift warnings:** the daily digest had warned for five days about a changed Unbound image. Cause: the image rebuilt for the DNS fix on 11-19 was never re-approved into the baseline. Re-approved, plus a new on-demand D-Bus service that a package update enabled. Lesson: re-approve the baseline right after any planned rebuild. Overnight log triage flagged errors from the playit agent; they were an outage on playit's side (Cloudflare 502/503 replies) and it reconnected on its own.
*   **Cabling plan simplified:** one Cat6 run to the office instead of two. Step one swaps the powerline link for the cable, nothing else changes; the single-router, single-NAT layout comes later as an upgrade. See [ROADMAP](ROADMAP.md).
*   **New direction:** open-sourcing the janitor so anyone can install it, and building a small-business external security check on the same "scripts decide, the model only words it" pattern. See *Building something real* in the [ROADMAP](ROADMAP.md).

### 2026-11-19
*   **DNS lag fixed:** about 1 in 60 lookups from the desktop stalled for up to 1.8 s. Cause: Unbound's newer default `serve-expired-client-timeout: 1800` waits for a fresh answer before serving an expired cached one. Set it to 0 and enlarged the caches. Server load, bandwidth, packet loss and LAN latency all checked and fine. See [13 DNS](13_DNS_Pihole_and_Unbound.md).

### 2026-11-17
*   **Lynis 70 -> 74:** fixed two hardening sysctls that had silently reverted at boot (ufw's own sysctl file, apport). The drift check now compares running sysctl values with the configured ones, not just with the baseline. Follow-up round: auditd with 24 rules, debsums (0 changed files), libpam-tmpdir, apt-listchanges and apt-show-versions, fail2ban `jail.local`, `UMASK 027`, six leftover kernel configs purged. See [10 Host Hardening](10_Host_Hardening.md#lynis-follow-up-nov-2026).
*   **Lynis 74 -> 78:** rkhunter (5 first-scan false positives handled), weekly debsums and rkhunter scans read by the janitor, process accounting, pwquality, USB storage blocked, legal banner, three documented sysctl exceptions. Skipped compiler restriction and SSH limits on purpose.
*   **Double NAT investigated, kept for now:** nbn FTTP, no CGNAT, easy NAT for Tailscale. The ISP modem also serves other people on the network, so removing the double NAT waits for two Cat6 runs to the office (quotes requested). See [ROADMAP](ROADMAP.md).

### 2026-11-16
*   **Minecraft idle auto-stop:** cron script on the Crafty API stops the server after 20 minutes empty (ntfy push), and replaces Crafty's 12h restart with "restart only if running". API key limited to Commands + Schedule via a Crafty role. See [07 Minecraft Game Server](07_Minecraft_Game_Server.md).
*   **Investigated:** systemd-resolved switching UDP/TCP for one public resolver about 190 times an hour for ten hours; DNS kept working (one failed snap refresh). Watching; recheck after the double-NAT removal.

*   **New service: Uptime Kuma.** 12 monitors (web UIs, health endpoints, three DNS resolvers, website + certificate), alerts to ntfy with its own token; tailnet only. See [15 Monitoring Uptime Kuma](15_Monitoring_Uptime_Kuma.md).
*   **Website hardening:** TLS reviewed; CSP + referrer policy meta tags, inline scripts moved to `site.js`, `rel="noopener"` on external links.
*   **GitHub Action secret scan:** gitleaks on every push incl. github.com edits, pinned and checksum-verified. See [10 Host Hardening](10_Host_Hardening.md).

### 2026-11-15
*   **Phone access:** the iPhone got its own ed25519 SSH key (generated on the phone, password login stays off) and connects over Tailscale. Working from the phone: tmux + Claude Code Remote Control + a second window for sudo. See [09 Remote Access](09_Remote_Access_Tailscale_and_Tunnels.md).

### 2026-11-14
*   **AI memory:** handover split into an Obsidian vault of 43 linked notes (index, services, devices, decisions, incidents, sessions); checked with fact, inventory, link and secret passes. Then versioned with git and synced to the desktop with Syncthing (tailnet only, no relays/discovery). See [14 AI Second Brain Obsidian Vault](14_AI_Second_Brain_Obsidian_Vault.md).
*   **LLM janitor step 1:** 22 hourly health checks (disks, SMART, temps, RAM, containers, backups, updates, fail2ban); root checks via a root-owned copy + cron. Baseline 21 ok, 1 warn (pending updates).
*   **Jellyfin:** opened to the LG TV only (ufw), shows added via hard links.
*   **New service:** Pi-hole + Unbound. DNS for all Tailscale devices, then the home router (DHCP reservation + DHCP DNS). Devices named under `.home.arpa`. See [13 DNS Pihole and Unbound](13_DNS_Pihole_and_Unbound.md).
*   **Fixed:** Tailscale masquerading hid client IPs (`--snat-subnet-routes=false`); router handed out itself as secondary DNS; desktop had static Google DNS.
*   **Updates:** 72 packages (systemd, containerd, NVIDIA container toolkit 1.20.2, libvirt/qemu) via a self-logging script, then a reboot test: all 9 containers, GPU passthrough, DNS, Tailscale and the playit tunnel came back unattended. Server timezone UTC -> Australia/Perth.
*   **LLM janitor step 2:** daily digest by qwen3:8b (JSON schema, validated against the script's facts, template fallback). Tested with planted faults + a prompt injection. Fixed a false backup alarm: log timestamps now include the UTC offset.
*   **Website:** new Projects page with six case studies; homepage lab card and automation card rewritten from placeholders to real work; blog roadmap section rewritten as Done / Now / Next to match the roadmap.
*   **LLM janitor steps 6-7 (complete):** SQLite GPU job queue that yields to Jellyfin; graded fault-injection suite, 25/25 after fixing a triage blind spot (rare lines never reviewed) and adding a script-level "suspicious" flag after the model labelled an injected line as noise.
*   **LLM janitor steps 3-5:** transition-based alert logic (ntfy staged), hourly config-drift check against an approved baseline, daily log triage with a human-approved noise list.
*   **Fixed:** the server was using its own Pi-hole via router DHCP (breaks the "infrastructure doesn't depend on itself" rule). Now ignores DHCP DNS and uses public resolvers directly.
*   **New service:** ntfy push server (tailnet only, deny-all auth) for janitor alerts. Nightly config snapshot extended to DNS, ntfy and janitor code.
*   **Investigated:** a manual Crafty backup that "never appeared" was created fine and later rotated out by the 8-zip retention (manual backups count toward it). See [11 Backup Strategy](11_Backup_Strategy.md).
*   **Router:** firmware updated, admin password rotated, remote management and WPS off.
*   **Fixed:** phone DNS outages away from home. The iOS tunnel stalled for 25 to 40 minutes while Pi-hole was the only tailnet nameserver, so every lookup failed. On reconnect, a retry burst tripped Pi-hole's rate limit. Quad9 added as a second global nameserver. See [13 DNS Pihole and Unbound](13_DNS_Pihole_and_Unbound.md).
*   **Website:** inline CSS moved to one shared `style.css` (first step of the redesign).

### 2026-11-13
*   **Hardware:** RAM upgraded 16GB -> 32GB (2x16GB DDR4-2666). memtester 12G: all ok; Memtest86+: 2 passes, 0 errors. See [01 Hardware and Storage](01_Hardware_and_Storage.md).
*   **Verified:** First reboot since the CDI fix; GPU containers, VPN, Tailscale and all services came back unattended.

### 2026-11-12
*   **Security:** All service `.env` files replaced with sops + age encrypted secrets; plain-text copies (including 15 backup snapshots) shredded. See [10 Host Hardening](10_Host_Hardening.md).
*   **Cleanup:** Mod undo backups deleted after a friend tested the mods. Host scripts moved to `~/homelab/scripts/`, logs to `~/homelab/logs/`, old compose files into per-app `archive/` folders. ~11GB of migration and update leftovers moved (checksum-verified) to a quarantine folder on the HDD, to be purged after two weeks.
*   **Security:** gitleaks pre-commit hook added to the docs repo. See [10 Host Hardening](10_Host_Hardening.md).
*   **Fixed:** Jellyfin and Ollama failed to start after reboot (`failed to add device rules`). Root cause: `bpf_jit_harden = 2` breaks the NVIDIA toolkit's legacy GPU mode. Switched both to CDI mode; hardening unchanged. See [03 Media Server Jellyfin](03_Media_Server_Jellyfin.md).
*   **Removed:** Retired the experimental HITL security agent script (approval step could be bypassed).
*   **Docs:** Added pages 03, 04, 07-11, roadmap, and this log. Docs now published from the homelab via a repo-scoped deploy key.

### 2026-11-03 to 2026-11-07
*   **Updated:** Minecraft modpack to Create Ultimate Selection 2 v13.1.0, plus extra mods (each with checksum and undo backup). See [07 Minecraft Game Server](07_Minecraft_Game_Server.md).
*   **Kernel:** 7.0.0-42 installed by unattended upgrades.

### 2026-10-30
*   **Hardening round 1 & 2:** ufw, fail2ban, SSH key-only, sysctl hardening, unused protocols blocked. Lynis 66 -> 71. See [10 Host Hardening](10_Host_Hardening.md).
*   **Network:** All Docker ports bound to localhost; access via `tailscale serve` only. See [09 Remote Access Tailscale and Tunnels](09_Remote_Access_Tailscale_and_Tunnels.md).
*   **Backups:** `storage-backup.sh` copying world backups to the HDD hourly. See [11 Backup Strategy](11_Backup_Strategy.md).
*   **CTF lab phase 1:** Isolated libvirt network built; isolation test 19/19 blocked.

### 2026-10-29
*   **Migrated:** Minecraft server from `itzg/minecraft-server` to Crafty Controller, with the playit.gg tunnel for public access.

### 2026-10-13
*   **Online:** Ubuntu Server installed, NVIDIA drivers and Container Toolkit, Jellyfin and the Ollama/Open WebUI stack deployed.
