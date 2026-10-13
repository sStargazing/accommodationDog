import { filtersToSearchParams, type ListingFilters } from "@/lib/listings/search-params";

type FilterParam = "q" | "checkin" | "checkout" | "guests" | "type" | "min_price" | "max_price" | "amenity" | "rating" | "sort";

/**
 * Carries the current filters through a GET form that only edits some of them.
 * `exclude` lists the params the form itself provides. Page always resets.
 */
export function HiddenFilterFields({ filters, exclude }: { filters: ListingFilters; exclude: FilterParam[] }) {
  const params = filtersToSearchParams({ ...filters, page: 1 });
  return (
    <>
      {[...params.entries()]
        .filter(([name]) => !exclude.includes(name as FilterParam))
        .map(([name, value], index) => (
          <input key={`${name}-${index}`} type="hidden" name={name} value={value} />
        ))}
    </>
  );
}
