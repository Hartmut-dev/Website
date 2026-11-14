## Network Overview
The homelab currently sits on a flat home network behind **double NAT**. This page documents the current layout and the planned move to a segmented, VLAN-based design. (Specific addresses are intentionally left out of the public docs.)

---

##  Current Physical Layout
```
 Internet
    |
 NBN connection
    |
 ISP router (NAT #1)
    |
 Home router (NAT #2) ---- household devices (Wi-Fi / Ethernet)
    |
 Powerline adapters
    |
 Homelab server (1x Realtek gigabit NIC)
```

**Double NAT** means traffic leaves the house through two routers, each translating addresses. Consequences:

*   **Port forwarding would need to be configured on both routers**, and is fragile. It is not used at all.
*   **Inbound connections from the internet don't reach the server by default**, which is a security benefit.
*   Services that must be public use an **outbound tunnel** instead (see [09 Remote Access Tailscale and Tunnels](09_Remote_Access_Tailscale_and_Tunnels.md)).
*   The **powerline link** adds latency and caps throughput compared to a direct Ethernet run.

---

##  Logical Networks on the Host
The server runs several virtual networks of its own:

| Network | Type | Purpose |
|---|---|---|
| LAN (`enp3s0`) | Physical | Home network; SSH fallback only |
| `tailscale0` | WireGuard mesh VPN | All admin access and private services |
| Docker bridges | Container networks | Isolated per Compose stack; services bound to `127.0.0.1` |
| `virbr0` | libvirt NAT | General-purpose VMs |
| `virbr-ctf` | libvirt isolated (`10.66.0.0/24`) | CTF targets: **no forwarding**, cannot reach the host, LAN, or internet |

The CTF network's isolation is checked by a test VM that tries to reach the host, LAN, router, tailnet, and internet. All 19 checks were blocked.

---

##  Firewall Policy (Summary)
The host firewall (`ufw`) defaults to **deny inbound**, with a short allow-list:

*   Anything arriving over `tailscale0` (the private tailnet).
*   Tailscale's direct-connection UDP port (`41641`).
*   SSH from the home LAN subnet only.
*   DNS and DHCP for the libvirt VM network.

**DNS:** every LAN and tailnet device uses Pi-hole, except the server itself, which uses public resolvers directly so it never depends on its own container. Tailnet devices fall back to Quad9 if they can't reach Pi-hole (see [13 DNS Pihole and Unbound](13_DNS_Pihole_and_Unbound.md)).

Full details in [10 Host Hardening](10_Host_Hardening.md).

---

##  Planned: Segmented Network
The next major networking project is to replace the flat layout with VLANs behind a dedicated firewall:

*   **Firewall/router:** OPNsense or pfSense.
*   **Switching:** Secondhand managed switches (Cisco Catalyst class) for VLAN trunks, spanning tree, and link aggregation.
*   **Homelab NIC:** A multi-port Intel network card to carry tagged VLAN trunks.

| VLAN | Purpose |
|---|---|
| Trusted | Personal PCs and phones |
| Homelab | Servers and services |
| IoT | Smart devices, internet-only |
| Guest | Visitor Wi-Fi, internet-only |
| CTF | Vulnerable lab machines, fully isolated |

Traffic between VLANs will be denied by default and opened per service. See [ROADMAP](ROADMAP.md).
