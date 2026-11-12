#  Homelab Architecture & Documentation 

Welcome to the Homelab core documentation. 

This server utilizes a dual-hypervisor approach, balancing containerized infrastructure (Docker) with isolated virtual machines (KVM). 
##  Infrastructure & Hardware 
- [[01_Hardware_and_Storage]] - Ryzen CPU, GTX 1080, NVMe & HDD mount configurations. 
- [[02_Host_OS_and_Virtualization]] - Ubuntu Server config, NVIDIA Container Toolkit, Docker vs KVM setup. 
##  Services & AI Stack 
- [[03_Media_Server_Jellyfin]] - Docker Compose, NVENC hardware transcoding, storage mapping.
- [[04_Local_LLM_Stack]] - Ollama, Open WebUI, and `qwen3:8b` configurations. 
- [[07_Minecraft_Game_Server]] - Crafty Controller, modpack management, schedules, and memory limits.
##  Networking & Remote Access 
- [[08_Network_Topology]] - Double NAT layout, addressing, and planned VLAN segmentation.
- [[09_Remote_Access_Tailscale_and_Tunnels]] - Tailscale mesh VPN, `tailscale serve`, and the playit.gg tunnel.
##  Security & Hardening 
- [[10_Host_Hardening]] - SSH key-only auth, ufw, fail2ban, sysctl hardening, and Lynis audits.
##  Backups & Maintenance 
- [[11_Backup_Strategy]] - Crafty backups, NVMe to HDD copies, and retention policy.
- [[Maintenance_Log]] - Running notes on updates, bug fixes, and changes.
##  Planning 
- [[ROADMAP]] - What's being worked on now, next, and after the RAM upgrade.
