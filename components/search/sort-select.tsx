"use client";

import { SORT_OPTIONS } from "@/lib/listings/constants";
import type { ListingFilters } from "@/lib/listings/search-params";
import { HiddenFilterFields } from "./hidden-filter-fields";

/** Sort order. Submits its GET form on change; the noscript button covers no-JS visitors. */
export function SortSelect({ filters }: { filters: ListingFilters }) {
  return (
    <form action="/" className="flex items-center gap-2">
      <HiddenFilterFields filters={filters} exclude={["sort"]} />
      <label htmlFor="sort" className="text-sm whitespace-nowrap text-muted-foreground">
        Sort by
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={filters.sort}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-10 rounded-lg border border-input bg-background pr-8 pl-3 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="h-10 rounded-lg border px-3 text-sm">
          Apply
        </button>
      </noscript>
    </form>
  );
}
