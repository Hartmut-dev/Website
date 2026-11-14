## DNS Overview
The homelab is the DNS server for my devices. **Pi-hole** blocks ad, tracker, and malware domains for every device, including ones that can't run an ad blocker (smart TV, phone apps), and **Unbound** resolves names itself by walking the DNS hierarchy, so no single upstream provider sees every lookup.

*   **Config Location:** `~/docker/pihole/`
*   **Coverage:** every Tailscale device (anywhere) + every device on my home router (LAN)
*   **Blocklist:** StevenBlack unified hosts (~78,000 domains)
*   **Web UI:** port `8082`, localhost only, published to the tailnet

---

##  How It Works
```
device --"where is ads.tracker.com?"--> Pi-hole
                                          | on a blocklist? -> answers 0.0.0.0, ad never loads
                                          | normal domain?  -> asks Unbound
                                          v
                                       Unbound (recursive resolver)
                                          | root servers -> .com servers -> the domain's own server
                                          | validates DNSSEC signatures on the way
```

*   **DNS sinkhole:** blocked domains get a dead-end answer, so the request never leaves the device.
*   **Recursive resolution:** instead of forwarding to Google or Cloudflare, Unbound asks the authoritative servers directly. Trade-off: those queries aren't encrypted, so the ISP can still observe them.
*   **Visibility:** the query log shows every lookup per device. The smart TV made ~1,400 lookups in 15 minutes.

---

##  Docker Compose Configuration
```yaml
services:
  unbound:
    build: ./unbound                 # built from Alpine's official package, no third-party image
    image: homelab/unbound:local
    container_name: unbound
    restart: unless-stopped
    networks:
      dns:
        ipv4_address: 172.30.53.2    # internal only, no published ports

  pihole:
    image: pihole/pihole:latest
    container_name: pihole
    restart: unless-stopped
    depends_on:
      unbound:
        condition: service_healthy
    networks:
      dns:
        ipv4_address: 172.30.53.3
    ports:
      - "<tailnet-ip>:53:53/udp"     # DNS for Tailscale devices
      - "<tailnet-ip>:53:53/tcp"
      - "<lan-ip>:53:53/udp"         # DNS for the home LAN
      - "<lan-ip>:53:53/tcp"
      - "127.0.0.1:8082:80/tcp"      # web UI (tailscale serve)
    environment:
      TZ: "Australia/Perth"
      FTLCONF_webserver_api_password: ${PIHOLE_PASSWORD:?run via compose-secrets}   # sops-encrypted
      FTLCONF_dns_upstreams: "172.30.53.2#53"     # Unbound only
      FTLCONF_dns_listeningMode: "ALL"            # accept tailnet/LAN clients (ports are bound to specific IPs)
      FTLCONF_dns_dnssec: "false"                 # Unbound already validates
    volumes:
      - ./etc-pihole:/etc/pihole

networks:
  dns:
    ipam:
      config:
        - subnet: 172.30.53.0/24
```

**Why bind to specific IPs?** Port 53 on the host is already used by Ubuntu's DNS stub (`127.0.0.53`) and the libvirt VM network, so `0.0.0.0:53` would clash. Binding to specific addresses also controls exposure, because **Docker-published ports bypass ufw**: Docker's own forwarding rules handle the traffic before ufw sees it.

---

##  Unbound Configuration (Key Settings)
**`unbound/Dockerfile`:**
```dockerfile
FROM alpine:3.22
RUN apk add --no-cache unbound dnssec-root drill \
 && mkdir -p /var/lib/unbound \
 && cp /usr/share/dnssec-root/trusted-key.key /var/lib/unbound/root.key \
 && chown -R unbound:unbound /var/lib/unbound
COPY unbound.conf /etc/unbound/unbound.conf
HEALTHCHECK CMD drill @127.0.0.1 cloudflare.com >/dev/null || exit 1
CMD ["unbound", "-d", "-c", "/etc/unbound/unbound.conf"]
```

**`unbound/unbound.conf` (excerpt):**
```
server:
    access-control: 0.0.0.0/0 refuse
    access-control: 172.30.53.0/24 allow       # only Pi-hole's network
    auto-trust-anchor-file: "/var/lib/unbound/root.key"   # DNSSEC
    harden-dnssec-stripped: yes
    qname-minimisation: yes                    # each server only sees what it needs
    hide-identity: yes
    hide-version: yes
    private-address: 192.168.0.0/16            # DNS rebinding protection
    private-address: 10.0.0.0/8
    private-address: 172.16.0.0/12
    private-address: 100.64.0.0/10
    prefetch: yes
    serve-expired: yes
```

---

