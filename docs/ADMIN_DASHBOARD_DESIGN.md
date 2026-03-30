# Admin Dashboard — Design Specification

**Version:** 0.1 (2026-03-30)
**Status:** Pre-build design
**Author:** Barbary Coast Marine

---

## Purpose

The Admin section gives captains and fleet managers the ability to manage the vessel, crew, compliance rules, documents, and system health — without touching the database directly. For the Phase 0 pilot (Memorial Cruise, May 30, 2026), admin is essential for:

1. Setting up vessel profile and certificate dates
2. Onboarding crew and volunteers before the cruise
3. Enabling/disabling compliance rules
4. Uploading required documents (COI, stability letter, etc.)
5. Monitoring system health

---

## Design Principles

Follows the existing dashboard design philosophy (see DASHBOARD_DESIGN.md):

- **Same dark navy theme** — `#0B1426` background, `#142038` cards, high contrast text
- **Same touch targets** — 48px minimum, 60px preferred (gloves, wet hands)
- **Role-gated** — only `captain` and `fleet_manager` roles see the Admin tab
- **Offline-resilient** — forms work offline, sync when connected
- **Non-destructive** — soft deletes, confirmation dialogs for dangerous actions

The admin section should feel like an extension of the bridge dashboard, not a separate application. Same component patterns, same color system, same navigation feel.

---

## Navigation

### Primary: Admin Tab in Bottom Nav

Add an **Admin** tab (⚙️ gear icon) to the existing bottom tab bar. Only visible when `user.role === "captain" || user.role === "fleet_manager"`.

### Secondary: Admin Sub-Navigation

Inside `/admin`, a horizontal pill tab bar at the top (below the user bar, above content):

```
[ Vessel ]  [ Crew ]  [ Rules ]  [ Documents ]  [ System ]
```

Active tab gets `bg-status-blue/20 text-status-blue` treatment. Scrollable on narrow viewports.

---

## Route Structure

```
/admin                    → redirects to /admin/vessel
/admin/vessel             → Vessel profile editor
/admin/crew               → Crew roster list
/admin/crew/new           → Onboarding wizard
/admin/crew/[id]          → View/edit crew member
/admin/crew/[id]/edit     → Edit crew member details
/admin/rules              → Rule configuration
/admin/documents          → Document vault management
/admin/system             → System status + diagnostics
```

---

## Screen: Vessel Profile — `/admin/vessel`

The vessel's identity card. Everything a USCG inspector asks for in the first 30 seconds.

### Layout

**Header Card** — vessel name (large), type badge, flag, IMO number

**Identity Section** (2-column grid on tablet landscape, single column portrait)
| Field | Type | Notes |
|-------|------|-------|
| Vessel Name | text | Required |
| IMO Number | text | 7 digits |
| MMSI | text | 9 digits |
| Call Sign | text | |
| Official Number | text | USCG documentation number |
| Vessel Type | select | passenger, small_passenger, cargo, etc. |
| Flag State | select | Country code |
| Hailing Port | text | |
| Gross Tonnage | number | |
| Year Built | number | |
| Propulsion | text | e.g., "Triple-expansion steam, 2,500 HP" |
| Operator | text | Organization name |
| Subchapter | select (auto) | Derived from vessel type + tonnage |

**Certificate Timeline** — visual timeline/cards for major certificates:
- Certificate of Inspection (COI) — number, issue date, expiry date
- Drydock Examination — last completed, next due
- Stability Letter — expiry
- ABS Classification — class number, survey due
- FCC Radio License — call sign, expiry
- MTSA/VSP — if applicable

Each certificate card shows:
- Name + citation
- Issue/expiry dates with color-coded countdown badge (green >90 days, amber 30-90, red <30)
- [Upload Document] button — links to document vault
- [Edit Dates] inline toggle

**Actions**
- [Save Changes] — primary blue button, bottom-sticky on mobile
- [Generate Vessel Summary PDF] — secondary action

### API Endpoints Needed
- `GET /api/admin/vessel` — full vessel profile
- `PUT /api/admin/vessel` — update vessel profile
- `GET /api/admin/vessel/certificates` — certificate entries with document links
- `PUT /api/admin/vessel/certificates/:id` — update certificate dates

---

