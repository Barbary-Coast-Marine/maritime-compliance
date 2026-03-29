# SS Jeremiah O'Brien — Compliance Profile

**Vessel Data:**
| Field | Value |
|-------|-------|
| IMO | 5171749 |
| MMSI | 366879000 |
| Call Sign | KXCH |
| ABS Class | 4304713 |
| Type | Liberty Ship (EC2-S-C1), museum/passenger vessel |
| Length | 441 ft 6 in (134.57m) |
| Beam | 57 ft (17m) |
| Draft | 27 ft 9 in (8.46m) |
| Displacement | 15,928 long tons |
| Gross Tonnage | ~7,176 GT (Liberty ship standard) |
| Propulsion | Triple-expansion steam, 2,500 HP, oil-fired Foster Wheeler boilers |
| Year Built | 1943 |
| Flag | US |
| Port | San Francisco, CA (Pier 35) |
| Status | Seagoing museum ship, carries passengers |
| Owner/Operator | National Liberty Ship Memorial (NLSM) |

---

## ⚠️ CRITICAL: Regulatory Classification

The O'Brien is **NOT a Subchapter T vessel.**

- Subchapter T = Small Passenger Vessels under 100 GT
- The O'Brien is ~7,176 GT → **Subchapter H** (Passenger Vessels)

