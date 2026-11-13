# Homelab Roadmap

Focus: networking skills, with security built into each project.
Status: `[ ]` todo · `[~]` in progress · `[x]` done

## Now
- [~] **Docs pipeline:** GitHub deploy key on the homelab, Claude edits and pushes docs on request, secret scanning before every commit
- [ ] **Daily GitHub activity:** one real, small piece of work each day (log entry, script, doc, fix). No fake commit generators
- [ ] **Folder cleanup:** sort out backups and script folders, then put configs and scripts under git
- [ ] **Minecraft idle auto-stop:** check player count over RCON, stop after ~20 min empty, start on demand from Crafty

## Next (quick networking wins)
- [x] **Pi-hole + Unbound:** own recursive DNS on the tailnet and my home router (rest of the house later, maybe)
- [ ] **Monitoring:** Uptime Kuma, then Prometheus + Grafana (SNMP)
- [ ] **LLM janitor:** scripts collect health data, local model triages and alerts. No sudo, defended against prompt injection from logs. Commands come from a fixed allowlist, never chosen freely by the model
- [ ] **Threat-intel scout:** local LLM reads security feeds (ACSC, CVEs) and keeps only what affects this stack. Internet access only, no system data
- [ ] **Librarian:** "ask my docs" Q&A over this repo (Open WebUI knowledge base), read-only
- [ ] **Website hardening:** security headers, TLS check
- [x] **File sharing with friends:** qBittorrent behind a gluetun VPN kill switch (port forwarding still to solve)

## Local AI agents (after the janitor)
- [ ] **Model bake-off:** eval harness of homelab tasks with checkable answers; compare qwen3:8b vs deepseek-r1:8b (vs DeepSeek V4.1 via API for non-sensitive tasks) on accuracy, speed and VRAM, then assign models per job
- [ ] **Workhorse loop:** generate -> verify automatically (run tests in a no-network sandbox container) -> feed errors back -> repeat; first job: the Minecraft idle auto-stop script
- [ ] **Auditor ("spy"):** read-only agent watching inter-agent messages for prompt injection, out-of-role requests and anomalies; reports only
- [ ] **Engineer:** designs an open-frame rack on wheels for both towers (homelab + gaming desktop, upright on shelves, desktop lowest) plus a spare shelf and network gear on top: U layout, airflow gaps, widths/depths, desktop cable lengths, router Wi-Fi placement, power/UPS, shopping list; cross-checked by Claude

## When the Raspberry Pi arrives (~Dec 2026)
- [ ] **Wake-on-LAN:** Pi as always-on relay, so the phone can wake the desktop *and* the homelab from anywhere via Tailscale; BIOS "restore on AC power loss" on the homelab
- [ ] **Secondary Pi-hole:** second DNS server on the Pi, removing the homelab as a single point of failure for home DNS
- [ ] **Off-box monitoring:** Uptime Kuma on the Pi watches the homelab and alerts the phone when it's down (a monitor that doesn't die with the thing it monitors)
- [ ] **Backup tailnet access:** Pi as Tailscale subnet router / exit node, so the home network stays reachable if the homelab is off
- [ ] **More Pi ideas to explore:** UPS monitoring (NUT), PiKVM-style out-of-band console for the homelab, janitor heartbeat watchdog

## Unlocked by the RAM upgrade (32 GB installed 2026-11-13)
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
- [ ] **Dual-GPU inference (if the 3070 Ti is saved):** 1080 + 3070 Ti = 16GB VRAM for 14B models via Ollama layer split
- [ ] **Motherboard upgrade (if dual-GPU):** AM4 board with two full-length slots and proper spacing (keeps CPU + RAM); check case and PSU fit first

## Later / ideas
- [ ] **(Maybe) CCNA tutor:** local LLM quizzes from study notes; a script generates and checks subnetting maths
- [x] **Secrets management:** all .env files replaced with sops + age encrypted secrets (free; Proton Pass CLI needed a higher plan)
- [ ] Centralised logging or SIEM (Wazuh or Loki)
- [ ] Hand-built WireGuard tunnel
- [ ] Internal DNS zone and private CA for TLS
- [ ] Off-site backup copy, auditd, disable UPnP on both routers

## Fun / miscellaneous
- [ ] **Website aesthetic overhaul:** visual redesign once hardening is done
- [ ] **Minecraft helper bot:** `!ask` in game chat, answered by the local LLM from the modpack's wikis
