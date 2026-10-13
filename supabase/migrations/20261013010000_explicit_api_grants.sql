-- Explicit read grants for the Data API.
--
-- The initial migration assumed Supabase's legacy default of granting ALL on
-- new public tables to anon/authenticated and only narrowed writes. Newer
-- projects grant nothing by default, so reads must be granted explicitly.
-- Row Level Security still decides which rows each role can see.

grant usage on schema public to anon, authenticated, service_role;

-- Public content: visible to visitors and signed-in users (subject to RLS).
grant select on public.profiles, public.listings, public.listing_images, public.reviews
  to anon, authenticated;

-- Private to signed-in users: own favourites; reports for admins (RLS).
grant select on public.favourites, public.reports to authenticated;

-- public.admin_users stays inaccessible to anon/authenticated.

-- Server-side admin tooling (never exposed to the browser).
grant all on all tables in schema public to service_role;
