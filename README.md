# Maritime Compliance Platform

**AI-powered compliance monitoring for commercial vessels.**

Built by [Barbary Coast Marine](https://barbarycoastmarine.com) for the BuilderShip Hackathon 2026.

🌐 **Live demo:** [demo.barbarycoastmarine.com](https://demo.barbarycoastmarine.com)  
Login: `captain` / `obrien2026`

---

## The Problem

Commercial vessel operators face a maze of USCG, ABS, and IMO regulations. Missing a drill deadline, an expired certificate, or a skipped inspection means fines ($5k–$100k+), vessel detention, or worse — safety incidents at sea.

Most operators track compliance with spreadsheets, paper logbooks, and institutional memory. When the chief engineer retires, the knowledge goes with them.

## What It Does

A vessel-side compliance system with an AI agent that understands maritime regulations.

**Tell it what happened — it handles the rest:**

> "We ran the fire drill this morning, about 12 crew participated"

The agent logs a properly structured USCG logbook entry, links it to the applicable CFR citation, and clears the compliance flag — all from natural language.

- **38 USCG rules** covering Subchapter H passenger vessels, evaluated continuously
- **Digital logbook** — timestamped, attributed, CFR-linked entries
- **AI compliance officer** — answers regulation questions, logs drills, searches USCG bulletins
- **Maritime intel feed** — live USCG safety alerts and Port State Control focus areas
- **Audit reports** — PDF-ready compliance history in one click
- **Offline-first** — designed to run on a vessel's own hardware, no cloud required

---

## Quick Start

**Prerequisites:** Docker, Docker Compose, API keys (see below)

```bash
git clone https://github.com/Barbary-Coast-Marine/maritime-compliance.git
cd maritime-compliance
cp .env.example .env        # fill in your API keys
docker compose up --build
```

Open [http://localhost](http://localhost) — login with `captain` / `obrien2026`

The first startup runs database migrations and seeds demo vessel data automatically.

### API Keys Required

| Service | Purpose | Get one |
|---------|---------|---------|
| [Nebius](https://studio.nebius.ai) | LLM inference (agent loop) | studio.nebius.ai |
| [Tavily](https://tavily.com) | Regulation + safety bulletin search | tavily.com |
| [Composio](https://composio.dev) | Email alert notifications | composio.dev |

> **No Nebius credits?** Set `NEBIUS_API_URL=https://api.groq.com/openai/v1/` and `GROQ_API_KEY=<your-key>` in `.env` to use Groq as a drop-in.

---

## AI Agent

The compliance officer agent is the core of the system. It runs on Nebius (OpenAI-compatible inference) with an agentic tool-call loop:

```
User: "We did a man overboard drill, all 8 crew participated"
  └─► Agent decides: call create_logbook_entry
      └─► Writes structured USCG entry to PostgreSQL
      └─► Rule engine re-evaluates: days_since_mob_drill → 0
      └─► Compliance status clears
  └─► Agent replies with confirmation + CFR citation
```

**Tools available to the agent:**

| Tool | What it does |
|------|-------------|
| `create_logbook_entry` | Parses natural language into structured USCG logbook entries |
| `get_compliance_status` | Runs the rule engine and returns current vessel status |
| `search_regulation` | Searches ecfr.gov, uscg.mil, ntsb.gov via Tavily |

**Sponsor integrations:**
- **Nebius** — LLM inference via OpenAI-compatible API
- **Tavily** — real-time regulation and safety alert search
- **Composio** — email notifications when compliance items go overdue
- **OpenClaw** — agent runtime and orchestration layer

---

## Regulatory Coverage

38 verified USCG rules across Subchapter H (Passenger Vessels):

| Category | Rules | Example |
|----------|-------|---------|
| Drills | 6 | Fire Drill weekly (46 CFR 78.37), Abandon Ship, MOB, Immersion Suit |
| Inspections | 12 | Lifesaving equipment weekly/monthly, fire extinguisher, EPIRB |
| Certificates | 5 | COI, Drydock exam, TSMS audit |
| Pre-departure | 8 | Steering gear test, passenger manifest, stability verification |
| Logbook | 7 | Official logbook, crew training records, drug/alcohol compliance |

Rules are **human-verified YAML** — not auto-generated. Each must be reviewed and promoted to `verified` status before it generates live alerts:

```yaml
rule_id: USCG-H-78-37-FIRE
status: verified
citation: "46 CFR 78.37"
title: "Fire Drill"
trigger:
  type: calendar
  interval_days: 7
  warning_days: 2
  critical_days: 0
required_action: >
  Conduct fire drill with all crew. Sound general alarm, simulate
  fire emergency, start fire pumps, deploy fire hoses...
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser / Tablet                                       │
│  Next.js 15 PWA — dark navy bridge instrument UI        │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────┐
│  Nginx                                                  │
│  /api/* → vessel-agent:3200                             │
│  /*     → dashboard:3000                                │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
┌──────────────▼──────────┐  ┌────────▼────────────────────┐
│  vessel-agent (Fastify) │  │  dashboard (Next.js)        │
│  Port 3200              │  │  Port 3000                  │
│                         │  │                             │
│  Rule engine (38 rules) │  │  Bridge · Checks · Logbook  │
│  AI agent loop          │  │  Alerts · Intel · Reports   │
│  Compliance evaluator   │  │  Chat panel (all pages)     │
│  Report generation      │  └─────────────────────────────┘
│  Logbook CRUD           │
└────────┬────────────────┘
         │
┌────────▼────────────────┐   ┌──────────────────────────┐
│  PostgreSQL 16          │   │  External APIs           │
│  Drizzle ORM            │   │  Nebius (LLM inference)  │
└─────────────────────────┘   │  Tavily (reg. search)    │
                              │  Composio (email alerts) │
┌─────────────────────────┐   └──────────────────────────┘
│  Redis                  │
│  Session store / cache  │
└─────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Fastify (TypeScript ESM) |
| Dashboard | Next.js 15, Tailwind CSS, PWA |
| Database | PostgreSQL 16, Drizzle ORM |
| LLM inference | Nebius AI (OpenAI-compatible) |
| Regulation search | Tavily |
| Notifications | Composio |
| Agent runtime | OpenClaw |
| Cache | Redis 7 |
| Auth | JWT (bcrypt, 7-day sessions) |
| Deployment | Docker Compose / PM2 |

---

## Project Structure

```
maritime-compliance/
├── apps/
│   ├── vessel-agent/           # Fastify API + AI agent
│   │   └── src/
│   │       ├── server.ts       # Main server entry
│   │       ├── rule-engine.ts  # USCG compliance evaluator
│   │       ├── agent/          # Nebius agent loop + tools
│   │       └── routes/         # API endpoints
│   └── dashboard/              # Next.js PWA
│       └── src/
│           ├── app/            # Pages + chat panel
│           └── lib/            # API client, mock data
├── packages/
│   ├── db/                     # Drizzle schema, migrations, seed
│   ├── regulations/            # USCG rule YAML + loader
│   │   └── rules/uscg/         # 38 verified compliance rules
│   └── types/                  # Shared TypeScript types
└── install/
    ├── docker-compose.yml      # One-command cold start
    ├── Dockerfile              # vessel-agent container
    ├── Dockerfile.dashboard    # dashboard container
    └── nginx.conf              # Routing config
```

---

## Pilot

First sea trial: **SS Jeremiah O'Brien** (IMO 5171749), Memorial Day Cruise, May 30, 2026.

The O'Brien is a 1943 Liberty Ship operating as a seagoing museum under USCG Subchapter H — one of the most complex compliance profiles in the historic vessel segment. The platform ran live during the cruise, tracking crew drills and pre-departure checks aboard.

---

## Roadmap

- **Subchapter T** — Small passenger vessels (<100 GT)
- **ABS Classification** — Hull and machinery rules
- **IMO / SOLAS** — International safety conventions
- **Port State Control** — PSC inspection readiness scoring
- **Offline LLM** — Local Ollama fallback for vessels without satellite internet

---

## Status

> ⚠️ **PROTOTYPE** — Pre-seed prototype under active development. Not yet validated for production compliance use.

---

## License

Proprietary — Barbary Coast Marine, Inc. All rights reserved.
