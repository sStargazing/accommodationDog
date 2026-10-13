-- accommodationDog — initial schema
--
-- Design notes
-- * Every table has Row Level Security enabled. The browser holds the public
--   (publishable/anon) key and can call PostgREST directly, so the policies,
--   column grants, check constraints and triggers below are the real security
--   boundary. Server actions validate too, but never as the only line of defence.
-- * Ownership columns (user_id, reporter_id) default to auth.uid() and are not
--   granted for insert/update, so clients can never supply them.
-- * Aggregates (rating, review/favourite counts, views) are maintained by
--   SECURITY DEFINER triggers/functions and are not client-writable.
-- * Admins are listed in public.admin_users, which has no API policies: rows are
--   added from the SQL editor or with the service role only.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Rejects an insert when the current user has created `max_rows` rows in
-- `table_name` within `window_interval`. Used as a BEFORE INSERT trigger:
--   enforce_rate_limit(<owner column>, <max rows>, <interval>)
create function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_column text := tg_argv[0];
  max_rows integer := tg_argv[1]::integer;
  window_interval interval := tg_argv[2]::interval;
  recent integer;
begin
  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - $2',
    tg_table_schema, tg_table_name, owner_column
  )
  into recent
  using (select auth.uid()), window_interval;

  if recent >= max_rows then
    raise exception 'Rate limit exceeded. Please try again later.'
      using errcode = 'P0429';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username varchar(30) not null unique
    constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,30}$'),
  avatar_url text
    constraint profiles_avatar_url_length check (char_length(avatar_url) <= 2048),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Public user profiles. Contains no private account data.';

-- Creates the profile when a user signs up. The username comes from the sign-up
-- metadata; an invalid or taken username aborts the sign-up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

