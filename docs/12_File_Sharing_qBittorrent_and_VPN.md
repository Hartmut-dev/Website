## File Sharing Overview
The homelab runs **qBittorrent** for sharing large files with friends. All torrent traffic is forced through a commercial VPN by a **gluetun** container with a built-in kill switch, so peers and trackers never see the home IP address.

*   **Config Location:** `~/docker/qbittorrent/`
*   **Downloads:** `/mnt/storage/media/downloads` (2TB HDD), in-progress files in `downloads/incomplete/`
*   **Web UI:** port `8081`, localhost only, published to the tailnet
*   **VPN:** PureVPN, OpenVPN over TCP, Perth servers

---

##  Architecture
```
                 +------------- gluetun container --------------+
 qBittorrent --> | shares gluetun's network stack                |
 (no network     |  |- OpenVPN tunnel (tun0) --> VPN server --> internet
  of its own)    |  |- iptables: OUTPUT policy DROP = kill switch |
                 |  +- DNS resolver, upstream over the tunnel    |
                 +-----------------------------------------------+
```

*   **`network_mode: service:gluetun`** - qBittorrent has no network interface of its own. Its only path out is through gluetun.
*   **Kill switch** - gluetun's firewall drops all outbound traffic except loopback, established connections, the VPN server itself, and the `tun0` tunnel. If the tunnel drops, nothing matches, and traffic stops.
*   **Second layer** - qBittorrent is also bound to the `tun0` interface in its own settings.
*   **Startup order** - qBittorrent only starts once gluetun reports *healthy*.
*   **Control server locked down (Nov 2026)** - gluetun's HTTP control server (port 8000) is only reachable inside the shared network namespace, which includes qBittorrent. Every route now needs an API key (`HTTP_CONTROL_SERVER_AUTH_DEFAULT_ROLE`, key from the sops secrets file), so a compromised torrent client can't query or change the VPN. Requests without the key get `401`. The janitor's VPN leak check runs `wget` *inside* gluetun with the key expanded there, so the janitor never holds it. This also removes a deprecation warning: unauthenticated routes stop working in a future gluetun release.

---

##  Docker Compose Configuration
```yaml
services:
  gluetun:
    image: qmcgaw/gluetun:v3
    container_name: gluetun
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
    devices:
      - /dev/net/tun:/dev/net/tun
    volumes:
      - ./gluetun:/gluetun         # keeps the updated VPN server list
    environment:
      OPENVPN_USER: ${OPENVPN_USER:?run via compose-secrets}      # decrypted from secrets.enc.env
      OPENVPN_PASSWORD: ${OPENVPN_PASSWORD:?run via compose-secrets}
      VPN_SERVICE_PROVIDER: purevpn
      VPN_TYPE: openvpn
      OPENVPN_PROTOCOL: tcp
      SERVER_COUNTRIES: Australia
      SERVER_CITIES: Perth
      TZ: "Australia/Perth"
    ports:
      - "127.0.0.1:8081:8081"      # qBittorrent web UI (published on gluetun)
    deploy:
      resources:
        limits:
          memory: 256M

  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    container_name: qbittorrent
    restart: unless-stopped
    network_mode: "service:gluetun"
    depends_on:
      gluetun:
        condition: service_healthy
    environment:
      PUID: "1000"
      PGID: "1000"
      TZ: "Australia/Perth"
      WEBUI_PORT: "8081"
    volumes:
      - ./config:/config
      - /mnt/storage/media/downloads:/downloads
    deploy:
      resources:
        limits:
          memory: 1G
```

**Secrets:** stored in `secrets.enc.env`, encrypted with sops + age, and decrypted in memory at startup (see [10 Host Hardening](10_Host_Hardening.md)):
```bash
~/homelab/scripts/compose-secrets ~/docker/qbittorrent up -d
```
(Originally a plain `.env` with values in single quotes; see Troubleshooting.)

---

##  Hardened qBittorrent Settings
| Setting | Value | Why |
|---|---|---|
| Network interface | `tun0` | Second layer of leak protection |
| UPnP / NAT-PMP | Off | Never let an app open router ports by itself |
| Listening port | Fixed `6881` | Predictable, ready for future port forwarding |
| Web UI brute force | Ban for 1h after 5 failures | Slows password guessing |
| CSRF / clickjacking protection | On | Web UI hardening |
| Temp path | `/downloads/incomplete` | Partial files stay out of the Jellyfin libraries |

---

##  Verification Tests
**1. Public IP (should be the VPN's, not the ISP's):**
```bash
curl -s https://ipinfo.io/org                         # host: home ISP
docker exec qbittorrent curl -s https://ipinfo.io/org # qbittorrent: VPN provider
```

