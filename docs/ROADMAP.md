# Homelab Roadmap

Focus: networking skills, with security built into each project.
Status: `[ ]` todo · `[~]` in progress · `[x]` done

## Now
- [~] **Docs pipeline:** GitHub deploy key on the homelab, Claude edits and pushes docs on request, secret scanning before every commit
- [ ] **Daily GitHub activity:** one real, small piece of work each day (log entry, script, doc, fix). No fake commit generators
- [ ] **Folder cleanup:** sort out backups and script folders, then put configs and scripts under git
- [ ] **Minecraft idle auto-stop:** check player count over RCON, stop after ~20 min empty, start on demand from Crafty

## Next (quick networking wins)
- [ ] **Pi-hole + Unbound:** own recursive DNS, tailnet first, then the whole house
- [ ] **Wake-on-LAN:** homelab wakes the desktop over LAN, reachable through Tailscale
- [ ] **Monitoring:** Uptime Kuma, then Prometheus + Grafana (SNMP)
- [ ] **LLM janitor:** scripts collect health data, local model triages and alerts. No sudo, defended against prompt injection from logs. Commands come from a fixed allowlist, never chosen freely by the model
- [ ] **Website hardening:** security headers, TLS check, then a visual overhaul
- [x] **File sharing with friends:** qBittorrent behind a gluetun VPN kill switch (port forwarding still to solve)

## After the RAM upgrade to 32 GB (end of Nov 2026)
- [ ] **Physical network gear:** secondhand managed switches (Cisco Catalyst 2960/3560 class), console access, VLANs/trunks/STP/EtherChannel on real hardware, a 2-4 port NIC for the homelab, hybrid physical + virtual labs
- [ ] **Network restructure:** managed switch, OPNsense/pfSense, VLANs (trusted / homelab / IoT / guest / CTF) with firewall rules between them
- [ ] **Containerlab routing labs:** OSPF and BGP (CCNA prep)
- [ ] **Enterprise network lab:** hypervisor setup with virtual routers, switches and firewalls (EVE-NG / GNS3 / Proxmox) to practise enterprise topologies
- [ ] **Odysseus trial:** compare with Open WebUI, keep email/calendar connectors off at first
- [ ] **Local LLM task queue:** blog drafts from changelogs, daily log summaries, Q&A over these docs

## Backseat
- [ ] **CTF lab phase 2:** Kali and target VMs on the homelab (phase 1 isolated network is built and tested)
- [ ] **Anonymity & routing lab:** proxychains, Tor and multi-hop from a Kali VM, with Wireshark at each hop to see what every observer can and can't see

## Side projects
- [ ] **RTX 3070 Ti repair:** research and troubleshoot the instability under 3D load (driver vs VRAM vs power vs thermals), decide if it's fixable

## Later / ideas
- [ ] **Secrets management:** server secrets (.env files) pulled from Proton Pass via pass-cli instead of plaintext files
- [ ] Centralised logging or SIEM (Wazuh or Loki)
- [ ] Hand-built WireGuard tunnel
- [ ] Internal DNS zone and private CA for TLS
- [ ] Off-site backup copy, auditd, disable UPnP on both routers