## Screen: Crew Roster — `/admin/crew`

### List View

Table/card list of all crew members. Each row shows:
- **Status badge**: 🟢 Active | 🟡 Pending Onboarding | 🔴 Inactive | ⚪ Archived
- **Name** (full name, bold)
- **Role** — Captain, Chief Engineer, Engineer, Able Seaman, Ordinary Seaman, Volunteer, etc.
- **Department** — Deck, Engine, Steward, Admin
- **Credential status** — ✅ All current | ⚠️ Expiring soon | 🔴 Expired credential

**Filter bar**: All | Active | Pending | Inactive + role dropdown + search

**Actions**:
- [+ Onboard New Crew] — primary action, top right → goes to `/admin/crew/new`
- Row tap → goes to crew member detail view

### Crew Detail View — `/admin/crew/[id]`

Full profile page for one crew member. Organized in collapsible sections:

**Header**: Name, photo (optional), role badge, status badge, [Edit] [Deactivate]

**Section 1: Personal Information**
- Full legal name, preferred name
- Email, phone
- Emergency contact (name, relationship, phone)
- Next of kin (name, relationship, phone, address)
- Home address (optional)
- Date of birth (needed for some USCG docs)

**Section 2: Assignment**
- Role (captain, engineer, crew, volunteer)
- Department (deck, engine, steward, admin)
- Watch assignment (if applicable)
- Start date / hire date
- Vessel assignment

**Section 3: USCG Credentials** (skip for volunteers unless they hold licenses)
- MMC (Merchant Mariner Credential) number + expiry
- License grade: Master, Chief Mate, 2nd Mate, 3rd Mate, Chief Engineer, 1st AE, 2nd AE, 3rd AE, AB, OS, QMED, Wiper, etc.
- Endorsements (list, each with expiry)
- TWIC (Transportation Worker Identification Credential) number + expiry
- Drug test date + result (pass/pending)
- STCW endorsements (list with expiry)

Each credential shows a color-coded expiry badge. Red = expired, amber = within 90 days, green = current.

**Section 4: Medical**
- Medical certificate expiry date
- Fit-for-duty status (current/expired/pending)
- Drug test compliance date
- Physical exam date
- Notes (allergies, restrictions — visible only to captain/fleet_manager)

**Section 5: Training Record**
- Basic Safety Training (BST) — date, expiry
- Advanced Firefighting — date, expiry
- Medical First Aid / CPR — date, expiry
- Survival Craft / Lifeboat — date, expiry
- Ship-specific safety orientation — date
- Vessel-specific emergency assignments
- Custom training entries (add as needed)

Each training item: title, completion date, expiry date (if applicable), certificate document link

**Section 6: Documents**
- List of uploaded documents (license scans, medical certs, training certs, photo ID)
- Each: thumbnail, filename, upload date, expiry (if applicable)
- [Upload Document] button
- Links to document vault entries

**Section 7: Activity Log**
- Recent logbook entries authored by this crew member
- Training completions
- Drill participation (Phase 2)

---

## Onboarding Wizard — `/admin/crew/new`

Multi-step form for bringing a new crew member aboard. Two tracks:

### Licensed Mariner Track (full)
All 7 steps — personal info, role, credentials, medical, training, documents, review

### Volunteer Track (simplified)
Steps 1, 2, 4 (basic medical), 5 (safety orientation only), 7 (review)
Skip USCG credentials entirely. Flag with `isVolunteer: true`.

### Step Indicator
Horizontal progress bar at top showing step number/name. Steps can be revisited by tapping.

### Step 1: Personal Information
- Full legal name (first, middle, last) — required
- Preferred name / display name
- Email — required (for login credentials)
- Phone number
- Date of birth
- Home address (street, city, state, zip)
- Emergency contact: name, relationship, phone — required
- Next of kin: name, relationship, phone, address

### Step 2: Role & Assignment
- **Track selector** (prominent): Licensed Mariner | Volunteer
  - Selecting "Volunteer" collapses steps 3 and reduces steps 4-5
- Role: dropdown per track
  - Mariner: Captain, Chief Mate, 2nd/3rd Mate, Chief Engineer, 1st/2nd/3rd AE, AB, OS, QMED, Wiper, Steward
  - Volunteer: Deck Volunteer, Engine Volunteer, Education/Tour Guide, Admin/Office, General Volunteer
