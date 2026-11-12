#  Homelab Architecture & Documentation 

Welcome to the Homelab core documentation. 

This server utilizes a dual-hypervisor approach, balancing containerized infrastructure (Docker) with isolated virtual machines (KVM). 
##  Infrastructure & Hardware 
- [[01_Hardware_and_Storage]] Ryzen CPU, GTX 1080, NVMe & HDD mount configurations. 
- [[02_Host_OS_and_Virtualization]] - Ubuntu Server config, NVIDIA Container Toolkit, Docker vs KVM setup. 
##  Services & AI Stack 
- [[03_Media_Server_Jellyfin]] - Docker Compose, NVENC hardware transcoding, storage mapping.
- [[04_Local_LLM_Stack]] - Ollama, Open WebUI, and `qwen3:8b` configurations.  
##  Logs & Maintenance 
- [[Maintenance_Log]] - Running notes on updates, bug fixes, and changes.
