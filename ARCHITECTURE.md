# Maritime Compliance Platform — Architecture

**Version:** 0.1 (2026-03-29)
**Status:** Pre-build design

---

## Core Constraints

1. **Offline-first** — everything works at sea with zero internet
2. **Single-box deployment** — runs on one industrial PC per vessel
3. **Generic** — installs on any vessel type, any flag state
4. **No cloud dependency for safety-critical functions**
5. **Simple to install** — one script, 5-question wizard

---

## Hardware Target

### Pilot 1 — SS Jeremiah O'Brien (Phase 0 + demo)
- **NVIDIA Jetson Orin Nano (8GB)** — ~$500
  - 1024 CUDA cores — Ollama runs accelerated (~20-30 tok/s)
  - Full stack including LLM — good for demos, grant credibility, TRL advancement
  - Power: ship's 120V AC (O'Brien has no power constraints)
  - Ubuntu 22.04 arm64 (JetPack), Docker Compose
- First sea trial: May 30, 2026 (Memorial Day Cruise)

### Pilot 2 — Sailboat / Tourist Charter Power Catamaran (12V prototype)
- **Fanless Intel N100 mini PC** — ~$180-220
  - 16GB RAM, 256GB M.2 NVMe SSD
  - Intel N100 (4 cores, 6W TDP idle, ~15W peak under Ollama)
  - **Wide-voltage 12V DC input** (9-30V or 9-36V range — handles marine 12V charging swings)
  - Fanless — no moving parts; tolerates salt air and vibration
  - Recommended units: Topton N100 fanless industrial, Seeed Studio reTerminal DM
- Ubuntu Server 24.04 LTS (x86_64)
- Serial/USB for sensor inputs (NMEA 0183/2000, Modbus) — Phase 2
- Ethernet to ship LAN; WiFi for port sync
- Target vessel types: sailing vessels, tourist charter catamarans, small passenger vessels <100 GT

### Product Appliance (Commercial — Phase 1+)
- Same N100 spec as Pilot 2, packaged as a hardened appliance
- See packaging + power budget below

### Power Budget (12V Vessel System — N100)
| State | Draw | Current @12V |
|-------|------|--------------|
| Idle (full stack, no LLM) | ~6-8W | ~0.5-0.7A |
| Ollama active (query) | ~15W peak | ~1.25A |
| 24h average | ~4-6 Ah/day | trivial on any house bank |

Note: Jetson Orin Nano draws 10-25W depending on load — viable on 12V but higher Ah budget needed. Not target for 12V product.

### Appliance Packaging (Production)
- Weatherproof enclosure (Pelican-style or aluminum DIN rail box)
- Conformal-coated PCB for humidity resistance
- Screw-terminal 12V input (more reliable than barrel jack aboard)
- External status LED (crew visibility without logging in)
- Hardware or software watchdog for auto-reboot offshore
- DIN rail mount option for engine room installs

### COGS Target
- Hardware: <$250/vessel
- Enclosure + accessories: ~$50
- **Total BOM: ~$300/vessel**

---

## Software Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Docker Compose | Single-node, operator-friendly |
| API | Fastify (Node.js/TypeScript) | REST + WebSocket |
| Web UI | Next.js | Served by vessel-agent; PWA for offline tablets |
| Database | PostgreSQL + TimescaleDB + pgvector | All-in-one: relational, time-series, vector search |
| Job Queue | pg-boss | Postgres-backed, no extra infra |
| LLM | Ollama (llama3.1:8b) | Local, no internet required |
| Embeddings | nomic-embed-text (via Ollama) | For RAG over regulation text |
| Cache | Redis | Session, short-lived state |

---

## Deployment Topology

```
VESSEL BOX (single unit)
  ├── vessel-agent (API + rule engine + sync)
  ├── dashboard (Next.js, served locally)
  ├── collector (sensor daemon: NMEA/Modbus/manual)
  ├── PostgreSQL + TimescaleDB + pgvector
  ├── Redis
  └── Ollama (local LLM + embeddings)

Accessible on ship LAN:
  → http://vessel-unit.local:3000  (dashboard)
  → PWA installable on crew tablets/phones
```

