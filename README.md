# accommodationDog

*Unreal stays. Unbelievable experiences.*

A parody accommodation marketplace. People invent ridiculous places to stay, give them the full listing treatment, and share them. **Every listing is fictional.** The site never takes payments, never collects card details and never creates real reservations.

**Live site:** [accommodation-dog.vercel.app](https://accommodation-dog.vercel.app)

## Features

- **Browse and search** listings by destination, dates and guests; filter by price, property type, amenities and rating; sort by popularity, rating, date or price.
- **Listing pages** with a photo gallery, amenities, host, reviews, a price calculator and a (simulated) Reserve button.
- **Create listings** in a five-step form with drag-and-drop photo uploads, custom amenities and a preview before publishing. Owners can edit or delete their listings and see views, saves and reviews.
- **Reviews**, **favourites** and **profiles**.
- **Sharing** with a copy-link button, the native share sheet and generated social preview images.
- **Reporting and moderation:** anyone signed in can report a listing or review; admins review reports at `/admin`.

## Tech stack

- **Next.js 16** (App Router, TypeScript, Cache Components)
- **Tailwind CSS v4**, **shadcn/ui** (Radix) and **Lucide** icons
- **Supabase** for Postgres, authentication and image storage
- **React Hook Form** and **Zod** for forms and validation
- **Vitest** and **PGlite** for unit and database tests, **Playwright** for end-to-end tests

## Deploying to Vercel

1. Create a project at [supabase.com](https://supabase.com/dashboard) and run each file in `supabase/migrations/` in filename order in the **SQL Editor**.
2. In [Vercel](https://vercel.com/new), import the repository. The Next.js preset works as is.
3. Add the environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `NEXT_PUBLIC_SITE_URL` is optional: without it, the Vercel production URL is used. Don't add the secret key; the app doesn't use it.
4. Deploy. The build prerenders popular listing pages, so the Supabase variables must be available at build time.
5. In Supabase, under **Authentication → URL Configuration**, set the **Site URL** to the production URL and add `https://<your-domain>/**` to **Redirect URLs**.

Supabase's built-in email sender only allows a few emails per hour. For anything beyond testing, configure custom SMTP under **Authentication → Emails**.

### Admins

Admins can moderate reports at `/admin`. They're listed in the `admin_users` table, which isn't reachable through the API; add one from the Supabase SQL editor:

```sql
insert into public.admin_users (user_id)
select id from public.profiles where username = 'their_username';
```

## Scripts and tests

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types, then type-check |
| `npm test` | Unit tests and database tests (no Docker needed) |
| `npm run test:e2e` | End-to-end tests in Google Chrome against a production build |
| `npm run seed` | Add sample listings, users and reviews (needs `SUPABASE_SECRET_KEY`) |

**Database tests** (`supabase/tests/`) run the real migrations in [PGlite](https://pglite.dev), an in-process Postgres, with small stand-ins for Supabase's `auth` and `storage` schemas. They check ownership rules, permissions, constraints, rate limits, rating and favourite counts, and moderation access.

**End-to-end tests** (`e2e/`) need a Supabase project with listings (e.g. after `npm run seed`). The create, review and moderation flows also need `SUPABASE_SECRET_KEY`: they create throwaway users and delete them afterwards. Tests whose requirements aren't met are skipped.

## How it works

- **The database is the security boundary.** The publishable key is public, so anyone can call the Supabase API directly. Row Level Security, column-level grants, check constraints and triggers enforce ownership and validity; Server Actions validate with Zod as well, for clear error messages.
- **Ownership is never client-supplied.** Owner columns default to the signed-in user and can't be set or changed by clients.
- **Derived data stays consistent.** Ratings, review counts, favourite counts and view counts are maintained by the database and aren't client-writable.
- **Rate limits** on new listings, reviews and reports are enforced in the database, so they also apply to direct API calls. Supabase Auth rate-limits sign-ups and logins.
- **Listings and their photos are saved atomically** through database functions, so a listing never exists without photos or with a half-finished reorder.
- **Photo uploads** go straight from the browser to Supabase Storage through one-time signed upload URLs. The server issues each URL only after checking the user, file type and size, and chooses a random file name in the user's own folder. Before a photo is attached to a listing, the server reads its first bytes to confirm it really is a JPEG, PNG or WebP under 5 MB.
- **Sessions** are refreshed by `proxy.ts`, which also redirects signed-out visitors away from private pages. Pages and actions re-check the user on the server.
- **Fast pages.** Public data is cached and shared between visitors; popular listing pages are prerendered, and the rest are cached after their first visit. Anything that depends on the visitor (favourite hearts, the review form, owner controls) streams in separately so pages stay static.
- **Search and filters** are plain links and `GET` forms, so every results page has a shareable URL and works without JavaScript. Dates only prefill the booking card; there's no availability calendar.
- **The booking is simulated.** Reserve calculates nightly price × nights + cleaning fee + service fee and shows a joke confirmation. It never contacts the server or asks for payment details (an end-to-end test checks this).
- **Sharing.** Each listing has a generated social preview image, and link-preview crawlers (WhatsApp, iMessage, Slack and others) receive full metadata. There's also a sitemap and `robots.txt`.
- **Safety.** User content is only rendered through React's escaping. Security headers block framing and MIME sniffing.

## Project structure

```text
app/                 Pages and routes
  (auth)/            Log in, sign up, password reset
  admin/             Moderation
  listings/[id]/     Listing page, edit page, social preview image
components/
  forms/             Form building blocks; auth, profile and listing forms
  layout/            Header, footer, logo, account menu
  listings/          Cards, gallery, booking card, sharing, favourites
  moderation/        Reporting and moderation controls
  reviews/           Review form
  search/            Search, filters, sorting, pagination
  ui/                shadcn/ui components
lib/
  actions/           Server Actions
  queries/           Data reads
  supabase/          Supabase clients
  validations/       Zod schemas
supabase/
  migrations/        Schema, security policies, storage buckets
  tests/             Database tests
scripts/seed/        Sample data
e2e/                 End-to-end tests
proxy.ts             Session refresh and route protection
```

## Credits

Sample photos are from [Unsplash](https://unsplash.com/license); photographers are credited in `scripts/seed/data.mts`. The places, hosts and reviews are entirely made up.