- Department: Deck, Engine, Steward, Admin
- Watch assignment: (optional) Day Watch, First Dog, etc.
- Start date: date picker, defaults to today

### Step 3: USCG Credentials (Mariner track only)
- MMC Number + issue date + expiry date
- License grade (select from list)
- Endorsements (multi-add: endorsement type + expiry)
- TWIC card number + expiry
- STCW endorsements (multi-add: type + expiry)
- Drug test: date + status (pass/pending/not completed)

Each credential field has an expiry date and a [Scan/Upload] button to attach a document image.

### Step 4: Medical
**Mariner:**
- Medical certificate: issuer, issue date, expiry date
- Fit-for-duty: yes/no
- Drug test compliance: date
- Physical exam date
- Restrictions/notes

**Volunteer:**
- Self-certification: "I confirm I am physically able to perform assigned duties" checkbox
- Emergency medical info: allergies, medications, conditions (optional, confidential)
- Date of last physical (optional)

### Step 5: Training & Orientation
**Mariner:**
- BST (Basic Safety Training) — date, expiry, cert upload
- Advanced Firefighting — date, expiry, cert upload
- Medical First Aid — date, expiry, cert upload
- Proficiency in Survival Craft — date, expiry, cert upload
- Additional certs (add rows dynamically)

**Volunteer:**
- Safety orientation date — required (when they got the ship tour + safety briefing)
- T-shirt size (the O'Brien tracks this for volunteer uniforms)
- Badge issued: yes/no + date (ties into Volgistics badge system)

### Step 6: Documents
- Upload zone: drag-and-drop or tap to select
- For each uploaded file: auto-detect type or select from:
  - MMC / License scan
  - Medical certificate
  - Training certificate
  - Photo ID
  - TWIC card
  - Other
- Preview thumbnails
- All uploads go to document vault tagged to this crew member

### Step 7: Review & Activate
- Summary card showing all entered information, organized by section
- Missing/required fields highlighted in amber
- Credential expiry warnings shown inline
- **Captain sign-off**: checkbox "I confirm this crew member has been properly onboarded"
- **Create account**: auto-generates username (first.last) and temporary password
  - Or: [Send login link via email] (Phase 2)
- [Complete Onboarding] button — creates user account, crew profile, all credential records
- [Save as Draft] — saves progress without activating

### Post-Onboarding
- New crew member appears in roster as "Active"
- Their credentials feed into the main compliance dashboard (credential expiry alerts)
- They can log in and create logbook entries per their role

---

## Screen: Rule Configuration — `/admin/rules`

### Layout

Grouped accordion list of all available compliance rules, organized by source:

```
▼ USCG Subchapter H — Passenger Vessels (15 rules)
  ✅ Fire Drill — 46 CFR 78.37 — Weekly
  ✅ Abandon Ship Drill — 46 CFR 78.37 — Weekly
  ✅ Steering Gear Test — 46 CFR 78.47 — Pre-departure
  ...

▼ USCG Subchapter T — Small Passenger Vessels (15 rules)
  ⬜ Fire Drill — 46 CFR 185.520 — Weekly
  ⬜ Abandon Ship Drill — 46 CFR 185.520 — Weekly
  ...

▶ ABS Rules (coming Phase 2)
▶ IMO/SOLAS (coming Phase 2)
```

### Per-Rule Row
- Toggle switch (enable/disable for this vessel)
- Rule title
- Citation
- Frequency badge
- Status pill: `verified` (green) | `draft` (amber) | `deprecated` (gray)
- Tap → expandable detail:
  - Full required action text
  - Warning threshold (days before due) — editable number input
  - Critical threshold — editable number input
  - Applicable vessel types
  - [View CFR Text] button (Phase 2 — links to eCFR)

### Actions
- [Apply Changes] — saves toggle + threshold changes
- Rule count summary at top: "12 of 30 rules active"

### Guard Rails
- Only `verified` rules can be enabled
- Cannot disable rules that have active violations (must resolve first, or force-override with confirmation dialog)
- Changes logged in audit trail

### API Endpoints Needed
- `GET /api/admin/rules` — all rules with active/inactive state per vessel
- `PUT /api/admin/rules/:ruleId` — toggle active, update thresholds

---

## Screen: Document Vault — `/admin/documents`

### Layout

Category tabs at top:
```
[ All ]  [ Certificates ]  [ Surveys ]  [ Crew Docs ]  [ Plans ]  [ Other ]
```

### Document List
Card grid (2 columns tablet, 3 desktop) or list view toggle.

Per document card:
- Icon by type (PDF, image, etc.)
- Document name
- Category badge
- Expiry date with color-coded countdown (if applicable)
- Uploaded by + date
- File size

### Actions
- [Upload Document] — floating action button
  - File picker or camera capture
  - Document type selector (COI, Stability Letter, Medical Cert, License Scan, etc.)
  - Category auto-assigned from type
  - Expiry date picker (optional)
  - Link to crew member (for crew docs) or vessel (for vessel docs)
  - Notes field
- Document tap → preview (inline for images, download for PDF)
- [Replace] — upload new version, old one archived
- [Delete] — soft delete with confirmation

### Search & Filter
- Text search on filename + notes
- Filter by: category, expiry status (current/expiring/expired), crew member, date range

### Expiry Dashboard (sub-section)
Top of page: summary cards
- 🟢 `X` documents current
- 🟡 `X` expiring within 90 days
- 🔴 `X` expired

### API Endpoints Needed
- `GET /api/admin/documents` — list with filters
- `POST /api/admin/documents` — upload
- `PUT /api/admin/documents/:id` — update metadata
- `DELETE /api/admin/documents/:id` — soft delete
- `GET /api/admin/documents/:id/download` — file download

---

## Screen: System Status — `/admin/system`

### Layout

Card grid with system health indicators.

**Database Card**
- Status: 🟢 Connected / 🔴 Disconnected
- PostgreSQL version
- Database size (MB)
- Table row counts: vessels, logbook_entries, compliance_events, users
- Last migration applied

**Job Queue Card** (pg-boss)
- Status: 🟢 Running / 🔴 Stopped
- Jobs pending / completed / failed (last 24h)
- Last compliance check: timestamp + result
- Next scheduled compliance check
- [Run Compliance Check Now] button

**AI Engine Card** (Ollama)
- Status: 🟢 Running / 🟡 Loading / 🔴 Offline
- Model loaded: llama3.1:8b
- Memory usage
- Embeddings model: nomic-embed-text
- [Test Query] button (Phase 2)

**Storage Card**
- Disk usage: used / total with bar
- Document vault size
- Database size
- Log size

**Software Card**
- Version: 0.1.0-alpha
- Last updated: date
- Node.js version
- Docker status (if containerized)

**Sync Card** (Phase 2)
- Last sync: timestamp
- Sync direction: shore → vessel / vessel → shore
- Items pending sync
- [Sync Now] button

### API Endpoints Needed
- `GET /api/admin/system/health` — aggregated health check
- `GET /api/admin/system/queue` — pg-boss stats
- `POST /api/admin/system/compliance-check` — trigger on-demand check

---

## Database Schema Changes

### New table: `crew_profiles`
```sql
CREATE TABLE crew_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vessel_id UUID REFERENCES vessels(id),

  -- Personal
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  preferred_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(30),
  date_of_birth DATE,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),

  -- Emergency
  emergency_contact_name VARCHAR(200),
  emergency_contact_relationship VARCHAR(50),
  emergency_contact_phone VARCHAR(30),
  next_of_kin_name VARCHAR(200),
  next_of_kin_relationship VARCHAR(50),
  next_of_kin_phone VARCHAR(30),
  next_of_kin_address TEXT,

  -- Assignment
  department VARCHAR(50), -- deck, engine, steward, admin
  watch_assignment VARCHAR(50),
  start_date DATE,
  is_volunteer BOOLEAN DEFAULT false NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- active, pending, inactive, archived

  -- Volunteer-specific
  tshirt_size VARCHAR(10),
  badge_issued BOOLEAN DEFAULT false,
  badge_issued_date DATE,
  safety_orientation_date DATE,

  -- Medical (basic — detailed certs in crew_credentials)
  fit_for_duty BOOLEAN DEFAULT true,
  medical_notes TEXT, -- confidential, captain/fleet_manager only
  allergies TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### New table: `crew_credentials`
```sql
CREATE TABLE crew_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_profile_id UUID NOT NULL REFERENCES crew_profiles(id) ON DELETE CASCADE,

  credential_type VARCHAR(50) NOT NULL,
  -- Types: mmc, license, endorsement, twic, stcw, medical_cert,
  --        drug_test, bst, firefighting, first_aid, survival_craft,
  --        safety_orientation, custom

  title VARCHAR(200) NOT NULL, -- e.g., "Master 1600 GRT", "Basic Safety Training"
  credential_number VARCHAR(100), -- MMC#, TWIC#, etc.
  grade VARCHAR(100), -- license grade if applicable
  issuer VARCHAR(200), -- "USCG", "Red Cross", etc.

  issue_date DATE,
  expiry_date DATE,
  status VARCHAR(20) DEFAULT 'current' NOT NULL, -- current, expiring, expired, pending

  -- Linked document in vault
  document_id UUID REFERENCES document_vault(id),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Modify: `users` table
Add columns:
```sql
ALTER TABLE users ADD COLUMN display_name VARCHAR(200);
ALTER TABLE users ADD COLUMN email VARCHAR(255);
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
```

Extend `userRoleEnum` to include `volunteer` and `admin`.

### Modify: `document_vault` table
Add columns:
```sql
ALTER TABLE document_vault ADD COLUMN crew_profile_id UUID REFERENCES crew_profiles(id);
ALTER TABLE document_vault ADD COLUMN category VARCHAR(50) DEFAULT 'other';
  -- categories: certificate, survey, crew_doc, plan, other
ALTER TABLE document_vault ADD COLUMN notes TEXT;
ALTER TABLE document_vault ADD COLUMN is_deleted BOOLEAN DEFAULT false;
ALTER TABLE document_vault ADD COLUMN deleted_at TIMESTAMPTZ;
```

---

## Role Permissions

| Action | captain | fleet_manager | engineer | crew | volunteer |
|--------|---------|---------------|----------|------|-----------|
| View Admin | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Vessel Profile | ✅ | ✅ | ❌ | ❌ | ❌ |
| Onboard Crew | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Crew Profile | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Crew Medical | ✅ | ✅ | ❌ | ❌ | ❌ |
| Toggle Rules | ✅ | ✅ | ❌ | ❌ | ❌ |
| Upload Documents | ✅ | ✅ | ✅ | ❌ | ❌ |
| View System Status | ✅ | ✅ | ✅ | ❌ | ❌ |
| Trigger Compliance Check | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Own Profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Logbook Entry | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## Component Patterns

Reuse existing dashboard component patterns:

### Cards
```
bg-navy-surface border border-navy-border rounded-xl p-4
```

### Section Headers
```
text-slate-muted text-xs uppercase tracking-wider font-semibold mb-3
```

### Form Inputs
```
bg-navy border border-navy-border rounded-lg px-4 py-3 text-slate-text
focus:border-status-blue focus:ring-1 focus:ring-status-blue
```
Min height 48px for touch targets.

### Status Badges
```
inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
- active:   bg-status-green/20 text-status-green
- pending:  bg-status-amber/20 text-status-amber
- inactive: bg-status-red/20 text-status-red
- archived: bg-slate-muted/20 text-slate-muted
```

### Toggle Switch
Custom toggle with 48px hit area, uses status-blue for active state.

### Confirmation Dialogs
Modal overlay, dark backdrop, card in center. Red accent for destructive actions.

---

## Implementation Priority

For the May 30 sea trial, build in this order:

1. **Vessel Profile** — must be editable before pilot
2. **Crew Roster + Onboarding** — need to enter the O'Brien crew
3. **Document Vault UI** — upload COI, stability letter, etc.
4. **System Status** — verify everything works before going live
5. **Rule Configuration** — nice to have, rules can be toggled via YAML for now

---

## Responsive Behavior

Same as main dashboard:
| Viewport | Layout |
|----------|--------|
| Tablet portrait (768px) | Sub-nav scrollable, single column forms |
| Tablet landscape (1024px) | Sub-nav fixed, 2-column form grids |
| Desktop (1280px+) | Left sidebar + sub-nav, full layout |

Primary target remains tablet portrait for wheelhouse use.
