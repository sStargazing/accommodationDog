import { z } from "zod";
import { AMENITIES, PROPERTY_TYPES, RATING_FILTERS, SORT_OPTIONS, type Amenity, type PropertyType, type SortOption } from "./constants";

export type ListingFilters = {
  q?: string;
  type?: PropertyType;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities: Amenity[];
  rating?: number;
  sort: SortOption;
  page: number;
  checkIn?: string;
  checkOut?: string;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

// Empty form fields arrive as "" and must not coerce to 0.
const first = (value: string | string[] | undefined) => {
  const single = Array.isArray(value) ? value[0] : value;
  return single?.trim() ? single : undefined;
};
const all = (value: string | string[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

// Each field is parsed independently; anything invalid is dropped rather than
// failing the whole search.
const text = z.string().trim().min(1).max(100).optional().catch(undefined);
const wholeNumber = (min: number, max: number) => z.coerce.number().int().min(min).max(max).optional().catch(undefined);
const price = z.coerce.number().min(0).max(1_000_000).optional().catch(undefined);
const isoDate = z.iso.date().optional().catch(undefined);

const propertyTypes = PROPERTY_TYPES.map((type) => type.value) as [PropertyType, ...PropertyType[]];
const amenityValues = new Set<string>(AMENITIES.map((amenity) => amenity.value));
const sortValues = SORT_OPTIONS.map((option) => option.value) as [SortOption, ...SortOption[]];

export function parseListingFilters(params: RawSearchParams): ListingFilters {
  const rating = z.coerce.number().optional().catch(undefined).parse(first(params.rating));
  const minPrice = price.parse(first(params.min_price));
  const maxPrice = price.parse(first(params.max_price));
  const checkIn = isoDate.parse(first(params.checkin));
  const checkOut = isoDate.parse(first(params.checkout));

  return {
    q: text.parse(first(params.q)),
    type: z.enum(propertyTypes).optional().catch(undefined).parse(first(params.type)),
    guests: wholeNumber(1, 50).parse(first(params.guests)),
    minPrice,
    // An inverted range is treated as "no maximum".
    maxPrice: minPrice !== undefined && maxPrice !== undefined && maxPrice < minPrice ? undefined : maxPrice,
    amenities: [...new Set(all(params.amenity))].filter((value): value is Amenity => amenityValues.has(value)),
    rating: RATING_FILTERS.find((value) => value === rating),
    sort: z.enum(sortValues).catch("popular").parse(first(params.sort) ?? "popular"),
    page: wholeNumber(1, 1000).parse(first(params.page)) ?? 1,
    checkIn,
    checkOut: checkIn && checkOut && checkOut <= checkIn ? undefined : checkOut,
  };
}

/** Serialises filters back into URL query parameters (defaults omitted). */
export function filtersToSearchParams(filters: Partial<ListingFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.checkIn) params.set("checkin", filters.checkIn);
  if (filters.checkOut) params.set("checkout", filters.checkOut);
  if (filters.guests) params.set("guests", String(filters.guests));
  if (filters.type) params.set("type", filters.type);
  if (filters.minPrice !== undefined) params.set("min_price", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("max_price", String(filters.maxPrice));
  for (const amenity of filters.amenities ?? []) params.append("amenity", amenity);
  if (filters.rating) params.set("rating", String(filters.rating));
  if (filters.sort && filters.sort !== "popular") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}

export function listingsHref(filters: Partial<ListingFilters>): string {
  const query = filtersToSearchParams(filters).toString();
  return query ? `/?${query}` : "/";
}

/** Number of refinements applied through the filters panel. */
export function countActiveFilters(filters: ListingFilters): number {
  return (
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    (filters.guests ? 1 : 0) +
    filters.amenities.length +
    (filters.rating ? 1 : 0)
  );
}

/**
 * Splits a free-text search into words and turns each into a PostgREST `or`
 * filter over the searchable columns. Every word must match at least one
 * column (the filters are ANDed by chaining `.or()` calls).
 */
export function searchTermFilters(term: string): string[] {
  const words = term
    // Characters with meaning in PostgREST filters or LIKE patterns.
    .replace(/[%_*\\"(),.:]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
  return words.map((word) =>
    ["title", "city", "country", "description"].map((column) => `${column}.ilike."%${word}%"`).join(","),
  );
}
