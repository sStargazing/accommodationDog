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
2. Apply the schema: run each file in `supabase/migrations/` **in filename order**. Either paste each one into the **SQL Editor** (a new query per file) and run it, or use the CLI:
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

### 5. Seed development data (optional)

Fills the site with 12 fictional listings, 16 fictional users (with dog avatars), photos, reviews and favourites. Add your project's **secret key** to `.env.local` first:

```
SUPABASE_SECRET_KEY=sb_secret_...   # Project Settings → API Keys (or the legacy service_role key)
```

The secret key bypasses Row Level Security. Only the seed script uses it, and it never reaches the app or the browser. Never give it a `NEXT_PUBLIC_` prefix.

```bash
npm run seed              # skips if seed data already exists
npm run seed -- --reset   # deletes previous seed users, their listings and photos, then re-seeds
```

Seed users have `@seed.accommodationdog.invalid` emails and random passwords, so nobody can log in as them. Photos are downloaded from [Unsplash](https://unsplash.com/license) and stored in your project's Storage. Photographers are credited in `scripts/seed/data.mts`.

### Making someone an admin

Admins can open **/admin** (also linked from their account menu) to review reports and remove reported listings or reviews. Admins are listed in `public.admin_users`, which has no API access at all. Add one from the SQL editor:

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
| `npm run test:e2e` | Playwright tests against a production build, using local Google Chrome (`npx playwright install chrome` on CI). The listing tests skip themselves when the database has no listings; the create/edit/delete, review and moderation flows need `SUPABASE_SECRET_KEY` to create (and afterwards delete) throwaway test users. |
| `npm run seed` | Seed development data (see above) |

### About the database tests

`supabase/tests/` runs the real migration files in [PGlite](https://pglite.dev) (Postgres compiled to WebAssembly) with small stand-ins for Supabase's `auth` and `storage` schemas and roles. It checks RLS ownership rules, column privileges, constraints, rate limits, rating and favourite counters, and moderation access. It does not exercise the PostgREST, GoTrue or Storage services themselves.

## Architecture notes

- **The database is the security boundary.** The publishable key is public, so anyone can call the Supabase API directly. Row Level Security, column-level grants, check constraints and triggers in the migration enforce ownership and validity. Server Actions validate with Zod as well, for good error messages.
- **Ownership is never client-supplied.** `user_id` / `reporter_id` default to `auth.uid()` and are not granted for insert or update.
- **Counters are derived.** `rating_avg`, `review_count` and `favourite_count` are maintained by triggers, and `view_count` by `increment_listing_view()`. None are client-writable.
- **Rate limits** on listings (10/h), reviews (20/h) and reports (10/h) are enforced by `BEFORE INSERT` triggers, so they also apply to direct API calls. Auth endpoints use Supabase Auth's built-in rate limits.
- **Sessions.** `proxy.ts` (Next 16's replacement for middleware) refreshes the Supabase session cookie and does early redirects for protected routes. Pages and actions re-check the user through `lib/auth.ts`.
- **Cache Components.** Anything that reads the session (for example the header's account menu) renders inside `<Suspense>`, so pages keep a static shell that loads instantly.
- **Public data is cached.** Listing queries run through a cookie-free Supabase client inside `"use cache"` (tagged `listings`, `listing:<id>` and `reviews:<id>`, refreshed within about a minute), so shared listing links load fast. Per-user data such as favourites streams in separately.
- **Search and filters** are plain `GET` forms and links, so every result page has a shareable URL and works without JavaScript. Text search splits the query into words, and every word must match the title, city, country or description (case-insensitive, partial matches). Check-in and check-out dates only prefill the simulated booking card; there is no availability.
- **Listing writes are atomic.** `create_listing` / `update_listing` (SECURITY INVOKER database functions) save a listing and its photos in one transaction, so RLS, column grants, constraints and rate limits still apply, and a listing can never exist without photos or with a half-applied reorder.
- **Photo uploads** go straight from the browser to Supabase Storage via one-time signed upload URLs, which avoids serverless request-size limits. The server issues each URL only after checking the user, the declared type and the size, and it picks a random file name in the user's folder. Before a photo is attached to a listing (or an avatar to a profile), the server range-reads the file's first bytes to confirm it really is a JPEG, PNG or WebP under the size limit; anything else is deleted. Photos removed while editing are deleted from Storage when the listing is saved. Uploads abandoned mid-form are not cleaned up automatically yet.
- **The simulated booking** is entirely client-side: it calculates `nightly × nights + cleaning + service` and opens a joke dialog. It never sends a request (an e2e test checks this) and never asks for payment details.
- **Forms.** The auth and profile forms use Server Actions with `useActionState`, so they work before JavaScript loads. The multi-step listing form uses React Hook Form with the same Zod schema (`lib/validations/listing.ts`) that the server re-validates with.
- **Images** live in public-read Storage buckets (`listing-images`, `avatars`) under `<user id>/<random uuid>.<ext>`. Bucket limits enforce type (JPEG/PNG/WebP) and size (5 MB / 2 MB), and policies restrict writes to the owner's folder.
- **Reviews** are one per user per listing, never on your own listing (unique constraint + RLS), and the listing's rating and count are recalculated by a trigger. The listing page marks them as comedic, since nobody can actually stay.
- **Reporting and moderation.** Signed-in users can report a listing or review (one report per item per user, rate limited). Reports are readable only by admins. Removing reported content deletes it (with a listing's photos) and resolves every open report about it. Admin checks happen in the Server Action and again in RLS.
- **Social previews.** Each listing has a generated Open Graph image (`app/listings/[id]/opengraph-image.tsx`): cover photo, title, location, price, rating and a "Fictional listing" marker, served as a JPEG of about 120 KB so chat apps show it. The site has a default card too.
- **XSS.** User content is rendered through React's escaping only. Never use `dangerouslySetInnerHTML` for user content.

## Project structure

```text
app/                 Routes (App Router)
  (auth)/            login, signup, forgot-password, reset-password
  auth/confirm/      Email link handler
components/
  forms/             Form primitives, auth, profile and listing forms
  layout/            Header, footer, logo, user menu
  listings/          Cards, gallery, booking card, sharing, favourites
  search/            Search form, filters, sorting, pagination
  ui/                shadcn/ui components
lib/
  actions/           Server Actions (auth, listings, uploads, profile)
  queries/           Data reads (public cached, and per-user)
  images/            Upload verification
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
- [x] **Phase 2, Listing experience:** home feed, listing cards and detail page, galleries, search, filters, seed data. Favourite hearts, sharing and the simulated Reserve also work, because the card and detail designs include them.
- [x] **Phase 3, User-generated content:** multi-step create and edit form, photo uploads, deletion, public profiles, Edit profile, My Listings and Saved
- [x] **Phase 4, Social:** reviews (write, edit, delete), favourites, sharing with generated preview images, simulated booking, reporting and an admin moderation page
- [ ] **Phase 5, Polish and deployment:** metadata and OG images, sitemap, performance, Vercel deploy
