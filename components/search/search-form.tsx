import { Search } from "lucide-react";
import type { ListingFilters } from "@/lib/listings/search-params";
import { HiddenFilterFields } from "./hidden-filter-fields";

const fieldClass =
  "w-full min-w-0 bg-transparent text-[0.9375rem] text-foreground outline-none placeholder:text-muted-foreground";

/**
 * Destination / dates / guests search. A plain GET form, so it works before
 * JavaScript loads. Dates are carried through to listing pages to prefill the
 * (simulated) booking card; there is no real availability.
 */
export function SearchForm({ filters }: { filters?: ListingFilters }) {
  return (
    <form
      id="search"
      action="/"
      role="search"
      aria-label="Search stays"
      className="grid scroll-mt-28 overflow-hidden rounded-2xl border bg-background shadow-[0_6px_24px_rgb(0_0_0/0.08)] md:grid-cols-[1.6fr_1fr_1fr_0.9fr_auto] md:rounded-full"
    >
      {filters && <HiddenFilterFields filters={filters} exclude={["q", "checkin", "checkout", "guests"]} />}

      <label className="grid gap-0.5 px-5 py-3 focus-within:bg-muted/60 md:rounded-full md:px-7">
        <span className="text-xs font-semibold">Where</span>
        <input
          name="q"
          type="search"
          defaultValue={filters?.q}
          placeholder="Search destinations or vibes"
          maxLength={100}
          className={fieldClass}
        />
      </label>

      <label className="grid gap-0.5 border-t px-5 py-3 focus-within:bg-muted/60 md:rounded-full md:border-t-0 md:border-l md:px-6">
        <span className="text-xs font-semibold">Check in</span>
        <input name="checkin" type="date" defaultValue={filters?.checkIn} className={fieldClass} />
      </label>

      <label className="grid gap-0.5 border-t px-5 py-3 focus-within:bg-muted/60 md:rounded-full md:border-t-0 md:border-l md:px-6">
        <span className="text-xs font-semibold">Check out</span>
        <input name="checkout" type="date" defaultValue={filters?.checkOut} className={fieldClass} />
      </label>

      <label className="grid gap-0.5 border-t px-5 py-3 focus-within:bg-muted/60 md:rounded-full md:border-t-0 md:border-l md:px-6">
        <span className="text-xs font-semibold">Guests</span>
        <input
          name="guests"
          type="number"
          inputMode="numeric"
          min={1}
          max={50}
          defaultValue={filters?.guests}
          placeholder="Add guests"
          className={fieldClass}
        />
      </label>

      <div className="border-t p-3 md:border-t-0 md:p-2">
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground outline-none hover:bg-brand-hover focus-visible:ring-3 focus-visible:ring-ring/50 md:h-full md:min-h-12 md:rounded-full"
        >
          <Search className="size-4" aria-hidden="true" />
          <span>Search</span>
        </button>
      </div>
    </form>
  );
}
