// Shared listing vocabulary. Values match the check constraints in
// supabase/migrations and are used by the seed script, so keep this file free
// of React or Next.js imports.

export const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "villa", label: "Villa" },
  { value: "hotel", label: "Hotel" },
  { value: "cabin", label: "Cabin" },
  { value: "castle", label: "Castle" },
  { value: "shared_room", label: "Shared room" },
  { value: "other", label: "Other" },
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number]["value"];

export const AMENITIES = [
  { value: "wifi", label: "Wi-Fi" },
  { value: "air_conditioning", label: "Air conditioning" },
  { value: "heating", label: "Heating" },
  { value: "kitchen", label: "Kitchen" },
  { value: "parking", label: "Parking" },
  { value: "pool", label: "Swimming pool" },
  { value: "gym", label: "Gym" },
  { value: "balcony", label: "Balcony" },
  { value: "tv", label: "Television" },
  { value: "washing_machine", label: "Washing machine" },
  { value: "pets_allowed", label: "Pets allowed" },
] as const;

export type Amenity = (typeof AMENITIES)[number]["value"];

export const MAX_CUSTOM_AMENITIES = 5;

export const SORT_OPTIONS = [
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const RATING_FILTERS = [3, 4, 4.5] as const;

export const LISTINGS_PAGE_SIZE = 24;

export function propertyTypeLabel(value: string): string {
  return PROPERTY_TYPES.find((type) => type.value === value)?.label ?? "Other";
}

export function amenityLabel(value: string): string {
  return AMENITIES.find((amenity) => amenity.value === value)?.label ?? value;
}

/** The `amenities` JSONB column: standard keys plus free-text custom amenities. */
export type ListingAmenities = { standard: string[]; custom: string[] };

export function parseAmenities(value: unknown): ListingAmenities {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const strings = (list: unknown) => (Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : []);
  return { standard: strings(record.standard), custom: strings(record.custom) };
}
