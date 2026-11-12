## Game Server Overview
The homelab hosts a private, modded Minecraft server for a small group of friends. It is the first workload on the server that is reachable from the internet, so it doubles as a real-world exercise in exposing a service safely.

*   **Modpack:** Create Ultimate Selection 2 (NeoForge, Minecraft 1.21.1)
*   **Management:** Crafty Controller 4 (web panel)
*   **Config Location:** `~/minecraft-create/`
*   **Public Access:** playit.gg tunnel (see [[09_Remote_Access_Tailscale_and_Tunnels]])
*   **Admin Access:** Crafty panel over Tailscale only

---

##  Why Crafty Controller
The server originally ran on the popular `itzg/minecraft-server` Docker image, configured entirely through environment variables. It was migrated to **Crafty Controller** to get:

*   A web panel for starting, stopping, and watching the console without SSH.
*   **Role-based accounts:** a superuser account for me and a limited "Server helper" role for a friend, who can start/stop the server and run commands but not change the host.
*   Built-in **schedules** for backups and restarts.

---

##  Docker Compose Configuration
Defined in `~/minecraft-create/docker-compose.yml`, with two services:

```yaml
services:
  crafty:
    image: registry.gitlab.com/crafty-controller/crafty-4:latest@sha256:<pinned digest>
    container_name: crafty
    restart: unless-stopped
    environment:
      TZ: "Australia/Perth"
    ports:
      - "127.0.0.1:8443:8443"     # panel (HTTPS)
      - "127.0.0.1:25565:25565"   # game port
    volumes:
      - ./crafty/backups:/crafty/backups
      - ./crafty/logs:/crafty/logs
      - ./crafty/servers:/crafty/servers
      - ./crafty/config:/crafty/app/config
      - ./crafty/import:/crafty/import
    deploy:
      resources:
        limits:
          memory: 11G

  playit:
    image: ghcr.io/playit-cloud/playit-agent:1.0
    container_name: playit-agent
    network_mode: host
    restart: unless-stopped
    volumes:
      - ./playit-data:/etc/playit
    depends_on:
      - crafty
```

**Key Settings:**
*   **Pinned image digest** - The Crafty image is pinned to a specific `sha256` so an upstream update can't change the server without me choosing to update.
*   **`127.0.0.1:` port bindings** - Neither the panel nor the game port is reachable from the LAN directly. Access goes through Tailscale or the playit tunnel only.
*   **`memory: 11G` limit** - Caps the container so a runaway server can't starve the rest of the host.
*   **`TZ: Australia/Perth`** - Makes Crafty's schedules run on local time.
*   **Secrets** (tunnel key, API keys, RCON password) live in a `.env` file that is never committed.

---

##  Memory Management
With 16GB of system RAM shared between Minecraft, Jellyfin, the LLM stack, and the host, memory is the tightest resource:

*   **Java heap:** 8.5GB (set in Crafty), inside the 11GB container limit to leave room for Java's off-heap memory.
*   **On-demand running:** The server is stopped when nobody is playing, freeing ~11GB for other work.
*   **Planned:** An RCON script that checks the player count and stops the server after ~20 minutes empty. See [[ROADMAP]].
*   **Planned:** RAM upgrade to 32GB, which removes most of the pressure.

---

##  Schedules
Configured in the Crafty panel (Perth time):

*   **Backups:** every 6 hours. See [[11_Backup_Strategy]].
*   **Restarts:** 12am and 12pm, with in-game warnings at 5 minutes and 1 minute.
*   **Chunk pre-generation (Chunky):** paused before each restart and resumed after, so restarts don't interrupt a half-written chunk.

---

##  Modpack Management
Mods added on top of the stock pack are tracked in a `MOD-CHANGES.md` file next to the server, recording for each mod:

*   Source URL and **SHA-256 checksum** of the jar (downloaded only from Modrinth/CurseForge).
*   Required dependencies and known compatibility risks.
*   An **undo backup** taken before installing, and the rollback steps.

**Pack Update Process:**
1.  Take a full backup of the server folder.
2.  Download the new server pack and stage it in a separate folder.
3.  Merge configs, keeping local changes, but take quest files wholesale from the new pack (merging them caused duplicate quest IDs).
4.  Re-add custom mods, then start the server and check the logs before letting players on.
