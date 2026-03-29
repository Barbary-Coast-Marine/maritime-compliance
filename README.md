# 🚢 Maritime Compliance Platform

**Offline-first compliance monitoring for commercial vessels.**

Built by [Barbary Coast Marine](https://barbarycoastmarine.com) — making maritime compliance automatic, auditable, and affordable.

---

## The Problem

Commercial vessel operators face a maze of USCG, ABS, and IMO regulations. Missing a drill deadline, an expired certificate, or a skipped inspection means fines ($5k–$100k+), vessel detention, or worse — safety incidents.

Most operators track compliance with spreadsheets, paper logbooks, and institutional memory. When the chief engineer retires, the knowledge goes with them.

## The Solution

A self-contained compliance system that runs on a single box aboard your vessel. No cloud required. No internet needed. Works at sea, works in port, works during a USCG inspection.

- **Never miss a deadline** — the system knows every drill, inspection, and certificate expiry
- **Digital logbook** — timestamped, attributed, immutable entries replace paper
- **One-click audit reports** — generate a USCG-ready PDF in seconds, not hours
- **Works offline** — everything runs locally on the vessel's own hardware

## Architecture

```
┌─────────────────────────────────────────────────┐
│  VESSEL UNIT (single box, runs everything)      │
│                                                 │
│  ┌───────────┐  ┌───────────┐  ┌────────────┐  │
│  │ Dashboard │  │ API       │  │ Rule       │  │
│  │ (Next.js) │  │ (Fastify) │  │ Engine     │  │
│  └─────┬─────┘  └─────┬─────┘  └─────┬──────┘  │
│        └───────────────┼──────────────┘         │
│                  ┌─────▼─────┐                  │
│                  │ PostgreSQL│                  │
│                  │+TimescaleDB                  │
│                  │+pgvector  │                  │
│                  └───────────┘                  │
│  ┌───────────┐  ┌───────────┐                  │
│  │  Redis    │  │  Ollama   │                  │
│  │  (queue)  │  │ (local AI)│                  │
│  └───────────┘  └───────────┘                  │
└─────────────────────────────────────────────────┘
      Accessible on ship LAN — no internet needed
```

**Hardware:** Intel NUC or fanless industrial PC (~$300–600), Ubuntu 24.04 LTS

## Regulatory Coverage

### Currently Implemented (Subchapter H — Passenger Vessels)

| Rule | Citation | Frequency |
|------|----------|-----------|
| Fire Drill | 46 CFR 78.37 | Weekly (with passengers) |
| Abandon Ship Drill | 46 CFR 78.37 | Weekly (with passengers) |
| Steering Gear Test | 46 CFR 78.47 | Pre-departure |
| Passenger Manifest | 46 CFR 78.33 | Pre-departure |
| Stability Verification | 46 CFR 78.53 | Pre-departure |
| Hatches Secured | 46 CFR 78.50 | Pre-departure |
| Emergency Lighting Test | 46 CFR 78.73 | Weekly |
| Lifesaving Inspection (weekly) | 46 CFR 78.77 | Weekly |
| Lifesaving Inspection (monthly) | 46 CFR 78.77 | Monthly |
| Fire Extinguisher Inspection | 46 CFR 78.67 | Annual |
| Liferaft Servicing | 46 CFR 78.83 | Annual |
| Drydock Examination | 46 CFR 71.50 | Every 5 years |
| COI Validity | 46 CFR 71.25 | Every 5 years |
| Boiler Inspection (steam) | 46 CFR Part 52 | Annual |
| Official Logbook | 46 CFR 78.17 | Continuous |

### Roadmap
- **Subchapter T** — Small passenger vessels (<100 GT)
- **ABS Rules** — Hull and machinery classification
- **IMO/SOLAS** — International safety conventions
- **Port State Control** — PSC inspection readiness

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API Server | Fastify (TypeScript) |
| Dashboard | Next.js 15 + Tailwind CSS (PWA) |
| Database | PostgreSQL 16 + TimescaleDB + pgvector |
| Job Queue | pg-boss |
| Local AI | Ollama (llama3.1:8b) |
| Cache | Redis 7 |
| Deployment | Docker Compose |

## Project Structure

```
maritime-compliance/
├── apps/
│   ├── vessel-agent/          # Fastify API + rule engine
│   │   └── src/
│   │       ├── server.ts      # Main server
│   │       ├── rule-engine.ts # Compliance evaluation logic
│   │       ├── queue.ts       # pg-boss job queue
│   │       └── routes/        # API endpoints
│   └── dashboard/             # Next.js web UI
│       └── src/
│           ├── app/           # Pages (bridge, checks, logbook, alerts, pre-departure)
│           └── lib/           # Mock data, utilities
├── packages/
│   ├── db/                    # Drizzle ORM schema + migrations
│   ├── regulations/           # eCFR fetcher + YAML rule definitions
│   │   ├── rules/uscg/        # Human-verified compliance rules
│   │   └── sources/uscg/      # eCFR API integration
│   └── types/                 # Shared TypeScript types
├── install/
│   ├── docker-compose.yml     # Full stack deployment
│   ├── install.sh             # One-command vessel install
│   └── Dockerfile             # Vessel agent container
└── docs/
    ├── DASHBOARD_DESIGN.md    # UI specification
    └── OBRIEN_COMPLIANCE_PROFILE.md  # Pilot vessel profile
```

## How Rules Work

Compliance rules are **human-verified YAML files** — not auto-generated by AI. Each rule must be reviewed and promoted to `verified` status before it can generate live alerts. This is a deliberate liability shield.

```yaml
rule_id: USCG-H-78-37-FIRE
status: draft              # draft → verified → deprecated
citation: "46 CFR 78.37"
title: "Fire Drill"

trigger:
  type: calendar
  interval_days: 7
  warning_days: 2
  critical_days: 0

required_action: >
  Conduct fire drill with all crew. Must include: sounding
  general alarm, simulating fire emergency, starting fire pumps...
```

The rule engine evaluates all active rules against the vessel's state (last completion dates, certificate expiries) and returns a verdict per rule: **pass**, **warning**, or **violation**.

## Dashboard

The dashboard is designed as a **bridge instrument** — not a startup SaaS panel. Dark navy theme, high contrast, big touch targets for tablets in the wheelhouse.

- **Bridge** — at-a-glance compliance status (green/amber/red)
- **Checks** — all rules grouped by category
- **Logbook** — digital logbook with structured entry forms
- **Alerts** — active violations and warnings
- **Pre-Departure** — interactive checklist for every voyage

## Pilot

First sea trial: **SS Jeremiah O'Brien** (IMO 5171749), Memorial Cruise, May 30, 2026.

The O'Brien is a 1943 Liberty Ship operating as a seagoing museum vessel under USCG Subchapter H with ABS classification — one of the most complex compliance profiles in the small fleet segment.

## Status

> ⚠️ **PROTOTYPE** — This is a pre-seed prototype under active development. Not yet validated for production compliance use.

## License

Proprietary — Barbary Coast Marine, Inc. All rights reserved.
