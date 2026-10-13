import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { LISTINGS_PAGE_SIZE, parseAmenities, type ListingAmenities } from "@/lib/listings/constants";
import { searchTermFilters, type ListingFilters } from "@/lib/listings/search-params";
import { LISTING_IMAGES_BUCKET, publicStorageUrl } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

// Public listing data is cached per query for a short time and shared by all
// visitors. Mutations (Phase 3/4) invalidate with updateTag("listings") etc.
const PUBLIC_CACHE = { stale: 30, revalidate: 60, expire: 3600 } as const;

export type ListingImage = { id: string; path: string; url: string; isPrimary: boolean };

export type ListingSummary = {
  id: string;
  title: string;
  city: string;
  country: string;
  propertyType: string;
  nightlyPrice: number;
  ratingAvg: number | null;
  reviewCount: number;
  image: ListingImage | null;
};

export type ListingSearchResult = {
  listings: ListingSummary[];
  total: number;
  page: number;
  pageCount: number;
};

type ImageRow = { id: string; storage_path: string; is_primary: boolean; display_order: number };

export const toImage = (row: ImageRow): ListingImage => ({
  id: row.id,
  path: row.storage_path,
  url: publicStorageUrl(LISTING_IMAGES_BUCKET, row.storage_path),
  isPrimary: row.is_primary,
});

/** Columns for a listing card. Callers limit listing_images to the cover photo. */
export const SUMMARY_SELECT =
  "id, title, city, country, property_type, nightly_price, rating_avg, review_count, listing_images(id, storage_path, is_primary, display_order)" as const;

type SummaryRow = {
  id: string;
  title: string;
  city: string;
  country: string;
  property_type: string;
  nightly_price: number;
  rating_avg: number | null;
  review_count: number;
  listing_images: ImageRow[];
};

export function toSummary(row: SummaryRow): ListingSummary {
  // Prefer the cover photo even if the query didn't sort images.
  const cover = [...row.listing_images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order,
  )[0];
  return {
    id: row.id,
    title: row.title,
    city: row.city,
    country: row.country,
    propertyType: row.property_type,
    nightlyPrice: Number(row.nightly_price),
    ratingAvg: row.rating_avg === null ? null : Number(row.rating_avg),
    reviewCount: row.review_count,
    image: cover ? toImage(cover) : null,
  };
}

export async function searchListings(filters: ListingFilters): Promise<ListingSearchResult> {
  "use cache";
  cacheTag("listings");
  cacheLife(PUBLIC_CACHE);

  const empty = { listings: [], total: 0, page: filters.page, pageCount: 0 };
  if (!isSupabaseConfigured) return empty;

  const from = (filters.page - 1) * LISTINGS_PAGE_SIZE;
  let query = createPublicClient()
    .from("listings")
    .select(SUMMARY_SELECT, { count: "exact" })
    .eq("status", "published")
    // Only the cover image: primary first, then by position.
    .order("is_primary", { referencedTable: "listing_images", ascending: false })
    .order("display_order", { referencedTable: "listing_images" })
    .limit(1, { referencedTable: "listing_images" });

  if (filters.q) for (const filter of searchTermFilters(filters.q)) query = query.or(filter);
  if (filters.type) query = query.eq("property_type", filters.type);
  if (filters.guests) query = query.gte("max_guests", filters.guests);
  if (filters.minPrice !== undefined) query = query.gte("nightly_price", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("nightly_price", filters.maxPrice);
  if (filters.amenities.length) query = query.contains("amenities", { standard: filters.amenities });
  if (filters.rating) query = query.gte("rating_avg", filters.rating);

  switch (filters.sort) {
    case "rating":
      query = query.order("rating_avg", { ascending: false, nullsFirst: false }).order("review_count", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "price_asc":
      query = query.order("nightly_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("nightly_price", { ascending: false });
      break;
    default:
      query = query
        .order("favourite_count", { ascending: false })
        .order("review_count", { ascending: false })
        .order("view_count", { ascending: false });
  }
  // Stable tie-break so pages never overlap.
  query = query.order("id").range(from, from + LISTINGS_PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) {
    // Asking for a page past the end is not an error worth surfacing.
    if (error.code === "PGRST103") return empty;
    throw new Error(`Failed to load listings: ${error.message}`);
  }

  const total = count ?? 0;
  return {
    listings: data.map(toSummary),
    total,
    page: filters.page,
    pageCount: Math.ceil(total / LISTINGS_PAGE_SIZE),
  };
}

export type ListingDetail = Omit<ListingSummary, "image"> & {
  description: string;
  cleaningFee: number;
  serviceFee: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: ListingAmenities;
  images: ListingImage[];
  createdAt: string;
  host: { id: string; username: string; avatarUrl: string | null; joinedAt: string };
};

const uuid = z.uuid();

export async function getListing(id: string): Promise<ListingDetail | null> {
  "use cache";
  cacheTag("listings", `listing:${id}`);
  cacheLife(PUBLIC_CACHE);

  if (!isSupabaseConfigured || !uuid.safeParse(id).success) return null;

  const { data, error } = await createPublicClient()
    .from("listings")
    .select(
      `id, title, description, property_type, city, country, nightly_price, cleaning_fee, service_fee,
       max_guests, bedrooms, beds, bathrooms, amenities, rating_avg, review_count, created_at,
       listing_images(id, storage_path, is_primary, display_order),
       host:profiles!listings_user_id_fkey(id, username, avatar_url, created_at)`,
    )
    .eq("id", id)
    .eq("status", "published")
    .order("display_order", { referencedTable: "listing_images" })
    .maybeSingle();

  if (error) throw new Error(`Failed to load listing: ${error.message}`);
  if (!data || !data.host) return null;

  // Primary image first, then the owner's chosen order.
  const images = [...data.listing_images]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order)
    .map(toImage);

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    propertyType: data.property_type,
    city: data.city,
    country: data.country,
    nightlyPrice: Number(data.nightly_price),
    cleaningFee: Number(data.cleaning_fee),
    serviceFee: Number(data.service_fee),
    maxGuests: data.max_guests,
    bedrooms: data.bedrooms,
    beds: data.beds,
    bathrooms: Number(data.bathrooms),
    amenities: parseAmenities(data.amenities),
    ratingAvg: data.rating_avg === null ? null : Number(data.rating_avg),
    reviewCount: data.review_count,
    images,
    createdAt: data.created_at,
    host: {
      id: data.host.id,
      username: data.host.username,
      avatarUrl: data.host.avatar_url,
      joinedAt: data.host.created_at,
    },
  };
}

export type Review = {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  author: { username: string; avatarUrl: string | null };
};

export async function getListingReviews(listingId: string): Promise<Review[]> {
  "use cache";
  cacheTag("reviews", `reviews:${listingId}`);
  cacheLife(PUBLIC_CACHE);

  if (!isSupabaseConfigured || !uuid.safeParse(listingId).success) return [];

  const { data, error } = await createPublicClient()
    .from("reviews")
    .select("id, rating, content, created_at, author:profiles!reviews_user_id_fkey(username, avatar_url)")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);

  return data.flatMap((row) =>
    row.author
      ? [{
          id: row.id,
          rating: row.rating,
          content: row.content,
          createdAt: row.created_at,
          author: { username: row.author.username, avatarUrl: row.author.avatar_url },
        }]
      : [],
  );
}
