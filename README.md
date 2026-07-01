# OPD Manager

Guide every outpatient from **reception → doctor → lab/radiology → doctor follow-up → pharmacy → exit**, with live updates on a **TV display**.

**100% free stack:** Next.js on [Vercel](https://vercel.com) + PostgreSQL on [Neon](https://neon.tech) + [Prisma](https://prisma.io).

## Consoles

| URL | Who uses it |
|-----|-------------|
| `/reception` | Front desk — patient name, consultant, room, auto timestamp & token |
| `/doctor` | Each doctor — call, consult, send to lab / radiology / pharmacy |
| `/lab` | Lab staff — receive patient, set report ETA, send back to doctor |
| `/radiology` | Radiology — same as lab |
| `/pharmacy` | Final medicines + mark exit |
| `/tv` | Waiting room TV — calling, directions, report ETAs |
| `/manager` | Admin overview of all patients |

## Patient flow

```
Reception (registered)
    → Doctor calls (calling) → In consultation
        → Lab and/or Radiology (with ETA on TV)
        → Back to doctor (follow-up)
        → Pharmacy
        → Completed (exit)
```

Consoles and the TV screen refresh every 3 seconds — fast enough for clinic use.

## Free cloud setup (one-time, ~15 min)

### 1. Neon (database)

1. Create a free account at [neon.tech](https://neon.tech)
2. **New project** → copy the **connection string** (PostgreSQL)
3. Use the pooled connection string if offered (better for Vercel)

### 2. Local development

```bash
cp .env.local.example .env.local
# Paste your Neon DATABASE_URL

npm install
npm run db:push    # create tables
npm run db:seed    # add sample doctors
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Deploy to Vercel (free)

1. Push this repo to GitHub
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Add `DATABASE_URL` in Vercel **Settings → Environment Variables**
4. Deploy

After deploy, run once locally against production DB (or use Neon SQL console):

```bash
npm run db:push
npm run db:seed
```

Use your Vercel URL on every clinic PC/tablet/TV:

- Reception PC → `https://your-app.vercel.app/reception`
- Dr. Sharma tablet → `https://your-app.vercel.app/doctor`
- Waiting room TV → `https://your-app.vercel.app/tv` (press F11 full screen)

## Staff login (ID + password)

Each hospital gets role-based logins — reception, doctor, lab, etc. cannot open each other's screens.

### Create logins

After `db:push`, run:

```bash
npm run db:seed-users
```

Default accounts (change password in production via re-seed or DB update):

| User ID | Role | Opens |
|---------|------|--------|
| `admin` | Admin | All consoles |
| `manager` | Manager | Manager + Analytics |
| `reception` | Reception | Reception desk |
| `doctor` | Doctor | Doctor console |
| `lab` | Lab | Laboratory |
| `radiology` | Radiology | Radiology |
| `pharmacy` | Pharmacy | Pharmacy |
| `tv` | Display | Waiting room TV |

Default password: `Clinic@2026` (override with `SEED_USER_PASSWORD` in `.env.local`).

Add `SESSION_SECRET` to Vercel environment variables (long random string).

Staff sign in at `/login` — bookmarks should point to login, not directly to consoles.

## Pharmacy prescriptions (Phase 1)

Doctor writes medicines during consult → pharmacy dispenses line-by-line → patient exits.

```bash
npm run db:seed-medicines   # common medicine catalog for autocomplete
```

**Doctor:** open patient in consultation → **Write prescription** → **Send to pharmacy**  
**Pharmacy:** open patient → tick each medicine dispensed → **Complete & exit**

## Pharmacy stock (Phase 2)

Track inventory by batch and expiry. Stock deducts automatically when medicines are dispensed.

```bash
npm run db:push    # after pull — adds stock_batches table
```

**Stock** tab → view levels · **admin/manager/pharmacy** can add new medicines · batch no & expiry **required** when receiving stock  
Dispense is **blocked** if quantity is not available in stock.

Seed ~140 common generics: `npm run db:seed-medicines` (add more anytime from **Stock → Add new medicine**).

## Customize doctors

Add doctors via API or Prisma Studio:

```bash
npm run db:studio
```

Or insert in Neon SQL editor:

```sql
insert into doctors (id, name, room_number, specialty)
values (gen_random_uuid(), 'Dr. Your Name', '201', 'Pediatrics');
```

## Tech

- **Next.js 16** — web app for all consoles (responsive for mobile)
- **Neon** — serverless PostgreSQL (free tier)
- **Prisma** — database access & schema
- **Polling (3s)** — keeps TV and all consoles in sync

## License

MIT — use freely for your clinic.