**Applicable regulations:**
- **46 CFR Parts 70-89** (Subchapter H — Passenger Vessels)
- **ABS Rules** (vessel is ABS-classed, class #4304713)
- **SOLAS** (applicable portions for passenger vessels on domestic voyages)
- **MTSA/VSP** (Maritime Transportation Security Act — required for passenger vessels at certain facilities)

**Additional considerations:**
- National Historic Landmark (1986) — may have specific USCG equivalency letters
- Museum vessel exemptions — check COI for any special conditions
- Steam propulsion — specific boiler inspection requirements (46 CFR Part 52/53)
- Historical armament — deactivated, but may have documentation requirements

---

## Subchapter H Rule Map (Parts 70-89)

### Part 70 — General Provisions
- §70.05-1: Application to US-flag passenger vessels
- Defines vessel types, tonnage thresholds, voyage classifications

### Part 71 — Inspection and Certification
- §71.25: Certificate of Inspection
- §71.50: Drydock examination intervals (typically every 5 years)
- §71.53: Underwater survey in lieu of drydocking (UWILD)
- §71.65: Reinspection

### Part 72 — Construction and Arrangement
- Hull subdivision
- Watertight integrity
- Structural fire protection
- Means of escape

### Part 73 — Miscellaneous Vessels Not Listed Elsewhere
- May apply to museum vessels

### Part 74 — Stability
- Intact stability requirements
- Damage stability for vessels over 100 GT
- Stability letter compliance

### Part 75 — Lifesaving Equipment
- Lifeboat and liferaft requirements
- Personal flotation devices
- EPIRB requirements
- Survival craft manning

### Part 76 — Fire Protection Equipment
- Fire detection systems
- Fixed fire extinguishing systems
- Portable fire extinguishers
- Fire hose and hydrant systems

### Part 77 — Vessel Control, Miscellaneous Systems
- Steering gear
- Ventilation
- Communication systems

### Part 78 — Operations
**THIS IS THE BIG ONE for compliance tracking:**
- §78.17: Logbook requirements
- §78.33: Passenger manifests and crew lists
- §78.37: Crew drills and training
  - Fire drills: weekly when carrying passengers
  - Abandon-ship drills: weekly when carrying passengers
  - Monthly if not carrying passengers
- §78.47: Steering gear tests (12 hours before departure)
- §78.50: Draft and loadline markings
- §78.53: Stability verification before departure
- §78.67: Fire extinguisher inspection (annual)
- §78.73: Emergency lighting and power tests (weekly)
- §78.77: Lifesaving equipment inspections (monthly)
- §78.83: Inflatable liferaft servicing (annual)

### Part 79 — Manning
- Licensed officer requirements
- Crew certification
- STCW applicability

### Parts 80-89 — Various
- Marine engineering, electrical, boilers, automation

---

## O'Brien-Specific Compliance Rules (Phase 0 MVP)

These are the rules that should be active for the Memorial Cruise sea trial:

### Pre-Departure (Every Voyage)
| Rule | Citation | Frequency | Type |
|------|----------|-----------|------|
| Steering gear test | §78.47 | 12h before departure | event |
| Whistle test | §78.47 | 12h before departure | event |
| Engine room communication test | §78.47 | 12h before departure | event |
| Passenger manifest filed | §78.33 | Every voyage | event |
| Stability verification | §78.53 | Before departure | event |
| Hatches and openings secured | §78.50 | Before departure | event |

### Weekly
| Rule | Citation | Frequency | Type |
|------|----------|-----------|------|
| Fire drill (when carrying passengers) | §78.37 | Weekly | calendar |
| Abandon-ship drill (when carrying passengers) | §78.37 | Weekly | calendar |
| Emergency lighting test | §78.73 | Weekly | calendar |
| Lifesaving appliance visual inspection | §78.77 | Weekly | calendar |
| Lifeboat engine run (3 min) | §78.77 | Weekly | calendar |

### Monthly
| Rule | Citation | Frequency | Type |
|------|----------|-----------|------|
| Lifesaving equipment detailed inspection | §78.77 | Monthly | calendar |
| EPIRB test | §78.77 | Monthly | calendar |
| Emergency generator load test (2h) | §78.73 | Monthly | calendar |

### Quarterly
| Rule | Citation | Frequency | Type |
|------|----------|-----------|------|
| Lifeboat winch controls inspection | — | Quarterly | calendar |

### Annual
| Rule | Citation | Frequency | Type |
|------|----------|-----------|------|
| Fire extinguisher inspection | §78.67 | Annual | calendar |
| Inflatable liferaft servicing | §78.83 | Annual | calendar |
| Lifeboat/liferaft strip and inspect | — | Annual | calendar |
| Boiler inspection (USCG marine inspector) | Part 52 | Annual | calendar |

### Multi-Year
| Rule | Citation | Frequency | Type |
|------|----------|-----------|------|
| Drydock examination | §71.50 | Every 5 years | calendar |
| Internal structural examination | §71.50 | Per COI schedule | calendar |
| ABS hull/machinery survey | ABS Rules | Per class schedule | calendar |
| COI renewal | §71.25 | Every 5 years | calendar |

### Boiler-Specific (Steam Vessel)
| Rule | Citation | Frequency | Type |
|------|----------|-----------|------|
| Boiler internal inspection | Part 52 | Annual | calendar |
| Boiler hydrostatic test | Part 52 | Per inspector schedule | calendar |
| Safety valve test | Part 52 | Annual | calendar |
| Feedwater system inspection | Part 52 | Annual | calendar |

**The O'Brien's steam plant makes it unique** — most modern vessels don't have boiler inspection requirements. Part 52 (Marine Engineering — Boilers) adds a whole layer of compliance that diesel vessels don't deal with.

---

## MTSA/VSP Security Requirements

The O'Brien operates from Pier 35, a regulated maritime facility:
- Vessel Security Plan (VSP) required
- DHS-mandated camera coverage (see network docs — cameras being installed)
- Access control requirements
- Security drills (quarterly)
- Facility Security Officer (FSO) coordination

These should be Phase 2 rules but need to be accounted for in the schema.

---

## Memorial Cruise (May 30, 2026) — Pre-Sea-Trial Checklist

Before the platform goes live for the sea trial:

1. ☐ Verify COI date and all conditions
2. ☐ Confirm last drydock date
3. ☐ Confirm last boiler inspection date
4. ☐ Load all active Subchapter H rules (verified status)
5. ☐ Enter historical drill/inspection dates from paper logbook
6. ☐ Upload COI, stability letter, ABS certificate to doc vault
7. ☐ Create user accounts for captain + chief engineer
8. ☐ Run pre-departure checklist in system as dry run
9. ☐ Generate test audit report, compare against known compliance status
10. ☐ Install on vessel network (or run on laptop for initial demo)
