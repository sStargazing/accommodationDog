import { Search } from "lucide-react";
import Link from "next/link";

/** Compact header search. The home page also has the full search form. */
export function HeaderSearch() {
  return (
    <>
      <form action="/" role="search" aria-label="Search fictional stays" className="hidden w-full max-w-sm md:block">
        <label className="flex h-11 items-center gap-2 rounded-full border bg-background pr-1.5 pl-5 shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
          <span className="sr-only">Search destinations</span>
          <input
            name="q"
            type="search"
            placeholder="Search destinations or vibes"
            maxLength={100}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none hover:bg-brand-hover focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Search className="size-4" aria-hidden="true" />
            <span className="sr-only">Search</span>
          </button>
        </label>
      </form>
      <Link
        href="/#search"
        className="flex size-10 items-center justify-center rounded-full border outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="sr-only">Search stays</span>
      </Link>
    </>
  );
}