create table public.admin_users (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is 'Verified administrators. Managed via SQL editor / service role only.';

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title varchar(100) not null
    constraint listings_title_length check (char_length(btrim(title)) between 1 and 100),
  description text not null
    constraint listings_description_length check (char_length(btrim(description)) between 1 and 3000),
  property_type varchar(20) not null
    constraint listings_property_type check (
      property_type in ('apartment', 'house', 'villa', 'hotel', 'cabin', 'castle', 'shared_room', 'other')
    ),
  city varchar(100) not null
    constraint listings_city_length check (char_length(btrim(city)) between 1 and 100),
  country varchar(100) not null
    constraint listings_country_length check (char_length(btrim(country)) between 1 and 100),
  nightly_price numeric(10, 2) not null
    constraint listings_nightly_price_range check (nightly_price between 0 and 1000000),
  cleaning_fee numeric(10, 2) not null default 0
    constraint listings_cleaning_fee_range check (cleaning_fee between 0 and 1000000),
  service_fee numeric(10, 2) not null default 0
    constraint listings_service_fee_range check (service_fee between 0 and 1000000),
  max_guests integer not null
    constraint listings_max_guests_range check (max_guests between 1 and 50),
  bedrooms integer not null
    constraint listings_bedrooms_range check (bedrooms between 0 and 50),
  beds integer not null
    constraint listings_beds_range check (beds between 0 and 100),
  bathrooms numeric(3, 1) not null
    constraint listings_bathrooms_range check (bathrooms between 0 and 50 and bathrooms * 2 = floor(bathrooms * 2)),
  -- { "standard": ["wifi", ...], "custom": ["Moat", ...] }
  amenities jsonb not null default '{"standard": [], "custom": []}'::jsonb
    constraint listings_amenities_shape check (
      jsonb_typeof(amenities) = 'object'
      and jsonb_typeof(amenities -> 'standard') = 'array'
      and jsonb_typeof(amenities -> 'custom') = 'array'
      and jsonb_array_length(amenities -> 'standard') <= 30
      and jsonb_array_length(amenities -> 'custom') <= 5
    ),
  status varchar(20) not null default 'published'
    constraint listings_status check (status in ('draft', 'published')),
  view_count integer not null default 0,
  favourite_count integer not null default 0,
  review_count integer not null default 0,
  rating_avg numeric(3, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_user_id_idx on public.listings (user_id);
create index listings_published_created_at_idx on public.listings (created_at desc) where status = 'published';
create index listings_nightly_price_idx on public.listings (nightly_price);
create index listings_rating_avg_idx on public.listings (rating_avg desc nulls last);
create index listings_favourite_count_idx on public.listings (favourite_count desc);
-- Case-insensitive partial-match search (ILIKE '%term%').
create index listings_title_trgm_idx on public.listings using gin (title extensions.gin_trgm_ops);
create index listings_city_trgm_idx on public.listings using gin (city extensions.gin_trgm_ops);
create index listings_country_trgm_idx on public.listings using gin (country extensions.gin_trgm_ops);
create index listings_description_trgm_idx on public.listings using gin (description extensions.gin_trgm_ops);

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

create trigger listings_rate_limit
  before insert on public.listings
  for each row execute function public.enforce_rate_limit('user_id', '10', '1 hour');

-- Counts a view of a published listing. Callable by anyone; the counter itself
-- is not client-writable.
create function public.increment_listing_view(target_listing_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.listings
  set view_count = view_count + 1
  where id = target_listing_id and status = 'published';
$$;

-- ---------------------------------------------------------------------------
-- Listing images
-- ---------------------------------------------------------------------------

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  -- <owner user id>/<random uuid>.<ext> inside the listing-images bucket
  storage_path text not null unique
    constraint listing_images_storage_path_format check (
      storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    ),
  display_order smallint not null
    constraint listing_images_display_order_range check (display_order between 0 and 9),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  -- 0..9 and unique => at most 10 images per listing. Deferred so images can be
  -- reordered inside one transaction.
  constraint listing_images_order_unique unique (listing_id, display_order) deferrable initially deferred
);

create unique index listing_images_one_primary_idx on public.listing_images (listing_id) where is_primary;

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  rating smallint not null
    constraint reviews_rating_range check (rating between 1 and 5),
  content text not null
    constraint reviews_content_length check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_one_per_user unique (listing_id, user_id)
);

create index reviews_listing_created_at_idx on public.reviews (listing_id, created_at desc);
create index reviews_user_id_idx on public.reviews (user_id);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create trigger reviews_rate_limit
  before insert on public.reviews
  for each row execute function public.enforce_rate_limit('user_id', '20', '1 hour');

create function public.refresh_listing_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected uuid := coalesce(new.listing_id, old.listing_id);
begin
  update public.listings l
  set review_count = s.review_count,
      rating_avg = s.rating_avg
  from (
    select count(*)::integer as review_count, round(avg(rating), 2) as rating_avg
    from public.reviews
    where listing_id = affected
  ) s
  where l.id = affected;
  return null;
end;
$$;

create trigger reviews_refresh_listing_rating
  after insert or update of rating or delete on public.reviews
  for each row execute function public.refresh_listing_rating();

-- ---------------------------------------------------------------------------
-- Favourites
-- ---------------------------------------------------------------------------

create table public.favourites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index favourites_listing_id_idx on public.favourites (listing_id);

create function public.refresh_listing_favourite_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected uuid := coalesce(new.listing_id, old.listing_id);
begin
  update public.listings
  set favourite_count = (select count(*) from public.favourites where listing_id = affected)
  where id = affected;
  return null;
end;
$$;

create trigger favourites_refresh_listing_count
  after insert or delete on public.favourites
  for each row execute function public.refresh_listing_favourite_count();

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  target_type varchar(10) not null
    constraint reports_target_type check (target_type in ('listing', 'review')),
  -- Polymorphic reference: listings.id or reviews.id depending on target_type.
  target_id uuid not null,
  reason varchar(30) not null
    constraint reports_reason check (
      reason in ('harassment', 'personal_information', 'copyright', 'impersonation', 'inappropriate', 'other')
    ),
  details text
    constraint reports_details_length check (char_length(details) <= 1000),
  status varchar(20) not null default 'open'
    constraint reports_status check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint reports_one_per_reporter unique (reporter_id, target_type, target_id)
);

create index reports_status_created_at_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);

create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.enforce_rate_limit('reporter_id', '10', '1 hour');

