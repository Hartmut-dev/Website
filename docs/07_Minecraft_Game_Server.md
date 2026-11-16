## Game Server Overview
The homelab hosts a private, modded Minecraft server for a small group of friends. It is the first workload on the server that is reachable from the internet, so it doubles as a real-world exercise in exposing a service safely.

*   **Modpack:** Create Ultimate Selection 2 (NeoForge, Minecraft 1.21.1)
*   **Management:** Crafty Controller 4 (web panel)
*   **Config Location:** `~/minecraft-create/`
*   **Public Access:** playit.gg tunnel (see [09 Remote Access Tailscale and Tunnels](09_Remote_Access_Tailscale_and_Tunnels.md))
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
*   **Secrets** (tunnel key, API keys, RCON password) are stored encrypted with sops + age and decrypted only in memory at startup. See [10 Host Hardening](10_Host_Hardening.md).

---

##  Memory Management
Originally the host had 16GB of system RAM shared between Minecraft, Jellyfin, the LLM stack, and the host, which made memory the tightest resource:

*   **Java heap:** 8.5GB (set in Crafty), inside the 11GB container limit to leave room for Java's off-heap memory.
*   **On-demand running:** The server is stopped when nobody is playing, freeing ~11GB for other work.
*   **Done (Nov 2026):** RAM upgraded to 32GB, which removes most of the pressure.
*   **Done (Nov 2026): idle auto-stop.** See [Idle Auto-Stop](#idle-auto-stop) below.

---

##  Schedules
Configured in the Crafty panel (Perth time):

*   **Backups:** every 6 hours. See [11 Backup Strategy](11_Backup_Strategy.md). Crafty backs up a stopped server too.
*   **Restarts:** 12am and 12pm, with in-game warnings at 5 minutes and 1 minute. Since Nov 2026 these run from the idle script below, not from Crafty, because Crafty's restart action *starts* a stopped server.
*   **Chunk pre-generation (Chunky):** used to be paused and resumed around restarts; no longer scheduled.

---

##  Idle Auto-Stop
A small Python script (cron, every 5 minutes) talks to the **Crafty API** on localhost:

*   **check:** if the server is running with 0 players, an idle timer starts. After 20 minutes empty (and a final re-check), it sends Crafty's normal `stop_server` action and pushes a phone notification via ntfy. Starting again is one tap in the Crafty panel over Tailscale.
*   **restart (12am/12pm):** restarts only if the server is already running, so the schedule never wakes a stopped server. The 5- and 1-minute warnings are only sent when someone is online.
*   **Fail-safe:** any API error or odd state (starting, updating, crashed) means *do nothing*, so a bug leaves the server running rather than stopping it.
*   **Why the Crafty API, not RCON:** stopping the Java process behind Crafty's back looks like a crash, and Crafty's crash detection would restart it. Going through Crafty keeps its state, logs and audit trail correct.
*   **Least privilege:** the API key only has the *Commands* and *Schedule* permissions. Crafty only gives a limited key the servers its user holds through a **role**, and a superuser has none by default, so the user was added to a role with just those two permissions. The token lives in the stack's sops-encrypted secrets file and is injected per run with `sops exec-env`.

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
