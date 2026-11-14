## Local LLM Stack Overview
The homelab hosts its own large language models, so prompts and data never leave the server. The stack has two parts:

*   **Ollama** - The model runtime. Downloads, loads, and serves models over a local API, using the GTX 1080 for inference.
*   **Open WebUI** - A browser-based chat interface (similar to ChatGPT) that talks to Ollama.

*   **Config Location:** `~/docker/ai-stack/`
*   **Current Model:** `qwen3:8b`
*   **Ollama API:** `127.0.0.1:11434` (localhost only)
*   **Open WebUI:** `127.0.0.1:3000` (localhost only, published to the tailnet)

---

##  Hardware Considerations
The GTX 1080 has **8GB of VRAM**, which sets the ceiling for model size:

*   An 8B-parameter model at 4-bit quantisation needs roughly 5-6GB, leaving room for the context window.
*   Models larger than about 9B start spilling into system RAM, which is much slower and competes with other services for system memory (32GB since Nov 2026, shared with the game server and media stack).
*   Model weights are stored on the NVMe SSD (`./ollama`) so they load quickly.

---

##  Docker Compose Configuration
Both services are defined in `~/docker/ai-stack/docker-compose.yml`:

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    restart: unless-stopped
    ports:
      - "127.0.0.1:11434:11434"
    volumes:
      - ./ollama:/root/.ollama
    devices:
      - nvidia.com/gpu=all   # CDI mode (legacy --gpus breaks with net.core.bpf_jit_harden=2)

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:8080"
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
    volumes:
      - ./open-webui:/app/backend/data
    depends_on:
      - ollama
```

**Key Settings:**
*   **`127.0.0.1:` port bindings** - Neither service listens on the LAN. Open WebUI is reached remotely through Tailscale (`tailscale serve`), and the Ollama API is only available to the host itself.
*   **`OLLAMA_BASE_URL=http://ollama:11434`** - Open WebUI reaches Ollama by container name over the internal Docker network.
*   **`devices: nvidia.com/gpu=all`** - GPU passed in CDI mode, same as Jellyfin (see [[03_Media_Server_Jellyfin]]).

---

##  Deployment & Model Setup
**1. Start the Stack:**
```bash
cd ~/docker/ai-stack
docker compose up -d
```

**2. Pull the Model:**
```bash
docker exec -it ollama ollama pull qwen3:8b
```

**3. Test from the Command Line:**
```bash
docker exec -it ollama ollama run qwen3:8b "Explain what a VLAN is in one sentence."
```

**4. Verification:** While the model is answering, check GPU usage on the host:
```bash
nvidia-smi
```
(The `ollama` process should be using several GB of VRAM.)

---

##  Use Cases
*   **General chat and research** through Open WebUI.
*   **Retired: HITL Security Agent** - An early experiment where the model ran Lynis audits and proposed fixes. Removed because the model itself decided which commands counted as "read-only", so it could bypass the approval step. Lessons carried into the planned janitor agent.
*   **Janitor agent (live, Nov 2026):** the model writes the daily health digest and labels unknown log lines, under a validator; it never decides severity or acts. Model jobs go through a queue that waits while Jellyfin uses the GPU. See [[05_LLM_Janitor]].

---

##  Known Issues & Fixes
*   **Ollama container failing to start (Nov 2026) - RESOLVED:** Caused by `bpf_jit_harden = 2` breaking the toolkit's legacy GPU mode. Fixed by switching to CDI mode. Full write-up in [[03_Media_Server_Jellyfin]].
