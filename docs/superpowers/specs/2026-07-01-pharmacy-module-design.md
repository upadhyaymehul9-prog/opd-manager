# Pharmacy Module — Full Design Spec

**Date:** 2026-07-01  
**Product:** OPD Manager (`opd-manager`)  
**Author:** Approved by product owner  
**Status:** Approved — Phase 1 ready to implement

## Vision

Build a full pharmacy product inside the OPD Manager ecosystem in four phases:

1. **Phase 1 — Prescription flow** (MVP, this implementation)
2. **Phase 2 — Stock** (inventory, batches, expiry, deduct on dispense)
3. **Phase 3 — Billing + GST** (invoices, tax, daily sales)
4. **Phase 4 — Integrations** (Pill Reminder, n8n/HIS, analytics)

Long-term goal (**Option C**): prescription + dispensing **and** full dispensary operations.

## Current State

The existing `/pharmacy` page is a **queue step only**:

- Patients with status `to_pharmacy` / `at_pharmacy` appear in a list
- Staff tap **Patient Arrived** and **Medicines Given — Exit**
- No prescription lines, medicine catalog, stock, or billing

Doctor can send patients to pharmacy via status `to_pharmacy` but does not record medicines.

## Architecture Principles

- **Same app, same database** — extend `opd-manager` (Next.js 16 + Neon PostgreSQL + Prisma)
- **Same auth roles** — reuse `doctor` and `pharmacy` logins; `admin`/`manager` see reports
- **Modular schema** — Phase 1 tables designed so Phase 2–3 add columns/tables without breaking Phase 1
- **Solo-founder friendly** — ship Phase 1 to a pilot hospital before stock/GST complexity

## Phase 1 — Prescription Flow (MVP)

### Goal

Doctor writes a prescription during consult → pharmacy sees exact medicine list → marks each line dispensed → patient exits OPD.

### User Stories

| Role | Story |
|------|--------|
| Doctor | While consulting, add medicine lines (name, dose, frequency, days, qty, notes) and send to pharmacy |
| Pharmacy | See patient queue with full Rx; tick each medicine as dispensed; complete when all done |
| Manager | See count of patients waiting at pharmacy with pending Rx lines |

### Out of Scope (Phase 1)

- Stock quantity checks
- Purchase orders
- GST billing / printable tax invoice
- Barcode scanning
- HIS/n8n integration
- Pill Reminder push

### Data Model (Phase 1)

#### `medicines` (catalog)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | String | Required, indexed |
| form | String? | tablet, syrup, injection, cream |
| strength | String? | e.g. 500mg |
| is_active | Boolean | default true |
| created_at | Timestamptz | |

Seed ~50 common OPD medicines for autocomplete.

#### `prescriptions`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| patient_visit_id | UUID | FK → patient_visits, unique (one Rx per visit) |
| doctor_id | UUID | FK → doctors |
| notes | String? | e.g. "Take after food" |
| status | String | `draft` \| `sent_to_pharmacy` \| `partially_dispensed` \| `dispensed` |
| sent_to_pharmacy_at | Timestamptz? | |
| created_at | Timestamptz | |
| updated_at | Timestamptz | |

#### `prescription_items`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| prescription_id | UUID | FK |
| medicine_id | UUID? | FK → medicines (optional if free-text) |
| medicine_name | String | Always stored for display |
| dose | String? | e.g. 1 tablet |
| frequency | String? | OD, BD, TDS, QID, SOS, HS |
| duration_days | Int? | |
| quantity | Int? | Units to dispense |
| instructions | String? | |
| dispensed | Boolean | default false |
| dispensed_at | Timestamptz? | |
| substituted_note | String? | If generic swap |
| sort_order | Int | default 0 |

#### `patient_visits` (unchanged statuses)

Sending Rx sets visit `status` → `to_pharmacy`. Pharmacy arrival → `at_pharmacy`. All items dispensed → `completed`.

