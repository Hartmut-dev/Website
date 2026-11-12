## Remote Access Overview
No ports are forwarded on the home routers. Instead, the homelab uses two outbound-connection tools, each with a distinct job:

*   **Tailscale** - Private, authenticated access for me and trusted devices (admin panels, SSH, chat UI, media).
*   **playit.gg** - Public access to exactly one service: the Minecraft game port.

---

##  Design Principle: Bind to Localhost, Publish Deliberately
Every Docker service binds to `127.0.0.1` only, so nothing is reachable from the LAN by accident:

```yaml
ports:
  - "127.0.0.1:8443:8443"
```

Each service is then published on purpose through one of the two tools below. This was verified from another machine on the LAN, which could no longer reach the services directly.

---

##  Tailscale (Private Access)
Tailscale builds a **WireGuard-based mesh VPN** (a "tailnet") between my devices. Every connection is encrypted and tied to a device identity, and it works through double NAT without any port forwarding.

**1. Install and Join the Tailnet:**
```bash
sudo snap install tailscale     # installed via snap on this host
sudo tailscale up
tailscale status
```

**2. Publish Localhost Services to the Tailnet:** `tailscale serve` forwards a port on the tailnet address to a service on `127.0.0.1`:
```bash
sudo tailscale serve --bg --tcp 8443 tcp://localhost:8443    # Crafty panel
sudo tailscale serve --bg --tcp 3000 tcp://localhost:3000    # Open WebUI
sudo tailscale serve --bg --tcp 25565 tcp://localhost:25565  # Minecraft (tailnet players)
```

**3. Verification:**
```bash
tailscale serve status
```

**Firewall integration:** `ufw` allows all traffic on the `tailscale0` interface plus UDP `41641` for direct peer-to-peer connections. `rp_filter` is set to loose mode (`2`), as Tailscale requires.

---

##  playit.gg (Public Game Access)
Friends without Tailscale connect through **playit.gg**. A small agent container opens an **outbound** tunnel to playit's edge servers; players connect to a public playit address, and the traffic is relayed back down the tunnel to `127.0.0.1:25565`.

*   Runs as the `playit-agent` container alongside Crafty (see [[07_Minecraft_Game_Server]]).
*   The agent's secret key is stored in `.env`, never in the Compose file or the docs.
*   **Only the game port is tunnelled.** The Crafty admin panel is never exposed through playit.

**Server-side protections for the public port:**
*   Whitelist enabled: only approved accounts can join.
*   `hide-online-players=true` so the server list ping doesn't leak usernames.

---

##  Access Matrix
| Service | LAN | Tailnet | Internet |
|---|---|---|---|
| SSH | Yes (key-only) | Yes | No |
| Crafty panel | No | Yes | No |
| Open WebUI | No | Yes | No |
| Minecraft | No | Yes | Yes (playit, whitelisted) |