---

## Regulation Rule System

Rules are **human-verified YAML files** — not auto-generated. Each rule requires:
- `status: verified` (promoted from `draft`)
- `verified_by` + `verified_date`
- Human review before any rule generates live alerts

Rule packages ship with the platform:
- `rules/uscg/subchapter-t/` — Small passenger vessels (<100 GT)
- `rules/uscg/subchapter-h/` — Passenger vessels
- `rules/uscg/subchapter-i/` — General / Offshore supply
- `rules/abs/` — ABS hull/machinery (Phase 2)
- `rules/imo/` — SOLAS/MARPOL (Phase 2)

Rule schema: see `packages/regulations/rules/RULE_SCHEMA.md`

**CRITICAL:** Rule citations must be verified against actual CFR text.
The spec's example `46 CFR 131.105` is incorrect — Part 131 is Subchapter I (OSVs).
Subchapter T rules are in Parts 175-185.

---

## Pilot Scope (O'Brien, by May 30, 2026)

Phase 0 — MVP for sea trial:
1. ✅ Vessel profile (COI, drydock dates, cert expirations)
2. ✅ Manual logbook entry (drills, inspections, fuel dips)
3. ✅ Compliance dashboard (green/yellow/red per rule)
4. ✅ Alerts when items are overdue
5. ✅ PDF audit report for USCG inspections

No IoT sensors, no ML, no AI in Phase 0. Value = never missing a deadline + 5-minute audit prep.

---

## Sync (When Connected)

Outbound (vessel → shore, optional):
- Compliance event log (anonymized option)
- Audit reports (captain-initiated)
- Telemetry summaries

Inbound (shore → vessel):
- Regulation rule updates (signed YAML bundles)
- New rule packages
- Fleet analytics

Sync triggers: port WiFi detection, satellite link, manual, scheduled 0300.

---

## eCFR API (Regulation Source)

Base: `https://www.ecfr.gov/api/versioner/v1/`

Key endpoints:
- Structure: `GET /structure/{date}/title-46.json?chapter=I&subchapter=T`
- Full text: `GET /full/{date}/title-46.xml?chapter=I&subchapter=T&part=NNN`
- Updated as of: 2026-03-26

Title 46 Chapter I Subchapter T (Small Passenger Vessels):
- Part 175 — General Provisions
- Part 176 — Inspection and Certification
- Part 177 — Construction and Arrangement
- Parts 178-185 — Stability, Lifesaving, Firefighting, Machinery, Electrical, Operations

---

## Monorepo Layout

```
maritime-compliance/
├── apps/
│   ├── vessel-agent/      # Core daemon
│   ├── dashboard/         # Next.js web UI (PWA)
│   └── shore/             # Optional fleet dashboard
├── packages/
│   ├── types/
│   ├── regulations/       # eCFR ingest + rule YAML
│   └── db/                # Drizzle schema + migrations
├── install/
│   ├── install.sh         # One-command vessel install
│   ├── docker-compose.yml
│   └── vessel-setup.sh    # Interactive config wizard
└── docs/
```

---

## Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Offline-first, single-box | Sketchy internet at sea; must work without cloud |
| 2026-03-29 | Ollama instead of Claude API | No internet = no API calls; local 8B model sufficient for RAG over structured regs |
| 2026-03-29 | PostgreSQL only (+ extensions) | Eliminates InfluxDB + MongoDB; simpler ops |
| 2026-03-29 | Human-verified YAML rules | Liability shield; wrong citations = worse than useless |
| 2026-03-29 | Docker Compose not Kubernetes | Single node; operators aren't k8s engineers |
| 2026-03-29 | Phase 0 = no IoT/ML | Prove value with manual entry first; sensors are Phase 2 |
