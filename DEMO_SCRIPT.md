# BuilderShip Hackathon — Live Demo Script
## Target: 2 minutes | Scenario: "We ran the fire drill"

---

### SETUP (before you walk up)
- Dashboard open to Bridge page, logged in as `captain` / `obrien2026`
- Compliance status showing **WARNING** (fire drill overdue)
- Chat panel closed
- Font size bumped if projecting

---

### THE SCRIPT

**[0:00 — The Problem, 20 seconds]**

> "Commercial vessels file compliance in spreadsheets and paper logbooks. A missed fire drill means a $25,000 fine or Port State Control detention. We built the compliance officer that never sleeps."

*Point at the Bridge screen — traffic light showing WARNING, "Fire Drill" highlighted as due.*

---

**[0:20 — The Platform, 15 seconds]**

> "This is the bridge dashboard — 38 verified USCG rules evaluated continuously. Right now we have a warning: fire drill is overdue. In real life, the chief engineer just finished the drill. Here's how they'd log it."

*Tap the floating chat button — panel slides open.*

---

**[0:35 — The Demo, 45 seconds]**

*Type into chat (or paste):*
```
We ran the fire drill this morning, about 12 crew participated
```

> "That's it. Plain English. The agent understands maritime operations."

*Watch the response come in. Narrate what's happening:*

> "The agent identifies this as a USCG drill event, writes a structured logbook entry with the CFR citation, timestamps it, and runs the rule engine."

*Point at compliance status refreshing — WARNING → **COMPLIANT**.*

> "Fire drill is cleared. The entry is in the official logbook with the 46 CFR 78.37 citation attached. Audit-ready, immediately."

---

**[1:20 — The Logbook, 15 seconds]**

*Tap Logbook tab — show the new entry.*

> "Structured entry — crew count, drill type, CFR link, officer attribution. Everything a Port State Control inspector wants to see, generated from one sentence."

---

**[1:35 — The Intel Feed, 15 seconds]**

*Tap More → Intel.*

> "The agent also monitors USCG safety bulletins and Port State Control focus areas in real time — powered by Tavily search. So operators know what inspectors are looking for before they show up."

---

**[1:50 — The Close, 10 seconds]**

> "Barbary Coast Marine. AI-powered compliance for the vessels that keep working. First pilot: SS Jeremiah O'Brien, Memorial Day cruise, May 30th. This ran live on a 1943 Liberty Ship."

*Smile. Done.*

---

### BONUS (if time / if asked about tech)

> "The agent runs on Nebius inference with an OpenClaw runtime, Tavily for regulation search, and Composio for email alerts when compliance items go critical. Offline-first architecture — designed to run on a vessel's own hardware, no satellite internet required."

---

### CONTINGENCY
- **If agent is down:** DEMO MODE banner will show — "Let me show you the same flow with demo data" — behavior is identical, just flagged.
- **If chat is slow:** While waiting — "The agent is calling its tools — searching regulations, writing the logbook entry, re-evaluating all 38 rules..."
- **If asked about the O'Brien:** "She's a 1943 Liberty Ship operating as a seagoing museum under USCG Subchapter H — one of the most complex compliance profiles in the historic vessel segment. We're the IT compliance advisor."
