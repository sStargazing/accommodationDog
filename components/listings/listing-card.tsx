import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ListingSummary } from "@/lib/queries/listings";
import { formatPrice } from "@/lib/utils/format";
import { FavouriteButton } from "./favourite-button";
import { FictionalBadge } from "./fictional-badge";
import { Rating } from "./rating";

export function ListingCard({
  listing,
  href,
  priority = false,
}: {
  listing: ListingSummary;
  href: string;
  /** Eager-load the first row of cards (above the fold). */
  priority?: boolean;
}) {
  return (
    <article className="group relative">
      <div className="relative aspect-[20/19] overflow-hidden rounded-xl bg-muted">
        {listing.image ? (
          <Image
            src={listing.image.url}
            alt=""
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" aria-hidden="true" />
          </div>
        )}
        <FictionalBadge className="pointer-events-none absolute top-3 left-3" />
        {/* Above the stretched link so it stays clickable. */}
        <FavouriteButton listingId={listing.id} listingTitle={listing.title} className="absolute top-2 right-2 z-10" />
      </div>

      <div className="mt-3 grid gap-0.5 text-[0.9375rem]">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate font-semibold">
            {listing.city}, {listing.country}
          </p>
          <Rating value={listing.ratingAvg} count={listing.reviewCount} className="shrink-0 text-sm" />
        </div>
        <h3 className="line-clamp-1 text-muted-foreground">
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {listing.title}
          </Link>
        </h3>
        <p className="mt-1">
          <span className="font-semibold">{formatPrice(listing.nightlyPrice)}</span>{" "}
          <span className="text-muted-foreground">night</span>
        </p>
      </div>
    </article>
  );
}

export function ListingCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="aspect-[20/19] animate-pulse rounded-xl bg-muted" />
      <div className="mt-3 grid gap-2">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-4 w-1/4 rounded bg-muted" />
      </div>
    </div>
  );
}

export const LISTING_GRID_CLASS = "grid grid-cols-1 gap-x-6 gap-y-10 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