### API Endpoints (Phase 1)

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET | `/api/medicines?q=` | doctor, pharmacy, admin, manager | Search catalog |
| POST | `/api/medicines` | admin, manager | Add catalog entry |
| GET | `/api/prescriptions?visit_id=` | doctor, pharmacy, admin, manager | Get Rx for visit |
| POST | `/api/prescriptions` | doctor | Create/update draft Rx + items |
| POST | `/api/prescriptions/[id]/send` | doctor | Set status sent, visit → to_pharmacy |
| PATCH | `/api/prescriptions/items/[id]` | pharmacy | Mark line dispensed / substitution note |
| POST | `/api/prescriptions/[id]/complete` | pharmacy | All dispensed → visit completed |

Auth: existing session cookie middleware; add API rules in `src/lib/auth.ts`.

### UI Changes (Phase 1)

#### Doctor console (`/doctor/[id]`)

- For patients in `in_consultation` or `in_followup`: expandable **Write Prescription** panel
- Medicine search (autocomplete from catalog) + add line form
- List editable lines before send
- **Send to Pharmacy** button (replaces generic "Send to Pharmacy" status-only action when Rx exists)

#### Pharmacy console (`/pharmacy`)

- Patient cards show Rx summary (N medicines, M pending)
- Click patient → **Rx detail view** (modal or `/pharmacy/[visitId]`)
- Per-line checkbox **Dispensed** + optional substitution note
- **Complete & exit** when all lines dispensed

#### Manager (`/manager`)

- Badge: patients at pharmacy with undispensed lines

#### TV display

- No change in Phase 1 (still shows "Go to Pharmacy")

### Seed Data

- `prisma/seed-medicines.ts` — common Indian OPD medicines (paracetamol, amoxicillin, pantoprazole, etc.)
- Run via `npm run db:seed-medicines` after `db:push`

### Success Criteria (Pilot)

- Doctor completes Rx in under 2 minutes
- Pharmacy dispenses without re-asking doctor for medicine names
- Patient cannot exit (`completed`) until all Rx lines marked dispensed
- Existing OPD flow (reception → doctor → lab → pharmacy) still works

---

## Phase 2 — Stock (Future)

### Additions

- `stock_batches` (medicine_id, batch_no, expiry_date, qty, mrp, purchase_rate)
- Deduct qty on dispense; warn/block at zero
- Low-stock alerts on manager dashboard
- Pharmacy can only dispense if stock available (configurable warn vs block)

---

## Phase 3 — Billing + GST (Future)

### Additions

- `pharmacy_bills` + `pharmacy_bill_items` linked to prescription
- GST % per medicine (HSN optional)
- Payment mode: cash, UPI, credit
- Printable PDF / thermal receipt
- Daily sales + tax summary in `/analytics`

---

## Phase 4 — Integrations (Future)

- Webhook on Rx dispensed → n8n → HIS/MRD
- Push schedule to Pill Reminder app (Flutter) from frequency + duration
- UHID field on patient_visit for cross-system linking

---

## Global Constraints

- **Stack:** Next.js 16.2.x, React 19, Prisma 6, Neon PostgreSQL, existing auth middleware
- **No new paid services** in Phase 1
- **Mobile-friendly** pharmacy UI (tablet at counter)
- **English UI** first; medicine names support Hindi/generic brand in `medicine_name` text field
- **Follow existing patterns:** `ConsoleShell`, `PatientCard`, API routes in `src/app/api/`, serialize helpers in `src/lib/`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Doctor skips Rx, uses old "Send to Pharmacy" button | Keep button but prompt "No medicines added — continue anyway?" |
| Large Rx list on small screen | Scrollable panel; sort_order for lines |
| Duplicate prescriptions per visit | Unique constraint on `patient_visit_id` |
| API auth blocks n8n later | Phase 4 adds `API_KEY` for machine access |

---

## Approval

Design approved by product owner on 2026-07-01. Phase 1 implementation plan: `docs/superpowers/plans/2026-07-01-pharmacy-phase-1.md`.
