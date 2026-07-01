# Pharmacy Phase 1 — Prescription Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doctors write prescriptions in the OPD flow; pharmacy staff dispense line-by-line from that Rx before patient exit.

**Architecture:** Extend Prisma schema with `medicines`, `prescriptions`, `prescription_items`. Add REST APIs and UI panels on doctor/pharmacy consoles. Reuse existing patient visit statuses (`to_pharmacy` → `at_pharmacy` → `completed`).

**Tech Stack:** Next.js 16 App Router, Prisma 6, Neon PostgreSQL, existing session auth in `src/lib/auth.ts`

## Global Constraints

- Next.js 16.2.x, React 19, TypeScript, Tailwind — match existing `opd-manager` patterns
- All new API routes must respect role checks in `src/lib/auth.ts` (`canAccessApi`)
- Serialize DB rows via helpers in `src/lib/serialize.ts` (camelCase JSON for frontend)
- No stock, billing, or GST in this plan
- Run `npm run db:push` after schema changes; seed medicines via `npm run db:seed-medicines`

---

## File Map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | New models + relations |
| `prisma/seed-medicines.ts` | Common medicine catalog |
| `src/lib/prescription-types.ts` | TS types for Rx |
| `src/lib/serialize.ts` | `serializePrescription`, `serializePrescriptionItem`, `serializeMedicine` |
| `src/app/api/medicines/route.ts` | GET search, POST create (admin) |
| `src/app/api/prescriptions/route.ts` | GET by visit_id, POST upsert draft |
| `src/app/api/prescriptions/[id]/send/route.ts` | Doctor sends to pharmacy |
| `src/app/api/prescriptions/[id]/complete/route.ts` | Pharmacy completes visit |
| `src/app/api/prescriptions/items/[id]/route.ts` | PATCH dispense line |
| `src/lib/auth.ts` | API permission rules for new routes |
| `src/components/PrescriptionForm.tsx` | Doctor UI — add/search lines, send |
| `src/components/PrescriptionDetail.tsx` | Pharmacy UI — dispense checklist |
| `src/app/doctor/[id]/page.tsx` | Embed PrescriptionForm per patient |
| `src/app/pharmacy/page.tsx` | Show Rx summary; link to detail |
| `src/app/pharmacy/[visitId]/page.tsx` | Full Rx dispense screen |
| `package.json` | `db:seed-medicines` script |

---

### Task 1: Database schema

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: Prisma models `Medicine`, `Prescription`, `PrescriptionItem` with relations to `PatientVisit` and `Doctor`

- [ ] **Step 1: Add models to schema**

Add after `PatientVisit` model:

```prisma
model Medicine {
  id                 String             @id @default(uuid()) @db.Uuid
  name               String
  form               String?
  strength           String?
  is_active          Boolean            @default(true)
  created_at         DateTime           @default(now()) @db.Timestamptz(6)
  prescription_items PrescriptionItem[]

  @@index([name])
  @@map("medicines")
}

model Prescription {
  id                  String             @id @default(uuid()) @db.Uuid
  patient_visit_id    String             @unique @db.Uuid
  doctor_id           String             @db.Uuid
  notes               String?
  status              String             @default("draft")
  sent_to_pharmacy_at DateTime?          @db.Timestamptz(6)
  created_at          DateTime           @default(now()) @db.Timestamptz(6)
  updated_at          DateTime           @updatedAt @db.Timestamptz(6)
  patient_visit       PatientVisit       @relation(fields: [patient_visit_id], references: [id], onDelete: Cascade)
  doctor              Doctor             @relation(fields: [doctor_id], references: [id], onDelete: Restrict)
  items               PrescriptionItem[]

  @@index([status])
  @@map("prescriptions")
}

model PrescriptionItem {
  id               String       @id @default(uuid()) @db.Uuid
  prescription_id  String       @db.Uuid
  medicine_id      String?      @db.Uuid
  medicine_name    String
  dose             String?
  frequency        String?
  duration_days    Int?
  quantity         Int?
  instructions     String?
  dispensed        Boolean      @default(false)
  dispensed_at     DateTime?    @db.Timestamptz(6)
  substituted_note String?
  sort_order       Int          @default(0)
  prescription     Prescription @relation(fields: [prescription_id], references: [id], onDelete: Cascade)
  medicine         Medicine?    @relation(fields: [medicine_id], references: [id], onDelete: SetNull)

  @@index([prescription_id])
  @@map("prescription_items")
}
```

Add to `PatientVisit`:

```prisma
  prescription Prescription?
```

Add to `Doctor`:

```prisma
  prescriptions Prescription[]
```

- [ ] **Step 2: Push schema**

```bash
npm run db:push
```

Expected: `Your database is now in sync with your Prisma schema.`

---

### Task 2: Types and serialization

**Files:**
- Create: `src/lib/prescription-types.ts`
- Modify: `src/lib/serialize.ts`

