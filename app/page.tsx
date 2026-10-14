import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Favourites } from "@/components/listings/favourites";
import { LISTING_GRID_CLASS, ListingCard, ListingCardSkeleton } from "@/components/listings/listing-card";
import { CategoryBar } from "@/components/search/category-bar";
import { FiltersDialog } from "@/components/search/filters-dialog";
import { Pagination } from "@/components/search/pagination";
import { SearchForm } from "@/components/search/search-form";
import { SortSelect } from "@/components/search/sort-select";
import { Button } from "@/components/ui/button";
import { propertyTypeLabel } from "@/lib/listings/constants";
import { parseListingFilters, type ListingFilters } from "@/lib/listings/search-params";
import { searchListings } from "@/lib/queries/listings";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Search and filter URLs all point search engines back to the plain home page.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <main id="main" className="flex-1">
      <section className="page-container pt-10 pb-8 sm:pt-14 sm:pb-10">
        <h1 className="max-w-3xl font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
          Unreal stays. <span className="text-brand">Unbelievable experiences.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-muted-foreground sm:text-lg">
          Crosbies, Sandays, Swifts, Waverlies, Ferntrees, Sheringhams, Perevils and places you won&apos;t find anywhere else. Find your next unforgettable
          stay.
        </p>
        <div className="mt-8">
          {/* Prefilled from the URL, so it streams in; the empty form is the static fallback. */}
          <Suspense fallback={<SearchForm />}>
            <PrefilledSearchForm searchParams={searchParams} />
          </Suspense>
        </div>
      </section>

      <Suspense fallback={<FeedSkeleton />}>
        <ListingFeed searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type SearchParamsPromise = PageProps<"/">["searchParams"];

async function PrefilledSearchForm({ searchParams }: { searchParams: SearchParamsPromise }) {
  return <SearchForm filters={parseListingFilters(await searchParams)} />;
}

async function ListingFeed({ searchParams }: { searchParams: SearchParamsPromise }) {
  const filters = parseListingFilters(await searchParams);
  const result = await searchListings(filters);

  return (
    <Favourites>
      <div className="sticky top-16 z-30 border-y bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85 sm:top-20">
        <div className="page-container flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <CategoryBar filters={filters} />
          </div>
          <div className="hidden md:block">
            <FiltersDialog filters={filters} />
          </div>
        </div>
      </div>

      <section aria-labelledby="results-heading" className="page-container py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 id="results-heading" aria-live="polite" className="text-lg font-semibold">
            {resultsHeading(filters, result.total)}
          </h2>
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <FiltersDialog filters={filters} />
            </div>
            <SortSelect filters={filters} />
          </div>
        </div>

        {result.listings.length > 0 ? (
          <>
            <div className={LISTING_GRID_CLASS}>
              {result.listings.map((listing, index) => (
                <ListingCard key={listing.id} listing={listing} href={listingHref(listing.id, filters)} priority={index < 4} />
              ))}
            </div>
            <div className="mt-12">
              <Pagination filters={filters} pageCount={result.pageCount} />
            </div>
          </>
        ) : (
          <EmptyState filtered={hasRefinements(filters)} />
        )}
      </section>
    </Favourites>
  );
}

function resultsHeading(filters: ListingFilters, total: number) {
  const noun = total === 1 ? "stay" : "stays";
  const type = filters.type ? ` · ${propertyTypeLabel(filters.type)}` : "";
  return filters.q ? `${total} ${noun} matching “${filters.q}”${type}` : `${total} ${noun}${type}`;
}

/** Carries search dates and guests through to the listing's booking card. */
function listingHref(id: string, filters: ListingFilters) {
  const params = new URLSearchParams();
  if (filters.checkIn) params.set("checkin", filters.checkIn);
  if (filters.checkOut) params.set("checkout", filters.checkOut);
  if (filters.guests) params.set("guests", String(filters.guests));
  const query = params.toString();
  return `/listings/${id}${query ? `?${query}` : ""}`;
}

function hasRefinements(filters: ListingFilters) {
  return Boolean(
    filters.q || filters.type || filters.guests || filters.minPrice !== undefined || filters.maxPrice !== undefined ||
      filters.amenities.length || filters.rating || filters.page > 1,
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
      <SearchX className="size-10 text-muted-foreground" aria-hidden="true" />
      {filtered ? (
        <>
          <p className="text-lg font-semibold">No stays match those filters.</p>
          <p className="max-w-md text-muted-foreground">Even our imagination has limits. Try fewer filters or a different search.</p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/">Clear all filters</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold">No listings yet.</p>
          <p className="max-w-md text-muted-foreground">
            {isSupabaseConfigured
              ? "There are no stays listed yet. Be the first to list one."
              : "Connect Supabase (see the README) to start browsing listings."}
          </p>
        </>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading stays">
      <div className="h-[4.5rem] border-y" />
      <div className="page-container py-8">
        <div className="mb-6 h-7 w-48 rounded bg-muted" />
        <div className={LISTING_GRID_CLASS}>
          {Array.from({ length: 8 }, (_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