##  Host & Tailscale Setup (Root Steps)
```bash
# Let Docker bind the Tailscale IP at boot, before tailscaled has assigned it
echo "net.ipv4.ip_nonlocal_bind = 1" | sudo tee /etc/sysctl.d/91-nonlocal-bind.conf
sudo sysctl -p /etc/sysctl.d/91-nonlocal-bind.conf

# The server keeps its own resolver: it must never depend on its own Pi-hole container
sudo tailscale set --accept-dns=false

# ...and must also ignore the DNS server the home router hands out by DHCP (Troubleshooting #6).
# /etc/netplan/90-dns-not-pihole.yaml:
#   network:
#     version: 2
#     ethernets:
#       enp3s0:
#         dhcp4-overrides: {use-dns: false}
#         dhcp6-overrides: {use-dns: false}   # must match dhcp4, or netplan refuses the file
#         nameservers: {addresses: [9.9.9.9, 1.1.1.1]}
sudo netplan generate && sudo netplan apply

# Web UI on the tailnet
sudo tailscale serve --bg --tcp 8082 tcp://localhost:8082

# Stop Tailscale masquerading forwarded traffic (see Troubleshooting)
sudo tailscale set --snat-subnet-routes=false
```

**Tailscale admin console -> DNS:** add a global nameserver (the homelab's tailnet IP, *not* restricted to a domain), turn on **Override DNS servers**, keep **MagicDNS** on.

---

##  Rollout: Tailnet First, Then the Home Router
**Phase 1 - Tailnet:** only Tailscale devices use Pi-hole. Safe to test: if anything breaks, only my own devices are affected.

**Phase 2 - Home router** (my own router: desktop, phone, TV):
1.  **DHCP reservation** for the homelab, so its IP never changes (every device's DNS depends on it).
2.  **DHCP server settings:** Primary DNS **and** Secondary DNS = the homelab's LAN IP.
3.  Leave the router's own *Internet/WAN* DNS untouched, so the router itself still works if the homelab is down.
4.  Reconnect devices (`ipconfig /renew` on Windows) and watch them appear in the query log.

**Device names:** Local DNS records (A + automatic PTR) under the reserved home-network suffix **`.home.arpa`** (RFC 8375), e.g. `tv.home.arpa`. Every named device has a matching DHCP reservation so names and IPs stay aligned.

---

##  Verification Tests
```bash
dig +short @<pihole-ip> github.com          # resolves normally
dig +short @<pihole-ip> doubleclick.net     # 0.0.0.0 (blocked)
dig @<pihole-ip> dnssec-failed.org | grep status   # SERVFAIL: DNSSEC catches a tampered domain
dig +short -x <device-ip> @<pihole-ip>      # reverse lookup returns tv.home.arpa etc.
docker port unbound                         # nothing: Unbound is internal only
```
Pi-hole's log confirmed every lookup was `forwarded ... to 172.30.53.2` (Unbound), and IPv6 was checked: the router hands out no IPv6 DNS, so nothing bypasses Pi-hole that way.

---

##  Troubleshooting Log
1.  **Every tailnet client appeared as `172.30.53.1`** (the Docker gateway). Tailscale marks traffic arriving from the tailnet and masquerades it when it's forwarded, a rule meant for subnet routers. Docker's DNAT into the container counted as forwarding, so client IPs were rewritten. Fixed with `tailscale set --snat-subnet-routes=false`.
2.  **Router handed out itself as secondary DNS.** With the Secondary DNS field blank, the router filled in its own address, a silent bypass to the ISP's DNS whenever a device chose the secondary. Fixed by setting both entries to Pi-hole.
3.  **Desktop ignored the router's DNS.** It had Google DNS (`8.8.8.8`) set statically years ago, which overrides DHCP. Switched the adapter back to automatic.
4.  **Client names didn't appear after adding records.** Pi-hole caches client names from PTR lookups and refreshes them hourly; a container restart forces it.
5.  **No sites loaded with a commercial VPN on.** Two VPNs on one machine: the VPN app hijacked routing and DNS, so the Tailscale path to Pi-hole broke. Split tunnelling didn't help (the VPN's DNS leak protection forces its own DNS). Workaround: disconnect Tailscale while the VPN is in use; at home, the LAN path to Pi-hole still applies.
6.  **The server started using its own Pi-hole.** Phase 2 made the router's DHCP hand out Pi-hole, and the server's network config accepted DHCP DNS too, quietly breaking the "never depend on yourself" rule (`--accept-dns=false` only covers Tailscale). Found a day later by the janitor's log triage (384 resolver fallback messages a day, see [[05_LLM_Janitor]]). Fixed with the netplan override above. The first attempt failed because netplan requires the same `use-dns` value for DHCPv4 and DHCPv6, so the script now removes its file if `netplan generate` fails, keeping a bad file from breaking the next boot.

---

##  Router Hardening (Done Alongside)
*   Firmware updated.
*   Admin password replaced with a long random one, stored in a password manager.
*   Remote management confirmed **off**; WPS off.

---

##  Rollback
*   **Tailnet:** turn off *Override DNS servers* in the Tailscale console.
*   **LAN:** set the router's DHCP DNS back to automatic and reconnect devices.

---

##  Limitations
*   **Single point of failure:** if the homelab is down, DNS for my devices is down (the internet works, names don't). A second Pi-hole would fix this.
*   **Unencrypted upstream:** Unbound's queries to authoritative servers are visible to the ISP. Forwarding over DNS-over-TLS would hide them, at the cost of trusting that provider.
*   **Apps with hard-coded DNS** (some smart TVs, DNS-over-HTTPS in browsers) can bypass Pi-hole entirely.
