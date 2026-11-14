## Second Brain Overview
My AI assistant (Claude Code, running on the homelab) doesn't remember anything between sessions. Everything it knows about the lab comes from files it reads when a session starts. Originally that was one long handover file that grew every session. It's now an **Obsidian vault**: a folder of small, linked Markdown notes that acts as a shared "second brain" for both me and the assistant.

*   **Location:** a private folder on the homelab (not published; it contains internal hostnames and addresses)
*   **Format:** plain Markdown + `[[wikilinks]]`, so it opens directly in Obsidian
*   **Size at creation:** 43 notes
*   **Backed up:** nightly, as part of the config snapshot (see [[11_Backup_Strategy]])
*   **Versioned:** a local git repository (no remote), so every edit has history and can be rolled back
*   **Synced:** to my desktop with Syncthing over Tailscale, opened in Obsidian there

---

##  Why Not One Big File?
| Single handover file | Linked vault |
|---|---|
| Read in full every session, even for a one-line question | Read a small index, then follow links only to what the task needs |
| Grows forever | Grows by adding notes that are only read when relevant |
| Old and new facts sit side by side and contradict | One fact lives in one note and is edited in place |
| Records *what* was done | Also records *why* (decisions) and *what broke* (incidents) |

---

##  Concepts Borrowed
*   **Zettelkasten:** small "atomic" notes, one idea each, connected by links.
*   **Maps of content:** hub notes (the `index`) that link to everything on a topic.
*   **Backlinks & graph view:** Obsidian shows every note that links *to* the current one, and draws the whole vault as a graph, so clusters and gaps are visible.

---

##  Structure
```
index.md        start here: links to everything
now.md          current state, next session plan, reminders and dates
rules.md        how the assistant must work (no sudo, ask before restarts, never print secrets, push only on request)
user.md         who I am, goals, preferences
host/           server hardware/OS/layout, hardening, network (incl. device IP map)
services/       one note per service: minecraft, jellyfin, pihole-unbound, qbittorrent-gluetun, tailscale, backups, ...
devices/        router, desktop, TV, phone
decisions/      why things are the way they are (e.g. CDI mode over weakening kernel hardening)
incidents/      what broke and how it was fixed
sessions/       one short note per working session
reference       tools + port/exposure map, gotchas, credentials map (locations only), AI agent design, plans
archive/        the original handover and README, kept for history
```

**Every note starts with a small properties block,** which Obsidian displays as metadata:
```yaml
---
type: service
status: current
updated: 2026-11-14
tags: [service]
---
```

---

##  How a Session Works
1.  Claude Code automatically reads `CLAUDE.md` in my home folder, which points to the vault's `index`.
2.  It reads `index` and `now`, then follows links only as far as the task needs. A DNS question opens the Pi-hole note, which links to the router, the relevant decisions and past incidents.
3.  At the end of the session, it updates every note that changed and writes a short `sessions/` note.

This also saves tokens: a fresh session starts with ~70 lines of context instead of the full history, which encourages short, focused sessions.

---

##  Building It: Verification Passes
The vault was built by splitting the old handover and README into notes, then checked over several passes:

*   **Fact check:** 86 key facts from the old documents searched for in the new notes (one missing fact found and added).
*   **Inventory check:** every running container, script, tool, Docker stack, published port and storage folder on the server cross-checked against the notes.
*   **Link check:** a script confirms every `[[link]]` resolves to a real note and no note is orphaned.
*   **Secret check:** a gitleaks scan, plus explicit checks that no password, key or token value appears anywhere. The credentials note records only *where* each secret lives.

```python
# Link + orphan check (runs from the vault root)
import re, os, glob
notes = {os.path.splitext(os.path.basename(p))[0] for p in glob.glob('**/*.md', recursive=True)}
broken = [(l, p) for p in glob.glob('**/*.md', recursive=True)
          for l in re.findall(r'\[\[([^\]|#]+)', open(p).read()) if l not in notes]
orphans = [n for n in notes if not any(f'[[{n}]]' in open(p).read()
           for p in glob.glob('**/*.md', recursive=True) if not p.endswith(n + '.md'))]
print("broken:", broken or "none", "| orphans:", orphans or "none")
```
Final result: **43 notes, 0 broken links, 0 orphans, no secrets.**

---

##  Rules for the Vault
*   **No secrets, ever.** Locations of credentials only.
*   **One topic per note;** edit notes in place rather than appending to a log.
*   **Link generously;** decisions and incidents link back to the services they affect.
*   **Private by design.** The vault stays on the homelab; only sanitised write-ups (like this page) are published.

---

##  Desktop Sync (Syncthing)
The vault lives on the server, but I want to browse it in Obsidian on my desktop. **Syncthing** keeps the two folders identical by syncing directly between the machines, with no cloud in between.

*   **Tailnet only:** the server listens only on its Tailscale address; global discovery, LAN announcements, relays and NAT traversal are all off, so it only ever talks to my desktop.
*   **Paired by device ID:** each side must approve the other before anything syncs.
*   **Two-way, with history:** edits I make in Obsidian sync back to the server, where git shows them as normal changes. Sync-conflict files are deliberately *not* git-ignored, so they show up in `git status` instead of hiding.
*   **What stays on the server:** the `.git` folder and Obsidian's per-device layout files (`.stignore`).
*   Runs as a user service with lingering enabled, so it keeps running without a login session.

**Two gotchas worth recording:** running `sudo sh install.sh | tee log` left `apt-get` *stopped* (not hung) after "Processing triggers", ignoring Ctrl+C, until it got `SIGCONT`; scripts now write their own logs instead. And Syncthing 1.29's `cli` crashed when setting a device address, so that step went through its local REST API instead.

---

##  Next Steps
*   **Agents write to it:** the planned janitor and other local LLM agents will file their reports as linked notes, and the Librarian will answer questions from it. Agents that read this private data will never also read untrusted input *and* take actions.
*   Separately: self-hosted sync for my personal study vault (Self-hosted LiveSync + CouchDB, works on iPhone).
