import { Eye, Heart, ImageOff, MessageSquare, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { DeleteListingButton } from "@/components/listings/delete-listing-button";
import { Rating } from "@/components/listings/rating";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getMyListings, type ManagedListing } from "@/lib/queries/account";
import { formatPrice, pluralize } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "My listings",
  robots: { index: false },
};

export default function MyListingsPage() {
  return (
    <main id="main" className="page-container max-w-5xl flex-1 py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">My listings</h1>
          <p className="mt-2 text-muted-foreground">Manage your listings and see how they&apos;re doing.</p>
        </div>
        <Button asChild>
          <Link href="/create">
            <Plus aria-hidden="true" />
            Create listing
          </Link>
        </Button>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <Listings />
      </Suspense>
    </main>
  );
}

async function Listings() {
  const user = await requireUser("/my-listings");
  const listings = await getMyListings(user.id);

  if (listings.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
        <p className="text-lg font-semibold">You haven&apos;t listed anywhere yet.</p>
        <p className="max-w-md text-muted-foreground">
          List your first place and it will appear here.
        </p>
        <Button asChild className="mt-2">
          <Link href="/create">Create your first listing</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="mt-8 text-sm text-muted-foreground">{pluralize(listings.length, "listing")}</p>
      <ul className="mt-3 grid gap-4">
        {listings.map((listing) => (
          <ManagedListingRow key={listing.id} listing={listing} />
        ))}
      </ul>
    </>
  );
}

function ManagedListingRow({ listing }: { listing: ManagedListing }) {
  const metrics = [
    { icon: Eye, label: "Views", value: listing.viewCount },
    { icon: Heart, label: "Saves", value: listing.favouriteCount },
    { icon: MessageSquare, label: "Reviews", value: listing.reviewCount },
  ];

  return (
    <li className="flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center">
      <Link
        href={`/listings/${listing.id}`}
        className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-40"
        tabIndex={-1}
        aria-hidden="true"
      >
        {listing.image ? (
          <Image src={listing.image.url} alt="" fill sizes="(min-width: 640px) 160px, 90vw" className="object-cover" />
        ) : (
          <ImageOff className="absolute inset-0 m-auto size-6 text-muted-foreground" />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <h2 className="truncate font-semibold">
          <Link href={`/listings/${listing.id}`} className="hover:underline">
            {listing.title}
          </Link>
        </h2>
        <p className="text-sm text-muted-foreground">
          {listing.city}, {listing.country} · {formatPrice(listing.nightlyPrice)} night
          {listing.status !== "published" && " · Draft"}
        </p>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {metrics.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="font-semibold tabular-nums">{value.toLocaleString("en-US")}</span>{" "}
                <span className="text-muted-foreground" aria-hidden="true">
                  {label.toLowerCase()}
                </span>
              </dd>
            </div>
          ))}
          <div className="flex items-center">
            <dt className="sr-only">Rating</dt>
            <dd>
              <Rating value={listing.ratingAvg} count={listing.reviewCount} />
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex gap-1 sm:flex-col sm:items-stretch">
        <Button asChild variant="outline">
          <Link href={`/listings/${listing.id}/edit`}>
            <Pencil aria-hidden="true" />
            Edit
            <span className="sr-only"> {listing.title}</span>
          </Link>
        </Button>
        <DeleteListingButton listingId={listing.id} title={listing.title} />
      </div>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="mt-11 grid gap-4" aria-busy="true" aria-label="Loading your listings">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-36 rounded-2xl bg-muted sm:h-32" />
      ))}
    </div>
  );
}
