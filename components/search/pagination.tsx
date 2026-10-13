import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { listingsHref, type ListingFilters } from "@/lib/listings/search-params";
import { cn } from "@/lib/utils";

/** Page numbers to show: first, last, and a window around the current page. */
function pageWindow(current: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((page, i) => (i > 0 && page - sorted[i - 1] > 1 ? ["gap" as const, page] : [page]));
}

export function Pagination({ filters, pageCount }: { filters: ListingFilters; pageCount: number }) {
  if (pageCount <= 1) return null;
  const current = Math.min(filters.page, pageCount);
  const linkClass =
    "flex size-10 items-center justify-center rounded-full text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      {current > 1 ? (
        <Link href={listingsHref({ ...filters, page: current - 1 })} className={linkClass} aria-label="Previous page">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className={cn(linkClass, "opacity-30")} aria-hidden="true">
          <ChevronLeft className="size-4" />
        </span>
      )}

      {pageWindow(current, pageCount).map((page, i) =>
        page === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={page}
            href={listingsHref({ ...filters, page })}
            aria-current={page === current ? "page" : undefined}
            aria-label={`Page ${page}`}
            className={cn(linkClass, page === current && "bg-foreground text-background hover:bg-foreground")}
          >
            {page}
          </Link>
        ),
      )}

      {current < pageCount ? (
        <Link href={listingsHref({ ...filters, page: current + 1 })} className={linkClass} aria-label="Next page">
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className={cn(linkClass, "opacity-30")} aria-hidden="true">
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
