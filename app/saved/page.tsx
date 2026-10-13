import { Heart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FavouritesProvider } from "@/components/listings/favourite-button";
import { LISTING_GRID_CLASS, ListingCard, ListingCardSkeleton } from "@/components/listings/listing-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getSavedListings } from "@/lib/queries/account";
import { getFavouriteState } from "@/lib/queries/favourites";
import { pluralize } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Saved",
  robots: { index: false },
};

export default function SavedPage() {
  return (
    <main id="main" className="page-container flex-1 py-8 sm:py-12">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Saved</h1>
      <p className="mt-2 text-muted-foreground">Places you&apos;d stay, if only they existed.</p>
      <Suspense
        fallback={
          <div className={`mt-10 ${LISTING_GRID_CLASS}`} aria-busy="true" aria-label="Loading saved listings">
            {Array.from({ length: 4 }, (_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <SavedListings />
      </Suspense>
    </main>
  );
}

async function SavedListings() {
  const user = await requireUser("/saved");
  const listings = await getSavedListings(user.id);

  if (listings.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
        <Heart className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-lg font-semibold">Nothing saved yet.</p>
        <p className="max-w-md text-muted-foreground">Tap the heart on any listing to keep it here for later daydreaming.</p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/">Explore stays</Link>
        </Button>
      </div>
    );
  }

  return (
    <FavouritesProvider state={getFavouriteState()}>
      <p className="mt-8 mb-6 text-sm text-muted-foreground">{pluralize(listings.length, "saved stay")}</p>
      <div className={LISTING_GRID_CLASS}>
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} href={`/listings/${listing.id}`} />
        ))}
      </div>
    </FavouritesProvider>
  );
}