**Interfaces:**
- Produces: `Medicine`, `Prescription`, `PrescriptionItem`, `UpsertPrescriptionInput` types; serialize functions used by all API routes

- [ ] **Step 1: Create `src/lib/prescription-types.ts`**

```typescript
export type PrescriptionStatus =
  | "draft"
  | "sent_to_pharmacy"
  | "partially_dispensed"
  | "dispensed";

export type Medicine = {
  id: string;
  name: string;
  form: string | null;
  strength: string | null;
  is_active: boolean;
};

export type PrescriptionItem = {
  id: string;
  prescription_id: string;
  medicine_id: string | null;
  medicine_name: string;
  dose: string | null;
  frequency: string | null;
  duration_days: number | null;
  quantity: number | null;
  instructions: string | null;
  dispensed: boolean;
  dispensed_at: string | null;
  substituted_note: string | null;
  sort_order: number;
};

export type Prescription = {
  id: string;
  patient_visit_id: string;
  doctor_id: string;
  notes: string | null;
  status: PrescriptionStatus;
  sent_to_pharmacy_at: string | null;
  created_at: string;
  updated_at: string;
  items: PrescriptionItem[];
};

export type PrescriptionItemInput = {
  medicine_id?: string | null;
  medicine_name: string;
  dose?: string | null;
  frequency?: string | null;
  duration_days?: number | null;
  quantity?: number | null;
  instructions?: string | null;
  sort_order?: number;
};

export type UpsertPrescriptionInput = {
  patient_visit_id: string;
  doctor_id: string;
  notes?: string | null;
  items: PrescriptionItemInput[];
};
```

- [ ] **Step 2: Add serializers to `src/lib/serialize.ts`**

```typescript
import type { Medicine as DbMedicine, Prescription as DbPrescription, PrescriptionItem as DbItem } from "@prisma/client";
import type { Medicine, Prescription, PrescriptionItem } from "./prescription-types";

export function serializeMedicine(m: DbMedicine): Medicine {
  return {
    id: m.id,
    name: m.name,
    form: m.form,
    strength: m.strength,
    is_active: m.is_active,
  };
}

export function serializePrescriptionItem(i: DbItem): PrescriptionItem {
  return {
    id: i.id,
    prescription_id: i.prescription_id,
    medicine_id: i.medicine_id,
    medicine_name: i.medicine_name,
    dose: i.dose,
    frequency: i.frequency,
    duration_days: i.duration_days,
    quantity: i.quantity,
    instructions: i.instructions,
    dispensed: i.dispensed,
    dispensed_at: i.dispensed_at?.toISOString() ?? null,
    substituted_note: i.substituted_note,
    sort_order: i.sort_order,
  };
}

export function serializePrescription(
  p: DbPrescription & { items: DbItem[] },
): Prescription {
  return {
    id: p.id,
    patient_visit_id: p.patient_visit_id,
    doctor_id: p.doctor_id,
    notes: p.notes,
    status: p.status as Prescription["status"],
    sent_to_pharmacy_at: p.sent_to_pharmacy_at?.toISOString() ?? null,
    created_at: p.created_at.toISOString(),
    updated_at: p.updated_at.toISOString(),
    items: p.items
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(serializePrescriptionItem),
  };
}
```

---

### Task 3: Medicine catalog API + seed

**Files:**
- Create: `src/app/api/medicines/route.ts`
- Create: `prisma/seed-medicines.ts`
- Modify: `package.json`

- [ ] **Step 1: `GET/POST /api/medicines`**

```typescript
// GET ?q=para — search active medicines, limit 20
// POST { name, form?, strength? } — admin/manager only
```

- [ ] **Step 2: Seed script with ~30 common medicines**

```typescript
// prisma/seed-medicines.ts — paracetamol, ibuprofen, amoxicillin, pantoprazole, etc.
```

- [ ] **Step 3: Add script**

```json
"db:seed-medicines": "dotenv -e .env.local -- tsx prisma/seed-medicines.ts"
```

- [ ] **Step 4: Run**

```bash
npm run db:seed-medicines
```

---

### Task 4: Prescription CRUD API

**Files:**
- Create: `src/app/api/prescriptions/route.ts`
- Create: `src/app/api/prescriptions/[id]/send/route.ts`
- Create: `src/app/api/prescriptions/[id]/complete/route.ts`
- Create: `src/app/api/prescriptions/items/[id]/route.ts`
- Modify: `src/lib/auth.ts`

**Interfaces:**
- `POST /api/prescriptions` — body `UpsertPrescriptionInput`; upserts prescription + replaces items (only if status is `draft`)
- `POST /api/prescriptions/[id]/send` — sets status `sent_to_pharmacy`, `sent_to_pharmacy_at`, visit status `to_pharmacy`
- `PATCH /api/prescriptions/items/[id]` — body `{ dispensed: true, substituted_note?: string }`; updates prescription status to `partially_dispensed` or `dispensed`
- `POST /api/prescriptions/[id]/complete` — requires all items dispensed; visit status `completed`, `completed_at`

