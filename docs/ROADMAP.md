# Homelab Roadmap

Focus: networking skills, with security built into each project.
Status: `[ ]` todo · `[~]` in progress · `[x]` done

## Now
- [x] **Docs pipeline:** GitHub deploy key on the homelab, Claude edits and pushes docs on request, secret scanning before every commit
- [ ] **Daily GitHub activity:** one real, small piece of work each day (log entry, script, doc, fix). No fake commit generators
- [x] **Folder cleanup:** scripts/logs/archive layout, leftovers quarantined (configs under git -> see Infrastructure as Code)
- [ ] **Minecraft idle auto-stop:** check player count over RCON, stop after ~20 min empty, start on demand from Crafty

## Next (quick networking wins)
- [x] **Pi-hole + Unbound:** own recursive DNS on the tailnet and my home router (rest of the house later, maybe)
- [ ] **Monitoring:** Uptime Kuma, then Prometheus + Grafana (SNMP)
- [x] **LLM janitor:** scripts collect health data, local model words and triages, alerts go to my phone. No sudo, defended against prompt injection from logs; the model never decides severity or acts. *Done 2026-11-14, all 7 steps: hourly checks, validated daily digest, ntfy alerts, config drift, log triage, GPU job queue, graded fault-injection suite (25/25). See [[05_LLM_Janitor]]*
- [ ] **Threat-intel scout:** local LLM reads security feeds (ACSC, CVEs) and keeps only what affects this stack. Internet access only, no system data
- [ ] **Librarian:** "ask my docs" Q&A over this repo (Open WebUI knowledge base), read-only; also the media auto-sort fallback: when the name parser isn't confident, proposes show/movie + folder for my approval (torrent names treated as untrusted input; proposes only, never moves files itself)
- [ ] **Website hardening:** security headers, TLS check
- [ ] **GitHub Action secret scan:** gitleaks on every push, covering edits made on github.com
- [ ] **Self-hosted Obsidian sync + backup:** Self-hosted LiveSync plugin + CouchDB on the homelab over Tailscale (works on iPhone, end-to-end encrypted), replacing the paid Obsidian Sync; vault versioned and included in backups (the AI vault is already versioned, backed up and Syncthing-synced; this item is for the personal vault)
- [ ] **Media auto-sort:** qBittorrent finished-hook + categories (tv/movies); guessit name parsing; hard links into tvshows/ or movies/ (folders created as needed), unsure -> unsorted/; Jellyfin rescan via API. Torrent names treated as untrusted input (no shell, no ../ paths)
- [x] **File sharing with friends:** qBittorrent behind a gluetun VPN kill switch (port forwarding still to solve)

## Networking projects (committed)
- [ ] **Remove the double NAT:** ISP modem into bridge mode so my router holds the public IP; may fix "not connectable" for torrents
- [ ] **Packet capture series:** Wireshark write-ups of my own services: DNS recursion hop by hop, Tailscale/WireGuard handshake, VPN tunnel, Minecraft protocol
- [ ] **ISP quality monitoring:** SmokePing graphs of NBN latency and packet loss, 24/7
- [ ] **Traffic flow analysis:** ntopng, per-device and per-country traffic, paired with Pi-hole's DNS view
- [ ] **IPv6 lab:** dual-stack the network, SLAAC vs DHCPv6, ICMPv6, IPv6-aware Pi-hole and firewall rules
- [ ] **Network automation (after the switches):** Ansible/Netmiko switch config, automatic config backups to git (Oxidized)
- [ ] **802.1X (after the switches):** port authentication with FreeRADIUS

## Security projects (in priority order)
- [ ] **HTTPS everywhere:** Caddy reverse proxy with Tailscale certs or a private CA, replacing plain http://host:port
- [ ] **Single sign-on + MFA:** Authentik in front of the web UIs (identity & access management)
- [ ] **Weekly vulnerability scans:** Greenbone/OpenVAS + nmap baseline diffs, fed to the janitor ("new open port since last week")
- [ ] **Pentest my own server:** after the hardening above, attack the homelab from a Kali VM, report findings like a real engagement, fix and re-test
- [ ] **Honeypot + purple team:** isolated Cowrie SSH honeypot feeding the SIEM; attack the lab, detect it, write an incident report
- [ ] **Infrastructure as Code:** Ansible playbooks that rebuild the homelab config, kept in a private git repo

## Career & portfolio
- [ ] **Projects page:** short case studies (problem -> what I did -> result) linking to the blog and docs
- [ ] **Architecture diagram:** one clear diagram of the whole lab (network, services, trust boundaries) on the site
- [ ] **Certification map:** tag roadmap items with the CCNA / Security+ objectives they cover

## Local AI agents (after the janitor)
- [ ] **Model bake-off:** eval harness of homelab tasks with checkable answers; compare qwen3:8b vs deepseek-r1:8b (vs DeepSeek V4.1 via API for non-sensitive tasks) on accuracy, speed and VRAM, then assign models per job
- [ ] **Workhorse loop:** generate -> verify automatically (run tests in a no-network sandbox container) -> feed errors back -> repeat; first job: the Minecraft idle auto-stop script
- [~] **Second brain (Obsidian):** vault built 2026-11-14 as Claude Code's memory (43 linked notes, verified); synced to the desktop via Syncthing over Tailscale and versioned with git (2026-11-14); next: agents write to it: they write findings/reports as linked notes, the Librarian answers from it. Private data, so the agents that read it never also read untrusted input and act
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
- [ ] **Disaster recovery drill:** rebuild the server from backups onto a spare disk and time it

## Fun / miscellaneous
- [ ] **Website aesthetic overhaul:** visual redesign once hardening is done
- [ ] **Build a vulnerable machine:** my own CTF box with planted flaws, plus a walkthrough write-up
- [ ] **AI red team:** can local 9B agents hack my vulnerable box? Strictly contained: isolated CTF network (no internet, no route to host/LAN), agent sandbox that can only reach the target, kill switch, full logging
- [ ] **Stream Deck control panel:** buttons on the desktop calling a small authenticated homelab API over Tailscale (status, start/stop Minecraft, pause Pi-hole, VPN check, wake desktop); fixed action list, no arbitrary commands
- [ ] **Minecraft helper bot:** `!ask` in game chat, answered by the local LLM from the modpack's wikis
