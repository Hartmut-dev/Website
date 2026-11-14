## Host Operating System 
The server runs a minimal, headless installation of **Ubuntu Server**. This provides a stable, low-overhead environment to manage hardware passthrough, networking, and our hypervisors. 

--- 
##  The Dual-Hypervisor Architecture 
Because the server handles three vastly different workloads, it relies on a strict hybrid virtualization strategy: 
* **Docker (Containerization):** Used for AI models (Ollama & Open WebUI) and Media streaming (Jellyfin). Containers are lightweight and allow seamless sharing of the GTX 1080 GPU via the NVIDIA Container Toolkit. 
* **KVM/QEMU (Type-1 Hypervisor):** Strictly reserved for hosting Capture The Flag (CTF) target machines. This provides hardware-level isolation and strict virtual networking to prevent intentionally vulnerable targets from moving laterally into the main home network.

--- 
* ## NVIDIA Proprietary Drivers 
* To utilize the GTX 1080 for hardware acceleration (NVENC transcoding and AI inference), the proprietary headless server drivers were installed on the bare metal. 

 **1. Installation:**
 ```bash
 # Check for detected GPUs and recommended drivers 
 ubuntu-drivers devices 
 # Install the stable server driver (e.g., version 535) 
 sudo apt install -y nvidia-driver-535-server
 ```

**2. Verification:** After rebooting, the drivers were verified using the standard NVIDIA interface:
 ```bash
 nvidia-smi
 ```
(This displays the driver version, CUDA support, VRAM usage, and GPU temperature).

---
# Docker & NVIDIA Container Toolkit
Docker cannot see or use the physical GPU by default. The NVIDIA Container Toolkit acts as a bridge, injecting the GPU runtime into the Docker daemon.

**1. Install Docker Engine & Compose:**
 ```bash
 sudo apt install -y docker.io docker-compose-v2 
 # Add the current user to the Docker group to avoid typing 'sudo' for every command 
 sudo usermod -aG docker
 ```
(Note: Log out and log back in for the group changes to take effect).

2. Add the NVIDIA Toolkit Repository:
 ```bash
 # Download the GPG key 
 curl -fsSL [https://nvidia.github.io/libnvidia-container/gpgkey](https://nvidia.github.io/libnvidia-container/gpgkey) | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg 
 # Add the repository to APT sources 
 curl -s -L [https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list](https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list) | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list 
 sudo apt update
 ```
3. Install & Configure the Toolkit:
 ```bash
 # Install the toolkit 
 sudo apt install -y nvidia-container-toolkit 
 # Inject the runtime into Docker 
 sudo nvidia-ctk runtime configure --runtime=docker 
 # Restart the Docker daemon to apply the new runtime 
 sudo systemctl restart docker
 ```
 **4. Final Verification:** To confirm Docker can successfully communicate with the GTX 1080
 ```bash
 docker run --rm --gpus all ubuntu nvidia-smi
 ```
 (If successful, this will print the same NVIDIA status table from inside an isolated container).

 **5. Update (Nov 2026) - CDI Mode:** The host's kernel hardening (`bpf_jit_harden = 2`) breaks the legacy `--gpus` method above. GPU containers now use CDI mode instead:
 ```bash
 sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml
 docker run --rm --device nvidia.com/gpu=all ubuntu nvidia-smi
 ```
 (Full write-up in [[03_Media_Server_Jellyfin]].)

---

# Updates & Maintenance
* **Process:** updates go through a reviewed script that writes its own log (piping `apt` through `tee` once left it stopped mid-run), runs non-interactively and keeps locally edited config files (`--force-confold`; new package defaults land as `.dpkg-dist` for review).
* **Reboot test after every significant change.** Hardening and driver changes can break things silently until the next boot, so a deliberate reboot follows, then every container, GPU access, DNS, Tailscale and the game tunnel are checked.
* **Nov 2026:** 72 packages (systemd, containerd, NVIDIA Container Toolkit 1.20.1 -> 1.20.2, libvirt/qemu); reboot test passed, GPU still visible in both GPU containers via CDI.
* **Timezone:** the server clock moved from UTC to local time (`Australia/Perth`, UTC+8) in Nov 2026; the hardware clock stays UTC. Lesson: timestamps written without an offset break on such a change, so logs now include it (see [[05_LLM_Janitor]]).
* Pending updates and reboot requirements are watched by the janitor's hourly checks.