- [ ] **Step 1: Implement `src/app/api/prescriptions/route.ts`**

GET with `visit_id` query returns prescription with items or `null`.

POST upserts: find by `patient_visit_id`, if exists and not `draft` return 400, else delete old items and create new ones in transaction.

- [ ] **Step 2: Implement send route**

Verify prescription has ≥1 item. Update prescription + patient visit in transaction.

- [ ] **Step 3: Implement item PATCH**

Pharmacy role only. Set `dispensed_at` when `dispensed: true`. Recompute prescription status from item counts.

- [ ] **Step 4: Implement complete route**

Verify all items `dispensed`. Set visit `completed`.

- [ ] **Step 5: Update `canAccessApi` in `src/lib/auth.ts`**

```typescript
// GET /api/medicines, GET /api/prescriptions — doctor, pharmacy, admin, manager
// POST /api/prescriptions, POST .../send — doctor, admin, manager
// PATCH /api/prescriptions/items — pharmacy, admin, manager
// POST .../complete — pharmacy, admin, manager
// POST /api/medicines — admin, manager
```

---

### Task 5: Doctor prescription UI

**Files:**
- Create: `src/components/PrescriptionForm.tsx`
- Modify: `src/app/doctor/[id]/page.tsx`
- Modify: `src/lib/status.ts` (optional: hide raw "Send to Pharmacy" when Rx panel used)

**Interfaces:**
- Consumes: `GET /api/medicines?q=`, `GET /api/prescriptions?visit_id=`, `POST /api/prescriptions`, `POST /api/prescriptions/[id]/send`

- [ ] **Step 1: Build `PrescriptionForm` component**

Props: `{ visitId, doctorId, patientStatus }` — only render when status is `in_consultation` or `in_followup`.

Features:
- Load existing draft on mount
- Medicine search input (debounced fetch `/api/medicines?q=`)
- Add line form: dose, frequency (select OD/BD/TDS/QID/SOS), duration_days, quantity, instructions
- Editable list with remove line
- **Save draft** → POST `/api/prescriptions`
- **Send to pharmacy** → POST send (disabled if 0 items)

- [ ] **Step 2: Embed in doctor page below each `PatientCard` when consulting**

```tsx
{(visit.status === "in_consultation" || visit.status === "in_followup") && (
  <PrescriptionForm visitId={visit.id} doctorId={doctorId} />
)}
```

- [ ] **Step 3: Manual test**

Login as `doctor` → open patient in consultation → add 2 medicines → send → verify visit appears in pharmacy queue.

---

### Task 6: Pharmacy dispense UI

**Files:**
- Create: `src/components/PrescriptionDetail.tsx`
- Create: `src/app/pharmacy/[visitId]/page.tsx`
- Modify: `src/app/pharmacy/page.tsx`

- [ ] **Step 1: Update pharmacy queue cards**

Show badge: `Rx: 3 medicines (2 pending)` — fetch prescription per visit or batch endpoint.

Add **Open Rx** link → `/pharmacy/[visitId]`.

On first open, PATCH visit status to `at_pharmacy` if currently `to_pharmacy` (via existing `updatePatient`).

- [ ] **Step 2: Build `PrescriptionDetail` page**

- Patient header (name, token, doctor, room)
- Table of lines: medicine, dose, frequency, qty, instructions
- Per row: **Dispensed** toggle + optional substitution note field
- PATCH on toggle
- **Complete & exit** button (calls complete API) — disabled until all dispensed

- [ ] **Step 3: Manual test**

Login as `pharmacy` → open patient Rx → dispense all lines → complete → patient leaves queue.

---

### Task 7: Manager visibility + README

**Files:**
- Modify: `src/app/manager/page.tsx`
- Modify: `README.md`

- [ ] **Step 1: Manager pharmacy section**

Count visits with `to_pharmacy`/`at_pharmacy` and prescriptions with undispensed items.

- [ ] **Step 2: Document Phase 1 in README**

Add section: doctor Rx workflow, pharmacy dispense, `npm run db:seed-medicines`.

- [ ] **Step 3: Build verification**

```bash
npm run build
```

Expected: compile success, no TypeScript errors.

---

## Spec Coverage Check

| Spec requirement | Task |
|------------------|------|
| medicines catalog | Task 1, 3 |
| prescriptions + items | Task 1, 4 |
| Doctor write Rx | Task 5 |
| Pharmacy dispense lines | Task 6 |
| Manager pending count | Task 7 |
| Auth on APIs | Task 4 |
| Seed medicines | Task 3 |
| Visit status flow | Task 4, 6 |

## Execution Handoff

Plan complete. Implementation not started — awaiting execution choice.

**Option 1 — Subagent-driven:** fresh subagent per task, review between tasks  
**Option 2 — Inline:** implement all tasks in this session with checkpoints
