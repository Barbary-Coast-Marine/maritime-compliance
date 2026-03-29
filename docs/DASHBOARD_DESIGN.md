# Dashboard UI Design Specification

**Version:** 0.1 (2026-03-29)
**Target:** Vessel-mounted tablet (10-12"), wheelhouse/engine room environment

---

## Design Philosophy

This dashboard is a **bridge instrument**, not a startup SaaS panel. It will be used by captains, chief engineers, and deckhands on tablets in bright sunlight or dimly lit engine rooms.

Priorities:
1. **Glanceable** — answer "are we compliant?" in 2 seconds from 6 feet
2. **Big touch targets** — 48px minimum, 60px preferred (gloves, wet hands)
3. **High contrast** — readable in direct sunlight and dark wheelhouse
4. **Offline-resilient** — subtle "OFFLINE" badge, nothing breaks
5. **Dark mode default** — night watch officers can't be blinded

---

## Color System

```
Background:    #0B1426 (deep navy)
Surface:       #142038 (card background)
Border:        #1E2D4A (subtle separator)
Text primary:  #E8ECF1 (near-white)
Text secondary:#8892A4 (muted)

Compliant:     #22C55E (green)
Warning:       #EAB308 (amber)
Critical:      #EF4444 (red)
Info:          #3B82F6 (blue)
Neutral:       #6B7280 (gray)
```

---

## Navigation

Bottom tab bar (mobile/tablet) or left sidebar (desktop):

| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| 🏠 | Bridge | / | At-a-glance compliance status |
| 📋 | Checks | /checks | All compliance rules + status |
| 📖 | Logbook | /logbook | Digital logbook entries |
| 🔔 | Alerts | /alerts | Active + historical alerts |
| 🔧 | Drills | /drills | Drill calendar + tracking |
| 📄 | Reports | /reports | USCG audit report generation |
| 📁 | Docs | /docs | Document vault (COI, surveys, certs) |
| ⚙️ | Settings | /settings | Vessel config, users, sync |

---

## Screen: Bridge (Home) — `/`

The captain's primary view. Must fit one viewport with no scrolling.

### Layout
- **Hero:** Single traffic light indicator (COMPLIANT / WARNING / CRITICAL)
- **Vessel name + COI expiry** below hero
- **Three stat boxes:** Passing count (green) | Due Soon count (amber) | Overdue count (red)
- **Upcoming items:** Next 3-5 compliance items sorted by urgency
- **Recent activity:** Last 3-5 logbook entries
- **Action buttons:** [+ LOG ENTRY] and [PRE-DEPARTURE CHECK]

### Behavior
- Auto-refreshes via WebSocket
- Traffic light color = worst active status (any red = red overall)
- Tap stat box to filter /checks view
- Tap upcoming item to see detail + mark complete

---

## Screen: Compliance Checks — `/checks`

All active compliance rules, grouped by category.

### Categories
- Safety Drills (abandon-ship, fire, immersion suit)
- Inspections (lifesaving, fire extinguisher, EPIRB)
- Certificates (COI, drydock, stability)
- Pre-Departure (steering gear, manifest, stability check)

### Per-Rule Row
- Status indicator (green/amber/red/gray)
- Rule title
- Last completed date
- Next due date
- Tap → detail panel with:
  - Full regulation citation
  - Previous completion history
  - Required action text
  - [MARK COMPLETE] button

---

## Screen: Logbook — `/logbook`

Digital replacement for paper logbook. Entries are timestamped, attributed, immutable.

### Entry Types
- Drill (abandon-ship, fire, immersion suit)
- Inspection (lifesaving, fire protection, sanitary)
- Fuel Dip (port tank, starboard tank, total, percentage)
- Maintenance (system, action, next due)
- General (free-form)

### New Entry Form
- Entry type selector (large buttons)
- Pre-filled template per type
- Photo attachment from tablet camera
- Voice-to-text option
- Auto-tags relevant compliance rules
- Author auto-filled from logged-in user

### List View
- Filter by entry type
- Search
- Date range
- Each entry shows: date, type icon, title, author, compliance tags

---

## Screen: Alerts — `/alerts`

### Active Alerts
- Severity badge (CRITICAL / WARNING / INFO)
- Description
- Due date
- [LOG NOW] action for critical items

### Resolved Alerts (last 30 days)
- Checkmark + description
- Resolution date
- What was the alert type

### Push Notifications
- Critical → WebSocket push + audio tone
- Warning → WebSocket push (silent)
- Info → Badge count only

---

## Screen: Drills — `/drills`

Calendar view of drill requirements.

### Monthly View
- Week-by-week completion status
- Biweekly cadence shown (abandon-ship / fire alternating)
- Quarterly requirements called out
- Annual requirements called out

### Actions
- [SCHEDULE DRILL] — pick type, date, assign crew
- [LOG COMPLETED DRILL] — opens logbook form pre-filled

---

## Screen: Reports — `/reports`

### Report Generator
- Period selector (last 30 days, last quarter, custom)
- Report type: USCG Audit Report, Monthly Summary, Drydock Prep
- [GENERATE PDF] button
- Progress indicator during generation

### Report Contents (USCG Audit)
- Vessel identification (name, IMO, COI number, tonnage)
- Compliance summary (violations, warnings, all clear)
- Complete drill log for period
- Maintenance actions taken
- Violations with corrective actions and resolution dates
- Upcoming due dates
- Document expiry status

### Recent Reports
- List of previously generated PDFs
- Download / print / email options

---

## Screen: Document Vault — `/docs`

### Categories
- Certificates (COI, Stability Letter, FCC License)
- Surveys (Drydock Report, Hull Survey)
- Crew (USCG Licenses, Medical Certificates)
- Plans (Stability Book, Fire Safety Plan)

### Per-Document
- Document name
- Expiry date (with color coding)
- Upload date, uploaded by
- [VIEW] [DOWNLOAD] [REPLACE]

### Upload
- Drag-and-drop or camera capture
- Document type selector
- Expiry date picker (if applicable)

---

## Screen: Pre-Departure Checklist — `/pre-departure`

Interactive checklist run before any voyage.

### Layout
- Vessel name + date + time
- Ordered checklist items:
  - Steering gear tested
  - Whistle tested
  - Engine room communication verified
  - Passenger manifest filed (with count input)
  - Stability verified per trim book
  - Hatches and openings secured
  - Safety equipment ready
  - Weather reviewed
  - Crew briefing completed
- Progress counter (7/9 completed)
- [COMPLETE AND LOG] button — greyed until all checked
- Creates logbook entry on completion

### Behavior
- Items can be vessel-type specific (loaded from config)
- Captain can add ad-hoc items
- Completed checklist becomes immutable logbook entry

---

## Screen: Settings — `/settings`

### Vessel Profile
- Edit vessel details (name, IMO, tonnage, type)
- COI dates, drydock dates
- Certificate management

### Users
- Add/remove crew members
- Role assignment (captain, engineer, crew, fleet_manager)
- Password management (local auth only)

### Active Rules
- Which compliance rules are active for this vessel
- Toggle rules on/off
- View rule details + citations

### Sync (when connected)
- Last sync time
- Manual [SYNC NOW] button
- Sync log

### System
- Software version
- Database status
- Ollama model status
- Disk usage

---

## Responsive Behavior

| Viewport | Layout |
|----------|--------|
| Tablet portrait (768px) | Bottom tab nav, single-column |
| Tablet landscape (1024px) | Bottom tab nav, two-column where useful |
| Desktop (1280px+) | Left sidebar nav, full layout |

Primary target is **tablet portrait** — that's what gets mounted in the wheelhouse.

---

## Technology

- Next.js 15 with App Router
- Tailwind CSS (custom theme with above colors)
- PWA manifest for offline tablet installation
- WebSocket for real-time alert push
- Chart.js or Recharts for trend visualizations (Phase 2)