**2. DNS (should point at gluetun's resolver):**
```bash
docker exec qbittorrent cat /etc/resolv.conf          # nameserver 127.0.0.1
```

**3. Kill Switch (kill the tunnel, traffic must stop):**
```bash
docker exec gluetun ps -o pid,comm | grep openvpn     # find the PID
docker exec gluetun kill <pid>
docker exec qbittorrent curl -s --max-time 6 https://ipinfo.io/ip || echo BLOCKED
docker exec qbittorrent curl -s --max-time 6 http://1.1.1.1      || echo BLOCKED
```
Both requests were **BLOCKED**, and gluetun reconnected automatically within seconds.

**4. Firewall Rules:**
```bash
docker exec gluetun iptables -S OUTPUT
# -P OUTPUT DROP
# -A OUTPUT -o lo -j ACCEPT
# -A OUTPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
# -A OUTPUT -d <vpn-server>/32 -o eth0 -p tcp --dport 80 -j ACCEPT
# -A OUTPUT -o tun0 -j ACCEPT
```

---

##  Troubleshooting Log
Four separate problems were found and fixed during setup:

1.  **`Connection refused` / TLS handshake failures** - gluetun's built-in PureVPN server list was out of date. Fixed by running gluetun's updater (command in the cheat sheet), which also found Perth servers.
2.  **UDP on port 53 never completed a handshake** - something on the home network intercepts or blocks UDP/53 (the DNS port). Switched to `OPENVPN_PROTOCOL: tcp`.
3.  **`AUTH_FAILED` (1)** - used the provider's *website login*. OpenVPN needs the separate *VPN credentials* from the provider's manual-configuration page.
4.  **`AUTH_FAILED` (2)** - the password contained a `$`. Docker Compose interpolates `$VAR` inside `env_file`, so a 12-character password reached the container as 2 characters. Found by comparing the value's *length* in the file and inside the container (never printing it). Fixed by wrapping values in single quotes.

```bash
# Compare lengths without revealing the secret
docker inspect gluetun --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | awk -F= '/^OPENVPN_PASSWORD=/{print length(substr($0,index($0,"=")+1))}'
```

---

##  Cheat Sheet
### Web UI
*   Open `http://<homelab-tailnet-name>:8081`. Default user is `admin`; the temporary password is in the logs until a permanent one is set (**Tools -> Options -> Web UI**).
*   **Add:** link icon = magnet link, file icon = `.torrent` file.
*   **Share a file:** **Tools -> Torrent Creator**, tick *Start seeding immediately*, then right-click -> Copy -> Magnet link. (The file must be inside `/downloads`.)
*   **Peers tab** shows who you're connected to; they see the VPN's IP.

### Container Management
```bash
cd ~/docker/qbittorrent
docker ps --filter name=gluetun --filter name=qbittorrent   # gluetun should be (healthy)
~/homelab/scripts/compose-secrets ~/docker/qbittorrent up -d   # start / recreate (decrypts secrets)
docker compose stop                                          # stop torrenting
docker compose restart                                       # restart both
docker logs --tail 20 gluetun                                # VPN status
docker logs qbittorrent 2>&1 | grep password                 # temporary web UI password
```

### Quick VPN Check
```bash
docker exec qbittorrent curl -s https://ipinfo.io/org
```
(Should name the VPN provider's network. If it shows the home ISP, run `docker compose stop` immediately.)

### Files
```bash
ls -lh /mnt/storage/media/downloads              # finished
ls -lh /mnt/storage/media/downloads/incomplete   # in progress
mv "/mnt/storage/media/downloads/<name>" /mnt/storage/media/movies/   # hand to Jellyfin
df -h /mnt/storage                               # free space
```

### Maintenance
```bash
# Refresh the VPN server list (when connections start failing)
docker compose stop
docker run --rm -v ~/docker/qbittorrent/gluetun:/gluetun qmcgaw/gluetun:v3 update -enduser -providers purevpn
~/homelab/scripts/compose-secrets ~/docker/qbittorrent up -d

# Update images
docker compose pull && ~/homelab/scripts/compose-secrets ~/docker/qbittorrent up -d
```

---

##  Media Auto-Sort
Finished downloads are sorted into the Jellyfin library by a small host-side script (cron, every 10 minutes), without touching qBittorrent:

*   **How it knows a torrent is finished:** qBittorrent downloads into `incomplete/` and moves a torrent up to `downloads/` only when it's complete, as an atomic rename on the same disk. So every top-level entry in `downloads/` is finished, and no API or qBittorrent hook is needed.
*   **Hard links, not copies or moves:** each file is linked into `tvshows/<Show> (<Year>)/Season <N>/` or `movies/<Title> (<Year>)/`. qBittorrent keeps seeding the original name, the library gets a clean one, and no extra disk space is used. Jellyfin's real-time library monitor picks the new files up.
*   **Why not a qBittorrent "run on finish" hook:** that would run inside the most exposed container and need write access to the whole media library. The host-side script keeps the torrent client's access unchanged.
*   **Torrent names are untrusted input:** a strict parser (episode markers like `S01E02`/`1x02`, the last plausible year before release tags such as `1080p`), no shell, only `os.link` (never overwrites, moves or deletes), sanitised names, every destination checked to stay inside the library, symlinks and non-media files ignored, samples skipped. Tested with path-escape names, a symlink to `/etc/passwd`, and titles containing numbers ("Blade Runner 2049 (2017)", "1917 (2019)").
*   **When unsure, do nothing:** multi-file releases without episode numbers, movies without a year, or mixed content are left alone, with a "needs manual sort" push via ntfy. A local-LLM "Librarian" that *proposes* a folder for approval is on the [ROADMAP](ROADMAP.md).

---

##  Limitations & Privacy Notes
*   **Not connectable:** Double NAT plus no VPN port forwarding means peers can't connect *in*. Transfers work when the other side is connectable. Fix options: the VPN provider's port-forwarding add-on, or forwarding through both home routers.
*   **A VPN moves trust, it doesn't remove it.** The provider can see what the ISP used to. It hides the IP from swarms; it is not anonymity.
*   **Public torrents** expose the swarm's IPs to anyone watching and are a common malware vector. Treat downloads as untrusted.
