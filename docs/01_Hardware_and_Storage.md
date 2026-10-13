##  Hardware Specifications
This homelab is built on a bare-metal architecture utilizing a mix of new and repurposed hardware to balance processing power, hardware acceleration, and storage capacity.

*   **CPU:** AMD Ryzen 5 5600 (6-core)
*   **GPU:** NVIDIA GeForce GTX 1080 (8GB VRAM) - *Used for NVENC media transcoding and local LLM acceleration.*
*   **Memory:** 16GB RAM (2x8GB)
*   **Boot Drive:** 1TB NVMe SSD
*   **Bulk Storage:** 2TB HDD

---

##  Storage Allocation Strategy
To optimize performance and ensure the server doesn't get bogged down, the storage is split strictly by workload:

### 1TB NVMe SSD (High-Speed / OS)
*   Host Operating System (Ubuntu Server).
*   Docker container runtimes and configurations.
*   Active AI model caches (Ollama weights).
*   KVM virtual machine disks for CTF targets.

### 2TB HDD (Bulk / Media)
*   Media libraries (Movies, TV Shows) for Jellyfin.
*   Archival downloads and backups.
*   Mounted persistently to `/mnt/storage`.

---

##  Storage Configuration & Mounting
The 2TB HDD is formatted to `ext4` and permanently mounted to the system via `/etc/fstab` to ensure it automatically connects on reboot.

**1. Formatting the Drive:**
```bash
# Locate the drive identifier (e.g., /dev/sda or /dev/sdb)
lsblk

# Format the target drive to ext4
sudo mkfs.ext4 -F /dev/sdX

```

**2. Creating the Mount Point & Permissions:**
```bash
# Create the directory 
sudo mkdir -p /mnt/storage 
# Grant user ownership to the directory 
sudo chown -R $USER:$USER /mnt/storage
```

**3. Persistent Mount (/etc/fstab):** To ensure the drive mounts on boot, the UUID was extracted and added to the filesystem table.
```bash
# Retrieve the drive's UUID
sudo blkid /dev/sdX
# Edit the fstab file
sudo nano /etc/fstab

#Added the following line to the bottom of `/etc/fstab`:
UUID=<your-uuid-here> /mnt/storage ext4 defaults 0 2
```

**4. Final Verification:
```bash
sudo mount -a df -h /mnt/storage
```
