-- Atomic listing writes.
--
-- A listing and its photos must change together: a listing with no photos, or
-- a half-applied reorder, should never be visible. PostgREST runs each request
-- in its own transaction, so these functions do the multi-row work in one.
--
-- All functions are SECURITY INVOKER: they run as the calling user, so the
-- existing Row Level Security policies, column grants, check constraints and
-- rate-limit triggers all still apply.

-- Replaces a listing's photo set with `images`, an ordered JSON array of
-- {"storage_path": text, "is_primary": boolean}. Returns the storage paths that
-- were detached, so the caller can delete those files.
create function public.save_listing_images(target_listing_id uuid, images jsonb)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  removed text[];
begin
  if jsonb_typeof(images) is distinct from 'array'
     or jsonb_array_length(images) not between 1 and 10 then
    raise exception 'A listing needs between 1 and 10 photos.' using errcode = '22023';
  end if;

  if (select count(*) from jsonb_array_elements(images) as e(value) where (e.value ->> 'is_primary')::boolean) <> 1 then
    raise exception 'Choose exactly one cover photo.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.listings where id = target_listing_id and user_id = (select auth.uid())
  ) then
    raise exception 'Listing not found.' using errcode = '42501';
  end if;

  select coalesce(array_agg(li.storage_path), '{}')
  into removed
  from public.listing_images li
  where li.listing_id = target_listing_id
    and li.storage_path not in (select e.value ->> 'storage_path' from jsonb_array_elements(images) as e(value));

  -- Replace rather than update in place: simpler than juggling the unique
  -- display_order and single-cover constraints mid-reorder.
  delete from public.listing_images where listing_id = target_listing_id;

  insert into public.listing_images (listing_id, storage_path, display_order, is_primary)
  select target_listing_id,
         e.value ->> 'storage_path',
         (e.ordinality - 1)::smallint,
         (e.value ->> 'is_primary')::boolean
  from jsonb_array_elements(images) with ordinality as e(value, ordinality);

  return removed;
end;
$$;

create function public.create_listing(listing jsonb, images jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.listings (
    title, description, property_type, city, country, nightly_price, cleaning_fee,
    service_fee, max_guests, bedrooms, beds, bathrooms, amenities
  )
  values (
    listing ->> 'title',
    listing ->> 'description',
    listing ->> 'property_type',
    listing ->> 'city',
    listing ->> 'country',
    (listing ->> 'nightly_price')::numeric,
    (listing ->> 'cleaning_fee')::numeric,
    (listing ->> 'service_fee')::numeric,
    (listing ->> 'max_guests')::integer,
    (listing ->> 'bedrooms')::integer,
    (listing ->> 'beds')::integer,
    (listing ->> 'bathrooms')::numeric,
    coalesce(listing -> 'amenities', '{"standard": [], "custom": []}'::jsonb)
  )
  returning id into new_id;

  perform public.save_listing_images(new_id, images);
  return new_id;
end;
$$;

-- Returns the storage paths of photos that were removed.
create function public.update_listing(target_listing_id uuid, listing jsonb, images jsonb)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.listings
  set title = listing ->> 'title',
      description = listing ->> 'description',
      property_type = listing ->> 'property_type',
      city = listing ->> 'city',
      country = listing ->> 'country',
      nightly_price = (listing ->> 'nightly_price')::numeric,
      cleaning_fee = (listing ->> 'cleaning_fee')::numeric,
      service_fee = (listing ->> 'service_fee')::numeric,
      max_guests = (listing ->> 'max_guests')::integer,
      bedrooms = (listing ->> 'bedrooms')::integer,
      beds = (listing ->> 'beds')::integer,
      bathrooms = (listing ->> 'bathrooms')::numeric,
      amenities = coalesce(listing -> 'amenities', '{"standard": [], "custom": []}'::jsonb)
  where id = target_listing_id and user_id = (select auth.uid());

  if not found then
    raise exception 'Listing not found.' using errcode = '42501';
  end if;

  return public.save_listing_images(target_listing_id, images);
end;
$$;

revoke execute on function public.save_listing_images(uuid, jsonb), public.create_listing(jsonb, jsonb),
  public.update_listing(uuid, jsonb, jsonb)
  from public, anon;
grant execute on function public.save_listing_images(uuid, jsonb), public.create_listing(jsonb, jsonb),
  public.update_listing(uuid, jsonb, jsonb)
  to authenticated;

-- Avatars must be files in the avatars bucket, in the format the app uploads
-- (<user id>/<random uuid>.<ext>), never arbitrary third-party URLs.
alter table public.profiles
  add constraint profiles_avatar_url_storage check (
    avatar_url ~ '^https?://[^/]+/storage/v1/object/public/avatars/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and strpos(avatar_url, '/avatars/' || id::text || '/') > 0
  );
