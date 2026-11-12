## Backup Strategy Overview
Backups follow a simple rule: **one dead disk must never take out both the data and its backups.** World saves are created on the NVMe SSD and copied automatically to the separate 2TB HDD.

*   **Layer 1:** Crafty Controller backups on the NVMe (every 6 hours).
*   **Layer 2:** `storage-backup.sh` copies to the HDD (hourly cron).
*   **Planned Layer 3:** Off-site copy.

---

##  Layer 1: Crafty Scheduled Backups
*   **Schedule:** every 6 hours (Perth time).
*   **Retention:** newest 8 zips (~2 days).
*   **Location:** `~/minecraft-create/crafty/backups/` (NVMe).

---

##  Layer 2: Copy to the Storage Disk
**Script:** `~/homelab/scripts/storage-backup.sh`, run hourly from cron:
```bash
crontab -e
# Added:
20 * * * * ~/homelab/scripts/storage-backup.sh
```

**What it does:**
1.  **Safety check:** exits if `/mnt/storage` isn't mounted, so it never fills the root disk by mistake.
2.  **World copy:** copies the newest Crafty zip, skipping any file modified in the last 10 minutes (Crafty may still be writing it).
3.  **Config snapshot (daily):** compose files, the `.env` secrets, and Crafty's database and settings, as a `.tar.gz`.
4.  **Independent retention:** prunes on its own schedule, so a wiped Crafty folder doesn't wipe the copies too.

**Key Snippets:**
```bash
umask 077   # copies include secrets, so only the owner can read them

# Never write to the root disk if the storage disk isn't mounted
mountpoint -q /mnt/storage || { logger -t storage-backup "/mnt/storage not mounted, skipping"; exit 1; }

# Newest finished zip
latest=$(find "$SRC/crafty/backups" -name '*.zip' -mmin +10 -printf '%f\t%p\n' | sort | tail -1 | cut -f2)
```

**Retention on the HDD:**
| Data | Kept |
|---|---|
| World zips | Newest, plus the first of each day for 2 days |
| Config snapshots | 30 days |

---

##  Verification
```bash
ls -lh /mnt/storage/backups/minecraft/
tail /mnt/storage/backups/storage-backup.log
```
Scheduled backups and restarts were verified end to end in October 2026: zips produced at the scheduled times and copied to the HDD.

---

##  Restore Procedure
1.  Stop the server in the Crafty panel.
2.  Pick a zip from Crafty's backups (or from `/mnt/storage/backups/minecraft/` if the NVMe copy is gone).
3.  Restore through Crafty's backup page, or unzip over the server folder.
4.  Start the server and check the console log before letting players join.

---

##  Gaps & Next Steps
*   **No off-site copy yet.** A fire or theft would take both disks. Planned: an encrypted off-site copy.
*   **Restore drills.** Test a full restore periodically, because an untested backup is only a hope.
