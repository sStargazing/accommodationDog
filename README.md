# accommodationDog

*Unreal stays. Unbelievable experiences.*

A parody accommodation marketplace. Users invent ridiculous places to stay, give them the full listing treatment and share them. **Every listing is fictional.** The site never takes payments, never collects card details and never creates real reservations.

## Stack

- **Next.js 16** (App Router, TypeScript, Cache Components, Turbopack)
- **Tailwind CSS v4** + **shadcn/ui** (Radix) + **Lucide** icons
- **Supabase**: Postgres, Auth, Storage
- **Zod** for validation, **Vitest** + **PGlite** for unit and database tests, **Playwright** for end-to-end tests

## Getting started

### 1. Install

Requires Node.js 20.9 or newer.

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. Apply the schema. Either paste `supabase/migrations/20261013000000_initial_schema.sql` into the **SQL Editor** and run it, or use the CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
3. Under **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000` (your production URL once deployed)
   - **Redirect URLs:** add `http://localhost:3000/**` and `https://<your-domain>/**`

   Sign-up confirmation and password-reset emails link to `/auth/confirm`, which handles both the default `?code=` links and `?token_hash=` links from custom email templates.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

| Variable | Where to find it | Exposed to browser |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API | yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API keys (publishable, or legacy `anon`) | yes (safe: RLS protects the data) |
| `NEXT_PUBLIC_SITE_URL` | Your app's public URL, no trailing slash | yes |

Never put the Supabase **secret / service_role** key in a `NEXT_PUBLIC_` variable. The app does not need it.

Without Supabase variables the app still builds and renders, but sign-up and log-in report that accounts aren't configured.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

### Making someone an admin

Admins are listed in `public.admin_users`, which has no API access at all. Add one from the SQL editor:

```sql
insert into public.admin_users (user_id)
select id from public.profiles where username = 'your_username';
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm test` | Unit tests and database/RLS tests (no Docker needed) |
| `npm run test:e2e` | Playwright tests against a production build, using local Google Chrome (`npx playwright install chrome` on CI) |

### About the database tests

`supabase/tests/` runs the real migration files in [PGlite](https://pglite.dev) (Postgres compiled to WebAssembly) with small stand-ins for Supabase's `auth` and `storage` schemas and roles. It checks RLS ownership rules, column privileges, constraints, rate limits, rating and favourite counters, and moderation access. It does not exercise the PostgREST, GoTrue or Storage services themselves.

## Architecture notes

- **The database is the security boundary.** The publishable key is public, so anyone can call the Supabase API directly. Row Level Security, column-level grants, check constraints and triggers in the migration enforce ownership and validity. Server Actions validate with Zod as well, for good error messages.
- **Ownership is never client-supplied.** `user_id` / `reporter_id` default to `auth.uid()` and are not granted for insert or update.
- **Counters are derived.** `rating_avg`, `review_count` and `favourite_count` are maintained by triggers, and `view_count` by `increment_listing_view()`. None are client-writable.
- **Rate limits** on listings (10/h), reviews (20/h) and reports (10/h) are enforced by `BEFORE INSERT` triggers, so they also apply to direct API calls. Auth endpoints use Supabase Auth's built-in rate limits.
- **Sessions.** `proxy.ts` (Next 16's replacement for middleware) refreshes the Supabase session cookie and does early redirects for protected routes. Pages and actions re-check the user through `lib/auth.ts`.
- **Cache Components.** Anything that reads the session (for example the header's account menu) renders inside `<Suspense>`, so pages keep a static shell that loads instantly.
- **Forms.** The auth forms use Server Actions with `useActionState`, so they work before JavaScript loads. React Hook Form is reserved for the multi-step create-listing form.
- **Images** live in public-read Storage buckets (`listing-images`, `avatars`) under `<user id>/<random uuid>.<ext>`. Bucket limits enforce type (JPEG/PNG/WebP) and size (5 MB / 2 MB), and policies restrict writes to the owner's folder.
- **XSS.** User content is rendered through React's escaping only. Never use `dangerouslySetInnerHTML` for user content.

## Project structure

```text
app/                 Routes (App Router)
  (auth)/            login, signup, forgot-password, reset-password
  auth/confirm/      Email link handler
components/
  forms/             Form primitives and auth forms
  layout/            Header, footer, logo, user menu
  ui/                shadcn/ui components
lib/
  actions/           Server Actions
  supabase/          Browser, server and proxy clients
  validations/       Zod schemas
  utils/             Helpers
  auth.ts            Data access layer for the current user
types/database.ts    Supabase types (regenerate with `supabase gen types`)
supabase/
  migrations/        SQL schema, RLS policies, storage buckets
  tests/             PGlite database tests
e2e/                 Playwright tests
proxy.ts             Session refresh + optimistic route protection
```

## Roadmap

- [x] **Phase 1, Foundation:** app shell, branding, schema and RLS, authentication
- [ ] **Phase 2, Listing experience:** home feed, listing cards and detail page, galleries, search, filters, seed data
- [ ] **Phase 3, User-generated content:** multi-step create form, uploads, editing, profiles, My Listings
- [ ] **Phase 4, Social:** reviews, favourites, sharing, simulated booking, reporting and moderation
- [ ] **Phase 5, Polish and deployment:** metadata and OG images, sitemap, performance, Vercel deploy
