## Maintenance Log
Running notes on updates, fixes, and changes. Newest first.

---

### 2026-11-14
*   **AI memory:** handover split into an Obsidian vault of 43 linked notes (index, services, devices, decisions, incidents, sessions); checked with fact, inventory, link and secret passes. Then versioned with git and synced to the desktop with Syncthing (tailnet only, no relays/discovery). See [[14_AI_Second_Brain_Obsidian_Vault]].
*   **LLM janitor step 1:** 22 hourly health checks (disks, SMART, temps, RAM, containers, backups, updates, VPN leak, fail2ban); root checks via a root-owned copy + cron. Baseline 21 ok, 1 warn (pending updates).
*   **Jellyfin:** opened to the LG TV only (ufw), shows added via hard links.
*   **New service:** Pi-hole + Unbound. DNS for all Tailscale devices, then the home router (DHCP reservation + DHCP DNS). Devices named under `.home.arpa`. See [[13_DNS_Pihole_and_Unbound]].
*   **Fixed:** Tailscale masquerading hid client IPs (`--snat-subnet-routes=false`); router handed out itself as secondary DNS; desktop had static Google DNS.
*   **Updates:** 72 packages (systemd, containerd, NVIDIA container toolkit 1.20.2, libvirt/qemu) via a self-logging script, then a reboot test: all 9 containers, GPU passthrough, DNS, Tailscale and the playit tunnel came back unattended. Server timezone UTC -> Australia/Perth.
*   **Investigated:** a manual Crafty backup that "never appeared" was created fine and later rotated out by the 8-zip retention (manual backups count toward it). See [[11_Backup_Strategy]].
*   **Router:** firmware updated, admin password rotated, remote management and WPS off.

### 2026-11-13
*   **Hardware:** RAM upgraded 16GB -> 32GB (2x16GB DDR4-2666). memtester 12G: all ok; Memtest86+: 2 passes, 0 errors. See [[01_Hardware_and_Storage]].
*   **Verified:** First reboot since the CDI fix; GPU containers, VPN, Tailscale and all services came back unattended.

### 2026-11-12
*   **Security:** All service `.env` files replaced with sops + age encrypted secrets; plain-text copies (including 15 backup snapshots) shredded. See [[10_Host_Hardening]].
*   **New service:** qBittorrent behind gluetun (PureVPN, OpenVPN/TCP). Kill switch tested. See [[12_File_Sharing_qBittorrent_and_VPN]].
*   **Cleanup:** Mod undo backups deleted after a friend tested the mods. Host scripts moved to `~/homelab/scripts/`, logs to `~/homelab/logs/`, old compose files into per-app `archive/` folders. ~11GB of migration and update leftovers moved (checksum-verified) to a quarantine folder on the HDD, to be purged after two weeks.
*   **Security:** gitleaks pre-commit hook added to the docs repo. See [[10_Host_Hardening]].
*   **Fixed:** Jellyfin and Ollama failed to start after reboot (`failed to add device rules`). Root cause: `bpf_jit_harden = 2` breaks the NVIDIA toolkit's legacy GPU mode. Switched both to CDI mode; hardening unchanged. See [[03_Media_Server_Jellyfin]].
*   **Removed:** Retired the experimental HITL security agent script (approval step could be bypassed).
*   **Docs:** Added pages 03, 04, 07-11, roadmap, and this log. Docs now published from the homelab via a repo-scoped deploy key.

### 2026-11-03 to 2026-11-07
*   **Updated:** Minecraft modpack to Create Ultimate Selection 2 v13.1.0, plus extra mods (each with checksum and undo backup). See [[07_Minecraft_Game_Server]].
*   **Kernel:** 7.0.0-42 installed by unattended upgrades.

### 2026-10-30
*   **Hardening round 1 & 2:** ufw, fail2ban, SSH key-only, sysctl hardening, unused protocols blocked. Lynis 66 -> 71. See [[10_Host_Hardening]].
*   **Network:** All Docker ports bound to localhost; access via `tailscale serve` only. See [[09_Remote_Access_Tailscale_and_Tunnels]].
*   **Backups:** `storage-backup.sh` copying world backups to the HDD hourly. See [[11_Backup_Strategy]].
*   **CTF lab phase 1:** Isolated libvirt network built; isolation test 19/19 blocked.

### 2026-10-29
*   **Migrated:** Minecraft server from `itzg/minecraft-server` to Crafty Controller, with the playit.gg tunnel for public access.

### 2026-10-13
*   **Online:** Ubuntu Server installed, NVIDIA drivers and Container Toolkit, Jellyfin and the Ollama/Open WebUI stack deployed.
