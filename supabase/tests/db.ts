import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

/**
 * Minimal stand-ins for the parts of Supabase the migrations depend on
 * (roles, auth.users, auth.uid(), storage buckets/objects). This lets the real
 * migration files and their RLS policies run in an in-process Postgres
 * (PGlite) without Docker. It does not emulate PostgREST, GoTrue or the
 * Storage API themselves.
 */
const SUPABASE_STUBS = /* sql */ `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create schema storage;
  create schema extensions;
  grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;

  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );

  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );

  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text not null,
    owner uuid default auth.uid()
  );
  alter table storage.objects enable row level security;
  grant select, insert, update, delete on storage.objects to anon, authenticated;

  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;

  -- Supabase's default privileges for objects created in public.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

export async function createTestDatabase() {
  const db = await PGlite.create({ extensions: { pg_trgm } });
  await db.exec(SUPABASE_STUBS);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  return db;
}

/** Creates an auth user; the on_auth_user_created trigger creates the profile. */
export async function createUser(db: PGlite, username: string) {
  const id = crypto.randomUUID();
  await db.query(
    "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)",
    [id, `${username}@example.com`, JSON.stringify({ username })],
  );
  return id;
}

/**
 * Runs `fn` the way a PostgREST request would: as the `anon` role, or as
 * `authenticated` with auth.uid() returning `userId`. Rolled back afterwards
 * unless `commit` is set.
 */
export async function asUser<T>(
  db: PGlite,
  userId: string | null,
  fn: (tx: Transaction) => Promise<T>,
  { commit = true }: { commit?: boolean } = {},
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`set local role ${userId ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    const result = await fn(tx);
    if (!commit) await tx.rollback();
    return result;
  });
}

export const validListing = {
  title: "Haunted Lighthouse With Opinions",
  description: "The foghorn critiques your outfit. Waves included at no extra charge.",
  property_type: "castle",
  city: "Nowhere-on-Sea",
  country: "Imaginaria",
  nightly_price: 120,
  cleaning_fee: 40,
  service_fee: 15,
  max_guests: 4,
  bedrooms: 2,
  beds: 3,
  bathrooms: 1.5,
  amenities: { standard: ["wifi", "heating"], custom: ["Resident ghost"] },
};

export async function insertListing(
  tx: Transaction,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const listing = { ...validListing, ...overrides };
  const columns = Object.keys(listing);
  const values = columns.map((column) => {
    const value = listing[column as keyof typeof listing];
    return typeof value === "object" && value !== null ? JSON.stringify(value) : value;
  });
  const { rows } = await tx.query<{ id: string }>(
    `insert into public.listings (${columns.join(", ")})
     values (${columns.map((_, i) => `$${i + 1}`).join(", ")})
     returning id`,
    values,
  );
  return rows[0].id;
}
