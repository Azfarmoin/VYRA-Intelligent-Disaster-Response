# VYRA Setup Guide — cloud Supabase

**VYRA — Vulnerability, Yielded Response & Assistance.** This guide takes you from an empty
Supabase project to a running app with a full set of demo data and an administrator account.

| You want to… | Do this |
|---|---|
| Just look around, no accounts or cloud | `npm run dev:demo` (in-memory demo data, nothing to set up) |
| Run against a real cloud database with demo data | Follow this guide, Steps 1 to 6 |
| Put it online | Steps 1 to 6, then Step 8 |

## What you need

- Node.js 18 or newer and npm
- A free Supabase account: <https://supabase.com>
- About 10 minutes

## Step 1. Create the Supabase project

1. In the Supabase dashboard choose **New project**. Pick a region close to your users, and set a
   **database password**. Save it: you need it in Step 4 (or skip Step 4 and use the SQL Editor).
2. Wait until the project says it is ready.

## Step 2. Copy the project keys

In the dashboard open **Project Settings → API Keys** (older projects: **Settings → API**) and copy:

- **Project URL** (looks like `https://abcdxyz.supabase.co`)
- **Publishable key** (`sb_publishable_…`). The older **anon** key works too.

Never use the `service_role` / secret key in this app. It is not needed and must not reach the browser.

## Step 3. Install and configure the app

```bash
npm install
cp .env.example .env.local        # Windows PowerShell: copy .env.example .env.local
```

Open `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

Leave `VYRA_DATA_MODE` unset: with a Supabase URL present the app uses your cloud database.

## Step 4. Create the tables and load the demo data

You can do this one of two ways. Both give the same result.

### Option A: one command (recommended)

1. In the dashboard click **Connect** and copy the **Session pooler** connection string.
   Replace `[YOUR-PASSWORD]` with your database password (URL-encode special characters:
   `@` becomes `%40`, `#` becomes `%23`).
2. Add it to `.env.local`, plus a password for the demo accounts:

   ```env
   DATABASE_URL=postgresql://postgres.YOUR-PROJECT-REF:YOUR-PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
   SEED_PASSWORD=choose-something-long-and-unique
   ```

   If you skip `SEED_PASSWORD` every demo account uses the public default `VYRA-demo-1`.
3. Run:

   ```bash
   npm run db:setup -- --seed
   ```

   It creates the tables, loads the data and prints the account list and a row count per table.

### Option B: paste into the SQL Editor

Open **SQL Editor → New query**, paste a file, press **Run**, and repeat for the next file, in this order:

1. `supabase/vyra_complete_schema.sql` (tables, security rules)
2. `supabase/migrations/001_stage7_8_dispatch_offline.sql` (dispatch and offline sync)
3. `supabase/seed/vyra_full_seed.sql` (accounts and demo data)

Or skip all three and paste the single file `supabase/vyra_complete_setup.sql` (schema + migration + seed in one go).

Before step 3, find the line `seed_password TEXT := 'VYRA-demo-1';` near the top and put your own
password there. The final query of the seed lists a row count per table so you can check it worked.

### What the seed loads

All of it is fictional: an urban-flooding scenario across ten Karachi areas.

| Data | Count |
|---|---|
| Sign-in accounts (auth users + profiles) | 30: 1 administrator, 9 responders, 20 citizens |
| Emergency cases, every urgency level and status | 30, with 77 audit-history events |
| Rescue teams | 30 |
| Supply records (boats, vehicles, first aid, medical, food, water) | 30 |
| Shelters (three unverified, which stay off the map) | 30 |
| Route hazards / blocked roads | 30 / 30 |
| Missions (8 live, 16 completed, 6 cancelled) and their supply allocations | 30 / 30 |

Run it again at any time (`npm run db:seed`, or paste the file again). It removes the previous seed
rows and inserts them fresh with current timestamps, resets the demo account passwords, and leaves
reports and accounts that real people created untouched.

### The seeded accounts

| Role | Email | Name |
|---|---|---|
| **Administrator** | `admin@demo.vyra` | Amina Farooqui |
| Responder | `dispatcher@demo.vyra` | Hamza Siddiqui |
| Responder | `fieldlead@demo.vyra` | Sana Qureshi |
| Responder | `logistics@demo.vyra` | Waleed Khokhar |
| Citizen | `citizen@demo.vyra` | Bilal Ahmed |
| Citizen | `neighbour@demo.vyra` | Nida Hussain |

Password for all six: the `SEED_PASSWORD` you set, or `VYRA-demo-1` if you did not.

## Step 5. Configure sign-in in Supabase

Seeded accounts are already confirmed. For people who register through the app:

1. Open **Authentication → Sign In / Providers → Email** (older projects: **Authentication → Providers → Email**).
2. For a demo or hackathon, turn **Confirm email** off. Otherwise every new sign-up must click a
   confirmation link before they can sign in, and the app's register page sends them straight to the sign-in form.
3. For a real launch keep it on, and set **Authentication → URL Configuration → Site URL** to your
   deployed address.

## Step 6. Run it

```bash
npm run dev
```

Open <http://localhost:3000>, go to **Sign in**, and use `admin@demo.vyra`. You should land on the
dispatcher dashboard with the triage queue full of cases. Then check:

