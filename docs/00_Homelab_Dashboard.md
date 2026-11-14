#  Homelab Architecture & Documentation 

Welcome to the Homelab core documentation. 

This server utilizes a dual-hypervisor approach, balancing containerized infrastructure (Docker) with isolated virtual machines (KVM). 
##  Infrastructure & Hardware 
- [01 Hardware and Storage](01_Hardware_and_Storage.md) - Ryzen CPU, GTX 1080, NVMe & HDD mount configurations. 
- [02 Host OS and Virtualization](02_Host_OS_and_Virtualization.md) - Ubuntu Server config, NVIDIA Container Toolkit, Docker vs KVM setup. 
##  Services & AI Stack 
- [03 Media Server Jellyfin](03_Media_Server_Jellyfin.md) - Docker Compose, NVENC hardware transcoding, storage mapping.
- [04 Local LLM Stack](04_Local_LLM_Stack.md) - Ollama, Open WebUI, and `qwen3:8b` configurations. 
- [05 LLM Janitor](05_LLM_Janitor.md) - Local AI health agent: hourly checks, validated daily digest, config drift, log triage, and phone alerts via self-hosted ntfy.
- [07 Minecraft Game Server](07_Minecraft_Game_Server.md) - Crafty Controller, modpack management, schedules, and memory limits.
- [12 File Sharing qBittorrent and VPN](12_File_Sharing_qBittorrent_and_VPN.md) - qBittorrent behind a gluetun VPN kill switch, leak tests, and a command cheat sheet.
##  Networking & Remote Access 
- [08 Network Topology](08_Network_Topology.md) - Double NAT layout, addressing, and planned VLAN segmentation.
- [13 DNS Pihole and Unbound](13_DNS_Pihole_and_Unbound.md) - Pi-hole + Unbound recursive DNS for the tailnet and home LAN, DHCP setup, and troubleshooting.
- [09 Remote Access Tailscale and Tunnels](09_Remote_Access_Tailscale_and_Tunnels.md) - Tailscale mesh VPN, `tailscale serve`, and the playit.gg tunnel.
##  Security & Hardening 
- [10 Host Hardening](10_Host_Hardening.md) - SSH key-only auth, ufw, fail2ban, sysctl hardening, and Lynis audits.
##  Backups & Maintenance 
- [11 Backup Strategy](11_Backup_Strategy.md) - Crafty backups, NVMe to HDD copies, and retention policy.
- [05 LLM Janitor](05_LLM_Janitor.md) - Monitoring and alerting (see above).
- [Maintenance Log](Maintenance_Log.md) - Running notes on updates, bug fixes, and changes.
##  AI & Knowledge 
- [14 AI Second Brain Obsidian Vault](14_AI_Second_Brain_Obsidian_Vault.md) - Obsidian vault of linked notes as the AI assistant's long-term memory: structure, session workflow, verification.
##  Planning 
- [ROADMAP](ROADMAP.md) - What's being worked on now, next, and after the RAM upgrade.
