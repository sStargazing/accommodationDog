import "server-only";
import { z } from "zod";
import { parseAmenities } from "@/lib/listings/constants";
import { createClient } from "@/lib/supabase/server";
import type { ListingFormValues } from "@/lib/validations/listing";
import { SUMMARY_SELECT, toImage, toSummary, type ListingImage, type ListingSummary } from "./listings";

// Signed-in, per-user data. These use the request's session (so RLS returns
// the user's own rows, including drafts) and are never cached across users.

export type ManagedListing = ListingSummary & {
  status: string;
  viewCount: number;
  favouriteCount: number;
  createdAt: string;
};

export async function getMyListings(userId: string): Promise<ManagedListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(`${SUMMARY_SELECT}, status, view_count, favourite_count, created_at`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load your listings: ${error.message}`);

  return data.map((row) => ({
    ...toSummary(row),
    status: row.status,
    viewCount: row.view_count,
    favouriteCount: row.favourite_count,
    createdAt: row.created_at,
  }));
}

export type EditableListing = {
  id: string;
  values: Omit<ListingFormValues, "confirmFictional" | "confirmImageRights">;
  images: ListingImage[];
};

/** The listing as form values, or null if it doesn't exist or isn't the user's. */
export async function getEditableListing(id: string, userId: string): Promise<EditableListing | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(
      `id, title, description, property_type, city, country, nightly_price, cleaning_fee, service_fee,
       max_guests, bedrooms, beds, bathrooms, amenities, listing_images(id, storage_path, is_primary, display_order)`,
    )
    .eq("id", id)
    .eq("user_id", userId)
    .order("display_order", { referencedTable: "listing_images" })
    .maybeSingle();
  if (error) throw new Error(`Failed to load listing: ${error.message}`);
  if (!data) return null;

  const images = data.listing_images.map(toImage);
  const amenities = parseAmenities(data.amenities);
  return {
    id: data.id,
    images,
    values: {
      title: data.title,
      description: data.description,
      property_type: data.property_type as ListingFormValues["property_type"],
      city: data.city,
      country: data.country,
      max_guests: data.max_guests,
      bedrooms: data.bedrooms,
      beds: data.beds,
      bathrooms: Number(data.bathrooms),
      nightly_price: Number(data.nightly_price),
      cleaning_fee: Number(data.cleaning_fee),
      service_fee: Number(data.service_fee),
      amenities: {
        standard: amenities.standard as ListingFormValues["amenities"]["standard"],
        custom: amenities.custom,
      },
      images: images.map((image) => ({ path: image.path, isPrimary: image.isPrimary })),
    },
  };
}

/** The user's favourited, still-published listings, most recently saved first. */
export async function getSavedListings(userId: string): Promise<ListingSummary[]> {
  const supabase = await createClient();
  const { data: favourites, error } = await supabase
    .from("favourites")
    .select("listing_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load saved listings: ${error.message}`);
  if (!favourites.length) return [];

  const ids = favourites.map((favourite) => favourite.listing_id);
  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select(SUMMARY_SELECT)
    .in("id", ids)
    .eq("status", "published");
  if (listingsError) throw new Error(`Failed to load saved listings: ${listingsError.message}`);

  const byId = new Map(listings.map((row) => [row.id, toSummary(row)]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}
