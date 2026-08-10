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

## Multi-tenant setup (one-time, ~15 min)

This app is multi-tenant: every clinic's data is isolated by Postgres Row
Level Security (RLS), scoped by `clinic_id`. RLS only takes effect if **both**
of the following are done, in order — skipping either produces a
fully-functional-looking app with **zero data isolation**:

1. The `enable_rls` migration is actually applied (via `prisma migrate
   deploy`, never `prisma db push`, which skips migration history entirely).
2. The app's `DATABASE_URL` connects as the `app_user` Postgres role, not
   Neon's default owner role (see step 3 below) — Neon's default role has
   `BYPASSRLS`, which makes the RLS policies silently decorative.

### 1. Neon (database)

1. Create a free account at [neon.tech](https://neon.tech)
2. **New project** → copy the **connection string** (PostgreSQL) and the
   **direct** (unpooled) connection string
3. Use the pooled connection string for `DATABASE_URL` and the direct one for
   `DIRECT_URL` (Prisma needs a direct connection to run migrations)

### 2. Required environment variables

Create `.env.local` (there is no example file to copy — set these directly):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection string, used as `app_user` (step 3) once provisioned |
| `DIRECT_URL` | Unpooled/direct Postgres connection string, used for migrations and role provisioning (owner role) |
| `SESSION_SECRET` | Long random string for signing session cookies |
| `NEXT_PUBLIC_BASE_DOMAIN` | Root domain clinics are served under, e.g. `localhost` for local dev or `opdmanager.com` in production |
| `CLINIC_ID` | Set only when running seed/maintenance scripts (`db:seed`, `db:seed-users`, `db:seed-medicines`, `db:reset-doctors`); comes from `db:seed-clinic`'s output |
| `SEED_USER_PASSWORD` | Optional — overrides the default seeded staff password (`Clinic@2026`) |

### 3. Apply migrations and provision `app_user`

```bash
npm install
npx prisma migrate deploy   # applies schema AND the enable_rls policies
```

Then, connected as the privileged owner role (via `DIRECT_URL`, e.g. through
the Neon SQL console or `psql "$DIRECT_URL" -f prisma/sql/provision-app-user.sql`
after filling in a real password), run `prisma/sql/provision-app-user.sql`
once per database. This creates the `NOBYPASSRLS` `app_user` role the RLS
design depends on. Do this once per environment (dev, each Neon branch,
staging, production) — it is a manual, human-run step, not part of
`migrate deploy`. After it's run, point `DATABASE_URL` at a connection string
that authenticates as `app_user`.

### 4. Seed a clinic and staff logins

Every other seed script requires a clinic to already exist and `CLINIC_ID` to
be set — `db:seed-clinic` must run first:

```bash
npm run db:seed-clinic -- --slug=demo --name="Demo Clinic"
# copy the printed CLINIC_ID, then:
export CLINIC_ID=<the-printed-id>   # or set CLINIC_ID in .env.local

npm run db:seed          # sample doctors
npm run db:seed-users    # staff logins (admin/manager/reception/...)
npm run db:seed-medicines  # medicine catalog
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Each clinic is served from its own subdomain, e.g. `<slug>.<NEXT_PUBLIC_BASE_DOMAIN>`.
Set `NEXT_PUBLIC_BASE_DOMAIN=localhost` in `.env.local` for local dev and visit
clinics at `http://<slug>.localhost:3000` (e.g. `http://demo.localhost:3000`).

### 5. Deploy to Vercel (free)

1. Push this repo to GitHub
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Add `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, and
   `NEXT_PUBLIC_BASE_DOMAIN` (your production root domain, e.g.
   `opdmanager.com`) in Vercel **Settings → Environment Variables**
4. Deploy

Before the first deploy is usable, run steps 3 and 4 above once against the
production database (`npx prisma migrate deploy`, provision `app_user`, then
`db:seed-clinic` + the other seed scripts) — production environment
provisioning itself (creating the Neon project, setting Vercel env vars) is a
manual step owned by whoever operates that environment.

Use your Vercel URL on every clinic PC/tablet/TV:

- Reception PC → `https://<slug>.opdmanager.com/reception`
- Dr. Sharma tablet → `https://<slug>.opdmanager.com/doctor`
- Waiting room TV → `https://<slug>.opdmanager.com/tv` (press F11 full screen)

## Staff login (ID + password)

Each hospital gets role-based logins — reception, doctor, lab, etc. cannot open each other's screens.

### Create logins

After migrations are applied and a clinic exists (see setup steps 3-4 above,
`CLINIC_ID` set), run:

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
npx prisma migrate deploy    # after pull — adds stock_batches table + RLS policy
```

**Stock** tab → view levels · **admin/manager/pharmacy** can add new medicines · batch no & expiry **required** when receiving stock  
Dispense is **blocked** if quantity is not available in stock.

Seed ~140 common generics: `npm run db:seed-medicines` (add more anytime from **Stock → Add new medicine**).

## Pharmacy billing + GST (Phase 3)

After all medicines are dispensed, pharmacy generates a **GST bill** (cash / UPI / card). Rates from stock **MRP**; GST default **12%**.

**Analytics** shows today's pharmacy revenue and GST.

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
