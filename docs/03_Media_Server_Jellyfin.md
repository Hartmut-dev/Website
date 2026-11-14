## Media Server Overview
The homelab runs **Jellyfin**, a free and open-source media server, to stream movies and TV shows across the network. It runs as a Docker container and uses the GTX 1080's dedicated **NVENC/NVDEC** silicon for hardware transcoding, so the CPU stays free for other workloads.

*   **Image:** `jellyfin/jellyfin:latest`
*   **Config Location:** `~/docker/jellyfin/`
*   **Media Library:** `/mnt/storage/media` (2TB HDD)
*   **Web Interface:** Port `8096`

---

##  Storage Mapping
Jellyfin's data is split across both drives, following the storage strategy in [01 Hardware and Storage](01_Hardware_and_Storage.md):

### 1TB NVMe SSD (Fast / Metadata)
*   `./config` - Server settings, user accounts, and the library database.
*   `./cache` - Image cache and temporary transcode segments.

### 2TB HDD (Bulk / Media)
*   `/mnt/storage/media/movies` - Movie library.
*   `/mnt/storage/media/tvshows` - TV library.

Keeping the database and cache on the SSD keeps the interface responsive, while the large media files live on the cheaper bulk drive.

---

##  Docker Compose Configuration
The container is defined in `~/docker/jellyfin/docker-compose.yml`:

```yaml
services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    container_name: jellyfin
    network_mode: 'host'
    volumes:
      - ./config:/config
      - ./cache:/cache
      - /mnt/storage/media:/media
    restart: 'unless-stopped'
    devices:
      - nvidia.com/gpu=all   # CDI mode (legacy --gpus breaks with net.core.bpf_jit_harden=2)
```

**Key Settings:**
*   **`network_mode: host`** - Lets Jellyfin use the host's network stack directly, which makes local device discovery (DLNA / client auto-detect) work without extra port mappings.
*   **`devices: nvidia.com/gpu=all`** - Requests the GPU as a CDI device through the NVIDIA Container Toolkit (see Known Issues & Fixes below).
*   **`restart: unless-stopped`** - Brings the server back automatically after a reboot.

---

##  NVENC Hardware Transcoding
When a client can't play a file natively (unsupported codec, lower bandwidth, or a smaller screen), Jellyfin transcodes it on the fly. Doing this on the GPU instead of the CPU uses far less power and handles multiple streams at once.

**1. Start the Container:**
```bash
cd ~/docker/jellyfin
docker compose up -d
```

**2. Confirm the GPU is Visible Inside the Container:**
```bash
docker exec -it jellyfin nvidia-smi
```

**3. Enable Hardware Acceleration in Jellyfin:**
*   Dashboard -> Playback -> Transcoding
*   Hardware acceleration: **NVIDIA NVENC**
*   Enable hardware decoding for H.264, HEVC, and the other codecs the GTX 1080 (Pascal) supports.

**4. Verification:** Play a file that forces a transcode (e.g. lower the quality in the player), then on the host run:
```bash
nvidia-smi
```
(An `ffmpeg` process should appear in the process list, using the GPU.)

---

##  Known Issues & Fixes
*   **GPU containers failing to start (Nov 2026) - RESOLVED:** After the first reboot following host hardening, Jellyfin and Ollama exited with `nvidia-container-cli: mount error: failed to add device rules`.
    *   **Root cause:** The kernel hardening setting `net.core.bpf_jit_harden = 2` breaks the NVIDIA Container Toolkit's *legacy* mode, which builds an eBPF cgroup device filter for each GPU container. Confirmed by testing: the container started with the setting at `0` and failed at `2`.
    *   **Fix:** Switched to **CDI (Container Device Interface)** mode instead of weakening the hardening. The toolkit generates a device spec and Docker requests the GPU as a named device:
```bash
# Generate the CDI spec (auto-refreshed after driver updates by nvidia-cdi-refresh.path)
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml
nvidia-ctk cdi list
# Test
docker run --rm --device nvidia.com/gpu=all ubuntu nvidia-smi -L
```
    *   In Compose, the `deploy.resources.reservations.devices` block was replaced with `devices: - nvidia.com/gpu=all`.
