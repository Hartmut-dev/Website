##  Hardware Specifications
This homelab is built on a bare-metal architecture utilizing a mix of new and repurposed hardware to balance processing power, hardware acceleration, and storage capacity.

*   **CPU:** AMD Ryzen 5 5600 (6-core)
*   **GPU:** NVIDIA GeForce GTX 1080 (8GB VRAM) - *Used for NVENC media transcoding and local LLM acceleration.*
*   **Memory:** 32GB DDR4-2666 (2x16GB Crucial, CL19), upgraded Nov 2026 from 16GB (2x8GB). Board has 2 slots, so 32GB is the ceiling for this build.
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

---

##  RAM Upgrade & Validation (Nov 2026)
Secondhand 2x16GB Crucial DDR4-2666 UDIMMs replaced the original 2x8GB kit. Used RAM was validated before the old kit was sold:

**1. Quick in-OS check (no downtime):** tests only the memory that is free while Linux runs.
```bash
sudo apt install -y memtester
sudo memtester 12G 1        # all 18 tests: ok
```

**2. Full test (Memtest86+, runs instead of the OS):**
```bash
sudo apt install -y memtest86+   # adds a boot menu entry
sudo reboot                      # hold Shift (legacy BIOS boot) -> "Memory test (memtest86+x64.bin)"
```
**Result:** 2 full passes over all 32GB in about 1h15m, **0 errors**.

(Buying tips learned: check the full label for the part number, count the memory chips in photos, 8 per side for 16GB, and test before selling the old kit.)
