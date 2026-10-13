import Link from "next/link";
import { PROPERTY_TYPE_ICONS } from "@/components/listings/icons";
import { PROPERTY_TYPES } from "@/lib/listings/constants";
import { listingsHref, type ListingFilters } from "@/lib/listings/search-params";
import { cn } from "@/lib/utils";

/** Property-type shortcuts, Airbnb-style. Keeps other filters, resets the page. */
export function CategoryBar({ filters }: { filters: ListingFilters }) {
  const options = [{ value: undefined, label: "All stays" }, ...PROPERTY_TYPES];

  return (
    <nav aria-label="Property type" className="-mx-1 overflow-x-auto [scrollbar-width:none]">
      <ul className="flex min-w-max gap-1 px-1">
        {options.map(({ value, label }) => {
          const Icon = PROPERTY_TYPE_ICONS[value ?? "all"];
          const active = filters.type === value;
          return (
            <li key={label}>
              <Link
                href={listingsHref({ ...filters, type: value, page: 1 })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1.5 border-b-2 px-3 pt-2 pb-2.5 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
