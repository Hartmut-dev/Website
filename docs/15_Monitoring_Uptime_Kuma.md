## Monitoring Overview: Uptime Kuma
**Uptime Kuma** is a self-hosted status dashboard: it probes every service on a schedule, keeps uptime history, and pushes an alert when something goes down. It complements the [05 LLM Janitor](05_LLM_Janitor.md): the janitor checks the host (disks, SMART, temperatures, containers, backups, VPN, drift) once an hour, while Kuma checks each service *the way a client would*, every 60 seconds.

---

##  Docker Compose Configuration
```yaml
services:
  uptime-kuma:
    image: louislam/uptime-kuma:2.5.10-slim-rootless
    container_name: uptime-kuma
    restart: unless-stopped
    network_mode: host            # reach services that are bound to 127.0.0.1 only
    user: "1000:1000"
    environment:
      TZ: "Australia/Perth"
      UPTIME_KUMA_HOST: "127.0.0.1"   # Kuma itself listens on localhost only
      UPTIME_KUMA_PORT: "3001"
    volumes:
      - ./data:/app/data
    deploy:
      resources:
        limits:
          memory: 384M
```

*   **Host network + localhost bind:** every service in the lab listens on `127.0.0.1` (see [09 Remote Access](09_Remote_Access_Tailscale_and_Tunnels.md)). A container on a Docker bridge network can't reach those, so Kuma shares the host's network, and binds its own UI to `127.0.0.1` so it isn't exposed on the LAN.
*   **Rootless image, pinned version:** runs as an unprivileged user; the version is pinned instead of `latest`.
*   **Tailnet only:** published with `tailscale serve --bg --tcp 3001 tcp://127.0.0.1:3001`.
*   **SQLite:** the database choice was pre-set in `data/db-config.json`, so the first visit only asks for an admin account.

---

##  Monitors
| Monitor | Check |
|---|---|
| Jellyfin, Open WebUI, ntfy, Syncthing | HTTP health endpoints |
| Ollama, qBittorrent web UI, Pi-hole web UI, Crafty panel | HTTP 200-399 (Crafty's self-signed cert ignored on localhost) |
| DNS: Pi-hole (LAN), Pi-hole (tailnet), Unbound (internal) | a real DNS lookup against each resolver |
| Website | HTTPS every 5 minutes, plus certificate-expiry warnings |

60-second interval, 2 retries before alerting. The Minecraft game port is deliberately **not** monitored: the server stops itself when idle ([07 Minecraft](07_Minecraft_Game_Server.md)), so "down" is normal there.

---

##  Alerts
Kuma pushes to the self-hosted **ntfy** server on the same topic as the janitor, so the phone has one place for alerts. It uses its **own** publish-only access token (labelled `uptime-kuma`), so it can be revoked without touching the janitor's.

---

##  Known Limit
Kuma runs on the box it watches: if the whole server goes down, nothing is left to send the alert. The fix is planned for the Raspberry Pi (~Dec 2026): an off-box Kuma that watches the homelab from outside. See [ROADMAP](ROADMAP.md).

---

##  Backups
`docker-compose.yml` and the `data/` folder (SQLite database incl. WAL) are part of the daily config snapshot. See [11 Backup Strategy](11_Backup_Strategy.md).