- `/map`: case markers, shelters, teams and blocked roads
- `/dispatches`: 8 live missions, plus completed and cancelled ones
- `/admin/users`: create and list accounts (administrators only)
- `/resources`: teams, supplies and shelters
- `/report`: submit a new case (works without signing in)

Quick API check: `curl http://localhost:3000/api/demo/auth` should print `{"demo":false}`, which
confirms the app is talking to Supabase and not the in-memory demo.

## Step 7. Make your own account the administrator

The register page never creates administrators. Register normally, then in the SQL Editor run:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
```

Sign out and back in. Responder access works the same way: set `role = 'responder'`. Until role checks are added (see the next section), this changes the landing page and the role shown, not what the account can do.

### Creating accounts from the website

Signed in as an administrator, open **Accounts** in the header (`/admin/users`). Enter a name, email, role
(citizen, responder or administrator) and a password (or press Generate), then **Create account**. The page shows the
sign-in details once so you can pass them on.

- Only administrators can use it: the API checks the caller's Supabase token and role on the server.
- **Optional but recommended:** add `SUPABASE_SERVICE_ROLE_KEY` (server only, never `NEXT_PUBLIC_`) to `.env.local` and to
  Vercel. The new account is then confirmed immediately. Without it the page falls back to ordinary sign-up, so with
  **Confirm email** on, the new person must click the emailed link before signing in.

## Step 8. Deploy (Vercel)

1. Push the project to GitHub and import it in Vercel.
2. Add the environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   Do not add `DATABASE_URL` or `SEED_PASSWORD` there: those are only for running the setup from your computer.
3. Deploy, then set Supabase **Site URL** (Step 5) to the Vercel address.

## Before anyone else can reach it

Read this before sharing a link.

- **The seeded accounts are for demos.** Their password is in this repository unless you changed it.
  On a project other people can open, set `SEED_PASSWORD` before seeding, or delete the accounts
  afterwards, in the SQL Editor:
  `UPDATE dispatches SET assigned_by = NULL WHERE assigned_by IN (SELECT id FROM profiles WHERE email LIKE '%@demo.vyra');`
  then `DELETE FROM auth.users WHERE email LIKE '%@demo.vyra';` then
  `DELETE FROM profiles WHERE email LIKE '%@demo.vyra';`.
- **Roles are not enforced yet.** Today a user's role decides where they land after sign-in
  (responders and admins go to `/dashboard`, citizens to the home page) and nothing more. No page, API
  route or database rule checks it, so the seeded administrator can do exactly what a citizen who types
  `/dashboard` into the address bar can do.
- **The database security rules are open.** `vyra_complete_schema.sql` creates Row Level Security
  policies that allow any request made with the publishable key to read and change every table,
  including the `role` on profiles. Anyone who calls the Supabase API directly can read all reports
  or promote themselves. That is acceptable for a prototype with simulated data. Before real emergency
  data goes in, add role checks to the API routes and tighten the policies (the schema defines
  `current_user_role()` for this).
- Reports contain contact details and locations. Use simulated data for public demos.

## Troubleshooting

| Problem | Fix |
|---|---|
| `DATABASE_URL is missing` | Add it to `.env.local` (Step 4, Option A). Use the **Session pooler** string, not the direct one. |
| `password authentication failed` | Wrong database password, or special characters not URL-encoded. You can reset it under **Project Settings → Database**. |
| `relation "profiles" does not exist` | The schema has not run yet. Run `vyra_complete_schema.sql` before the seed, or use `npm run db:setup -- --seed`. |
| `Invalid login credentials` | The seed has not run, or you are using the default password after setting a different `SEED_PASSWORD`. Run `npm run db:seed` again. |
| `Database error querying schema` on sign-in | Re-run the seed. It rebuilds the demo auth users with the empty token fields that sign-in needs. |
| New user registered but cannot sign in | Email confirmation is on (Step 5). Turn it off for demos, or confirm the email. |
| Pages are empty | Check `.env.local` values, restart `npm run dev` after editing it, and make sure the seed printed counts. |
| Sign-in page lists "Demo accounts" | The app is in demo mode: `NEXT_PUBLIC_SUPABASE_URL` is empty or `VYRA_DATA_MODE=demo` is set. |

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | App against your Supabase project |
| `npm run dev:demo` | App with in-memory demo data, no Supabase |
| `npm run db:setup` | Create or update the tables |
| `npm run db:setup -- --seed` | Tables plus the full seed |
| `npm run db:seed` | Reset the seed data and demo accounts only |
| `npm run db:seed:generate` | Rebuild `supabase/seed/vyra_full_seed.sql` after editing `src/lib/db/demoSeed.ts`, `demoOpsSeed.ts` or `demoAccounts.ts` |
| `npm test` | Triage engine and API tests |

## Project structure

```text
VYRA/
├── src/
│   ├── app/                 # Next.js App Router pages and API routes
│   ├── components/          # UI by feature (map, dashboard, reports, ...)
│   └── lib/                 # triage, matching, offline queue, database stores, demo data
├── supabase/
│   ├── vyra_complete_schema.sql          # tables, indexes, triggers, security rules
│   ├── migrations/                       # earlier step-by-step schema changes
│   └── seed/vyra_full_seed.sql           # accounts + full demo data (generated)
├── scripts/
│   ├── setup-db.js                       # npm run db:setup / db:seed
│   └── generate-seed-sql.ts              # builds the seed from the demo data
└── .env.example
```