-- ---------------------------------------------------------------------------
-- Grants
--
-- Supabase grants ALL on new public tables to anon/authenticated by default.
-- Narrow writes to the columns clients may legitimately set; RLS then decides
-- which rows.
-- ---------------------------------------------------------------------------

revoke insert, update, delete, truncate, references, trigger
  on public.profiles, public.admin_users, public.listings, public.listing_images,
     public.reviews, public.favourites, public.reports
  from anon, authenticated;

revoke select on public.admin_users from anon, authenticated;

grant update (username, avatar_url) on public.profiles to authenticated;

grant insert (title, description, property_type, city, country, nightly_price, cleaning_fee,
              service_fee, max_guests, bedrooms, beds, bathrooms, amenities, status)
  on public.listings to authenticated;
grant update (title, description, property_type, city, country, nightly_price, cleaning_fee,
              service_fee, max_guests, bedrooms, beds, bathrooms, amenities, status)
  on public.listings to authenticated;
grant delete on public.listings to authenticated;

grant insert (listing_id, storage_path, display_order, is_primary) on public.listing_images to authenticated;
grant update (display_order, is_primary) on public.listing_images to authenticated;
grant delete on public.listing_images to authenticated;

grant insert (listing_id, rating, content) on public.reviews to authenticated;
grant update (rating, content) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;

grant insert (listing_id) on public.favourites to authenticated;
grant delete on public.favourites to authenticated;

grant insert (target_type, target_id, reason, details) on public.reports to authenticated;
grant update (status) on public.reports to authenticated;
grant delete on public.reports to authenticated;

revoke execute on function public.enforce_rate_limit, public.handle_new_user,
  public.refresh_listing_rating, public.refresh_listing_favourite_count
  from public, anon, authenticated;
grant execute on function public.increment_listing_view(uuid) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.reviews enable row level security;
alter table public.favourites enable row level security;
alter table public.reports enable row level security;

-- profiles
create policy "Profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- admin_users: no policies (service role / SQL editor only).

-- listings
create policy "Published listings are public; owners and admins see all"
  on public.listings for select
  to anon, authenticated
  using (
    status = 'published'
    or user_id = (select auth.uid())
    or (select public.is_admin())
  );

create policy "Users create listings as themselves"
  on public.listings for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Owners update their listings"
  on public.listings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Owners and admins delete listings"
  on public.listings for delete
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- listing_images (visibility follows the parent listing's RLS)
create policy "Images are visible with their listing"
  on public.listing_images for select
  to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));

create policy "Owners add images from their own folder"
  on public.listing_images for insert
  to authenticated
  with check (
    split_part(storage_path, '/', 1) = (select auth.uid())::text
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.user_id = (select auth.uid())
    )
  );

create policy "Owners update their images"
  on public.listing_images for update
  to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.user_id = (select auth.uid())));

create policy "Owners and admins delete images"
  on public.listing_images for delete
  to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.listings l where l.id = listing_id and l.user_id = (select auth.uid()))
  );

-- reviews
create policy "Reviews are visible with their listing"
  on public.reviews for select
  to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));

create policy "Users review other people's listings"
  on public.reviews for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.status = 'published'
        and l.user_id <> (select auth.uid())
    )
  );

create policy "Users update their own reviews"
  on public.reviews for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users and admins delete reviews"
  on public.reviews for delete
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- favourites
create policy "Users see their own favourites"
  on public.favourites for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users favourite visible listings"
  on public.favourites for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.listings l where l.id = listing_id and l.status = 'published')
  );

create policy "Users remove their own favourites"
  on public.favourites for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- reports
create policy "Users file reports as themselves"
  on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

create policy "Admins read reports"
  on public.reports for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins update reports"
  on public.reports for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete reports"
  on public.reports for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Storage
--
-- Objects are stored as <user id>/<random uuid>.<ext>. Buckets are public-read
-- so images can be served through next/image; writes are limited to the
-- owner's folder. Bucket limits enforce size and MIME type server-side.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users upload to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('listing-images', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users read their own folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('listing-images', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete from their own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('listing-images', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
