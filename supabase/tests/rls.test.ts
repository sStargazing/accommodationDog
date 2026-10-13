import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, createUser, insertListing } from "./db";

let db: PGlite;
let usernameCounter = 0;
const newUser = () => createUser(db, `user_${++usernameCounter}`);

beforeAll(async () => {
  db = await createTestDatabase();
}, 60_000);

describe("profiles", () => {
  it("creates a profile from sign-up metadata", async () => {
    const id = await createUser(db, "Barkley");
    const { rows } = await db.query<{ username: string }>(
      "select username from public.profiles where id = $1",
      [id],
    );
    expect(rows[0].username).toBe("barkley");
  });

  it("rejects sign-ups with an invalid or duplicate username", async () => {
    await expect(createUser(db, "no spaces allowed")).rejects.toThrow(/profiles_username_format/);
    await expect(createUser(db, "barkley")).rejects.toThrow(/unique/);
  });

  it("is publicly readable but only self-editable", async () => {
    const alice = await newUser();
    const bob = await newUser();

    const visible = await asUser(db, null, (tx) =>
      tx.query("select id, username from public.profiles where id = $1", [alice]),
    );
    expect(visible.rows).toHaveLength(1);

    const hijack = await asUser(db, bob, (tx) =>
      tx.query("update public.profiles set username = 'hijacked' where id = $1", [alice]),
    );
    expect(hijack.affectedRows).toBe(0);

    await expect(
      asUser(db, alice, (tx) =>
        tx.query("update public.profiles set created_at = now() - interval '1 year' where id = $1", [alice]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("listings", () => {
  it("cannot be created by unauthenticated users", async () => {
    await expect(asUser(db, null, (tx) => insertListing(tx))).rejects.toThrow(/permission denied/);
  });

  it("are owned by the creator regardless of client input", async () => {
    const alice = await newUser();
    const bob = await newUser();

    const id = await asUser(db, alice, (tx) => insertListing(tx));
    const { rows } = await db.query<{ user_id: string }>("select user_id from public.listings where id = $1", [id]);
    expect(rows[0].user_id).toBe(alice);

    // Spoofing the owner column is refused outright.
    await expect(asUser(db, alice, (tx) => insertListing(tx, { user_id: bob }))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("cannot be edited or deleted by other users", async () => {
    const owner = await newUser();
    const intruder = await newUser();
    const id = await asUser(db, owner, (tx) => insertListing(tx));

    const update = await asUser(db, intruder, (tx) =>
      tx.query("update public.listings set title = 'Mine now' where id = $1", [id]),
    );
    const del = await asUser(db, intruder, (tx) => tx.query("delete from public.listings where id = $1", [id]));
    expect(update.affectedRows).toBe(0);
    expect(del.affectedRows).toBe(0);

    const ownUpdate = await asUser(db, owner, (tx) =>
      tx.query("update public.listings set title = 'Renamed' where id = $1", [id]),
    );
    expect(ownUpdate.affectedRows).toBe(1);
  });

  it("do not let owners write counters", async () => {
    const owner = await newUser();
    const id = await asUser(db, owner, (tx) => insertListing(tx));
    for (const column of ["view_count", "favourite_count", "review_count", "rating_avg"]) {
      await expect(
        asUser(db, owner, (tx) => tx.query(`update public.listings set ${column} = 5 where id = $1`, [id])),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it.each([
    ["title over 100 characters", { title: "x".repeat(101) }],
    ["blank title", { title: "   " }],
    ["description over 3000 characters", { description: "x".repeat(3001) }],
    ["unknown property type", { property_type: "spaceship" }],
    ["negative price", { nightly_price: -1 }],
    ["zero guests", { max_guests: 0 }],
    ["quarter bathrooms", { bathrooms: 1.25 }],
    ["six custom amenities", { amenities: { standard: [], custom: ["a", "b", "c", "d", "e", "f"] } }],
    ["amenities not an object", { amenities: ["wifi"] }],
  ])("reject %s", async (_label, overrides) => {
    const owner = await newUser();
    await expect(asUser(db, owner, (tx) => insertListing(tx, overrides))).rejects.toThrow(/check constraint|value too long/);
  });

  it("hide drafts from everyone except the owner", async () => {
    const owner = await newUser();
    const other = await newUser();
    const id = await asUser(db, owner, (tx) => insertListing(tx, { status: "draft" }));

    const select = "select id from public.listings where id = $1";
    expect((await asUser(db, null, (tx) => tx.query(select, [id]))).rows).toHaveLength(0);
    expect((await asUser(db, other, (tx) => tx.query(select, [id]))).rows).toHaveLength(0);
    expect((await asUser(db, owner, (tx) => tx.query(select, [id]))).rows).toHaveLength(1);
  });

  it("count views of published listings only", async () => {
    const owner = await newUser();
    const published = await asUser(db, owner, (tx) => insertListing(tx));
    const draft = await asUser(db, owner, (tx) => insertListing(tx, { status: "draft" }));

    for (const id of [published, draft]) {
      await asUser(db, null, (tx) => tx.query("select public.increment_listing_view($1)", [id]));
    }
    const { rows } = await db.query<{ id: string; view_count: number }>(
      "select id, view_count from public.listings where id = any($1)",
      [[published, draft]],
    );
    const views = Object.fromEntries(rows.map((r) => [r.id, r.view_count]));
    expect(views[published]).toBe(1);
    expect(views[draft]).toBe(0);
  });

  it("are rate limited per user", async () => {
    const spammer = await newUser();
    for (let i = 0; i < 10; i++) await asUser(db, spammer, (tx) => insertListing(tx));
    await expect(asUser(db, spammer, (tx) => insertListing(tx))).rejects.toThrow(/Rate limit exceeded/);
  });
});

describe("listing images", () => {
  const path = (owner: string) => `${owner}/${crypto.randomUUID()}.webp`;
  const insertImage = (listingId: string, storagePath: string, order: number) =>
    `insert into public.listing_images (listing_id, storage_path, display_order) values ('${listingId}', '${storagePath}', ${order})`;

  it("must come from the owner's storage folder", async () => {
    const owner = await newUser();
    const other = await newUser();
    const id = await asUser(db, owner, (tx) => insertListing(tx));

    await asUser(db, owner, (tx) => tx.query(insertImage(id, path(owner), 0)));
    await expect(asUser(db, owner, (tx) => tx.query(insertImage(id, path(other), 1)))).rejects.toThrow(
      /row-level security/,
    );
    await expect(asUser(db, other, (tx) => tx.query(insertImage(id, path(other), 1)))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("are capped at ten per listing", async () => {
    const owner = await newUser();
    const id = await asUser(db, owner, (tx) => insertListing(tx));
    await asUser(db, owner, async (tx) => {
      for (let i = 0; i < 10; i++) await tx.query(insertImage(id, path(owner), i));
    });
    await expect(asUser(db, owner, (tx) => tx.query(insertImage(id, path(owner), 10)))).rejects.toThrow(
      /listing_images_display_order_range/,
    );
  });

  it("can only be uploaded to the user's own storage folder", async () => {
    const owner = await newUser();
    const other = await newUser();
    const upload = (name: string) =>
      `insert into storage.objects (bucket_id, name) values ('listing-images', '${name}')`;

    await asUser(db, owner, (tx) => tx.query(upload(path(owner))));
    await expect(asUser(db, owner, (tx) => tx.query(upload(path(other))))).rejects.toThrow(/row-level security/);
    await expect(asUser(db, null, (tx) => tx.query(upload(path(owner))))).rejects.toThrow(/row-level security/);
  });
});

describe("reviews", () => {
  const review = (listingId: string, rating: number) =>
    `insert into public.reviews (listing_id, rating, content) values ('${listingId}', ${rating}, 'Would haunt again.')`;
  const ratingOf = async (id: string) =>
    (
      await db.query<{ rating_avg: string | null; review_count: number }>(
        "select rating_avg, review_count from public.listings where id = $1",
        [id],
      )
    ).rows[0];

  it("cannot be written about your own listing", async () => {
    const owner = await newUser();
    const id = await asUser(db, owner, (tx) => insertListing(tx));
    await expect(asUser(db, owner, (tx) => tx.query(review(id, 5)))).rejects.toThrow(/row-level security/);
  });

  it("are limited to one per user per listing", async () => {
    const owner = await newUser();
    const guest = await newUser();
    const id = await asUser(db, owner, (tx) => insertListing(tx));
    await asUser(db, guest, (tx) => tx.query(review(id, 4)));
    await expect(asUser(db, guest, (tx) => tx.query(review(id, 1)))).rejects.toThrow(/reviews_one_per_user/);
  });

  it("keep the listing rating up to date", async () => {
    const owner = await newUser();
    const [a, b] = [await newUser(), await newUser()];
    const id = await asUser(db, owner, (tx) => insertListing(tx));

    await asUser(db, a, (tx) => tx.query(review(id, 5)));
    await asUser(db, b, (tx) => tx.query(review(id, 2)));
    expect(await ratingOf(id)).toEqual({ rating_avg: "3.50", review_count: 2 });

    await asUser(db, b, (tx) => tx.query("update public.reviews set rating = 4 where listing_id = $1", [id]));
    expect(await ratingOf(id)).toEqual({ rating_avg: "4.50", review_count: 2 });

    // Another user's edit or delete is a no-op.
    const foreign = await asUser(db, a, (tx) =>
      tx.query("delete from public.reviews where listing_id = $1 and user_id = $2", [id, b]),
    );
    expect(foreign.affectedRows).toBe(0);

    await asUser(db, b, (tx) => tx.query("delete from public.reviews where listing_id = $1 and user_id = $2", [id, b]));
    expect(await ratingOf(id)).toEqual({ rating_avg: "5.00", review_count: 1 });

    await asUser(db, a, (tx) => tx.query("delete from public.reviews where listing_id = $1", [id]));
    expect(await ratingOf(id)).toEqual({ rating_avg: null, review_count: 0 });
  });
});

describe("favourites", () => {
  it("cannot be duplicated and keep the count accurate", async () => {
    const owner = await newUser();
    const fan = await newUser();
    const id = await asUser(db, owner, (tx) => insertListing(tx));
    const favourite = `insert into public.favourites (listing_id) values ('${id}')`;

    await asUser(db, fan, (tx) => tx.query(favourite));
    await expect(asUser(db, fan, (tx) => tx.query(favourite))).rejects.toThrow(/duplicate key/);
    await asUser(db, owner, (tx) => tx.query(favourite));

    const count = async () =>
      (await db.query<{ favourite_count: number }>("select favourite_count from public.listings where id = $1", [id]))
        .rows[0].favourite_count;
    expect(await count()).toBe(2);

    await asUser(db, fan, (tx) => tx.query("delete from public.favourites where listing_id = $1", [id]));
    expect(await count()).toBe(1);
  });

  it("are private to their owner", async () => {
    const owner = await newUser();
    const fan = await newUser();
    const snoop = await newUser();
    const id = await asUser(db, owner, (tx) => insertListing(tx));
    await asUser(db, fan, (tx) => tx.query(`insert into public.favourites (listing_id) values ('${id}')`));

    const seen = await asUser(db, snoop, (tx) => tx.query("select * from public.favourites where listing_id = $1", [id]));
    expect(seen.rows).toHaveLength(0);
  });
});

describe("reports and moderation", () => {
  it("are readable and actionable by admins only", async () => {
    const owner = await newUser();
    const reporter = await newUser();
    const admin = await newUser();
    await db.query("insert into public.admin_users (user_id) values ($1)", [admin]);

    const listingId = await asUser(db, owner, (tx) => insertListing(tx));
    await asUser(db, reporter, (tx) =>
      tx.query(
        "insert into public.reports (target_type, target_id, reason, details) values ('listing', $1, 'impersonation', 'Claims to be a real hotel')",
        [listingId],
      ),
    );

    const readReports = "select id from public.reports where target_id = $1";
    expect((await asUser(db, reporter, (tx) => tx.query(readReports, [listingId]))).rows).toHaveLength(0);
    expect((await asUser(db, owner, (tx) => tx.query(readReports, [listingId]))).rows).toHaveLength(0);
    expect((await asUser(db, admin, (tx) => tx.query(readReports, [listingId]))).rows).toHaveLength(1);

    // Users cannot promote themselves to admin.
    await expect(
      asUser(db, reporter, (tx) => tx.query("insert into public.admin_users (user_id) values ($1)", [reporter])),
    ).rejects.toThrow(/permission denied/);

    // The admin removes the listing and resolves the report.
    await asUser(db, admin, async (tx) => {
      const removed = await tx.query("delete from public.listings where id = $1", [listingId]);
      expect(removed.affectedRows).toBe(1);
      await tx.query("update public.reports set status = 'resolved' where target_id = $1", [listingId]);
    });
    const { rows } = await db.query<{ status: string }>("select status from public.reports where target_id = $1", [
      listingId,
    ]);
    expect(rows[0].status).toBe("resolved");
  });

  it("cannot be filed anonymously or twice", async () => {
    const owner = await newUser();
    const reporter = await newUser();
    const listingId = await asUser(db, owner, (tx) => insertListing(tx));
    const report = `insert into public.reports (target_type, target_id, reason) values ('listing', '${listingId}', 'other')`;

    await expect(asUser(db, null, (tx) => tx.query(report))).rejects.toThrow(/permission denied/);
    await asUser(db, reporter, (tx) => tx.query(report));
    await expect(asUser(db, reporter, (tx) => tx.query(report))).rejects.toThrow(/reports_one_per_reporter/);
  });
});

describe("listing write functions", () => {
  const listingJson = JSON.stringify({
    title: "Moon Base With Disappointing Gravity",
    description: "Low gravity, high expectations.",
    property_type: "other",
    city: "Tranquility",
    country: "The Moon",
    nightly_price: 999.99,
    cleaning_fee: 0,
    service_fee: 50,
    max_guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 0.5,
    amenities: { standard: ["wifi"], custom: ["Earthrise"] },
  });
  const photo = (owner: string) => `${owner}/${crypto.randomUUID()}.webp`;
  const imagesJson = (paths: string[], primary = 0) =>
    JSON.stringify(paths.map((storage_path, i) => ({ storage_path, is_primary: i === primary })));
  const imagesOf = async (id: string) =>
    (
      await db.query<{ storage_path: string; display_order: number; is_primary: boolean }>(
        "select storage_path, display_order, is_primary from public.listing_images where listing_id = $1 order by display_order",
        [id],
      )
    ).rows;

  it("create a listing and its photos atomically", async () => {
    const owner = await newUser();
    const paths = [photo(owner), photo(owner)];
    const { rows } = await asUser(db, owner, (tx) =>
      tx.query<{ id: string }>("select public.create_listing($1, $2) as id", [listingJson, imagesJson(paths, 1)]),
    );
    const id = rows[0].id;

    const listing = await db.query<{ user_id: string; nightly_price: string }>(
      "select user_id, nightly_price from public.listings where id = $1",
      [id],
    );
    expect(listing.rows[0]).toEqual({ user_id: owner, nightly_price: "999.99" });
    expect(await imagesOf(id)).toEqual([
      { storage_path: paths[0], display_order: 0, is_primary: false },
      { storage_path: paths[1], display_order: 1, is_primary: true },
    ]);
  });

  it("roll back the listing when the photos are invalid", async () => {
    const owner = await newUser();
    const other = await newUser();
    const count = async () =>
      Number((await db.query<{ n: string }>("select count(*) as n from public.listings where user_id = $1", [owner])).rows[0].n);

    const attempts = [
      [imagesJson([]), /between 1 and 10/],
      [imagesJson(Array.from({ length: 11 }, () => photo(owner))), /between 1 and 10/],
      [JSON.stringify([{ storage_path: photo(owner), is_primary: false }]), /exactly one cover/],
      [imagesJson([photo(other)]), /row-level security/],
    ] as const;
    for (const [images, error] of attempts) {
      await expect(
        asUser(db, owner, (tx) => tx.query("select public.create_listing($1, $2)", [listingJson, images])),
      ).rejects.toThrow(error);
    }
    expect(await count()).toBe(0);
  });

  it("cannot be called anonymously", async () => {
    await expect(
      asUser(db, null, (tx) => tx.query("select public.create_listing($1, $2)", [listingJson, imagesJson([])])),
    ).rejects.toThrow(/permission denied/);
  });

  it("update, reorder and report removed photos for the owner only", async () => {
    const owner = await newUser();
    const intruder = await newUser();
    const [a, b, c] = [photo(owner), photo(owner), photo(owner)];
    const id = (
      await asUser(db, owner, (tx) =>
        tx.query<{ id: string }>("select public.create_listing($1, $2) as id", [listingJson, imagesJson([a, b, c])]),
      )
    ).rows[0].id;

    const renamed = JSON.stringify({ ...JSON.parse(listingJson), title: "Moon Base, Now With Gravity" });
    const { rows } = await asUser(db, owner, (tx) =>
      tx.query<{ removed: string[] }>("select public.update_listing($1, $2, $3) as removed", [
        id,
        renamed,
        imagesJson([c, a], 0),
      ]),
    );
    expect(rows[0].removed).toEqual([b]);
    expect(await imagesOf(id)).toEqual([
      { storage_path: c, display_order: 0, is_primary: true },
      { storage_path: a, display_order: 1, is_primary: false },
    ]);

    await expect(
      asUser(db, intruder, (tx) =>
        tx.query("select public.update_listing($1, $2, $3)", [id, renamed, imagesJson([photo(intruder)])]),
      ),
    ).rejects.toThrow(/Listing not found/);
    const title = await db.query<{ title: string }>("select title from public.listings where id = $1", [id]);
    expect(title.rows[0].title).toBe("Moon Base, Now With Gravity");
  });
});

describe("avatars", () => {
  it("must point at the owner's folder in the avatars bucket", async () => {
    const user = await newUser();
    const other = await newUser();
    const avatar = (folder: string) =>
      `https://example.supabase.co/storage/v1/object/public/avatars/${folder}/${crypto.randomUUID()}.webp`;
    const setAvatar = (url: string) =>
      asUser(db, user, (tx) => tx.query("update public.profiles set avatar_url = $1 where id = $2", [url, user]));

    await setAvatar(avatar(user));
    await expect(setAvatar(avatar(other))).rejects.toThrow(/profiles_avatar_url_storage/);
    await expect(setAvatar("https://tracker.example/pixel.gif")).rejects.toThrow(/profiles_avatar_url_storage/);
  });
});
