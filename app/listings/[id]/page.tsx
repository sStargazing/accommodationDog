import { format, parseISO } from "date-fns";
import { Info, MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingCard } from "@/components/listings/booking-card";
import { FavouriteButton, FavouritesProvider } from "@/components/listings/favourite-button";
import { AmenityList, listingFacts } from "@/components/listings/listing-details";
import { ListingGallery } from "@/components/listings/listing-gallery";
import { Rating, Stars } from "@/components/listings/rating";
import { ShareButton } from "@/components/listings/share-button";
import { UserAvatar } from "@/components/listings/user-avatar";
import { PublishNotice } from "@/components/listings/publish-notice";
import { ViewTracker } from "@/components/listings/view-tracker";
import { ReportButton } from "@/components/moderation/report-button";
import { ReviewForm } from "@/components/reviews/review-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { propertyTypeLabel } from "@/lib/listings/constants";
import { getMyReview } from "@/lib/queries/account";
import { getFavouriteState } from "@/lib/queries/favourites";
import { getListing, getListingReviews, type ListingDetail } from "@/lib/queries/listings";
import { formatRating, pluralize } from "@/lib/utils/format";

export async function generateMetadata({ params }: PageProps<"/listings/[id]">): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Listing not found" };

  const description = `A fictional ${propertyTypeLabel(listing.propertyType).toLowerCase()} in ${listing.city}, ${listing.country}. ${listing.description}`
    .replace(/\s+/g, " ")
    .slice(0, 160);
  return {
    title: listing.title,
    description,
    alternates: { canonical: `/listings/${listing.id}` },
    openGraph: {
      type: "website",
      title: `${listing.title} · accommodationDog`,
      description,
      url: `/listings/${listing.id}`,
    },
    twitter: { card: "summary_large_image", title: listing.title, description },
  };
}

export default function ListingPage({ params }: PageProps<"/listings/[id]">) {
  return (
    <main id="main" className="flex-1 pb-28 lg:pb-0">
      <Suspense fallback={<ListingSkeleton />}>
        <ListingView params={params} />
      </Suspense>
    </main>
  );
}

async function ListingView({ params }: { params: PageProps<"/listings/[id]">["params"] }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  return (
    <FavouritesProvider state={getFavouriteState()}>
      <article className="page-container max-w-7xl pt-6 sm:pt-8">
        <ViewTracker listingId={listing.id} />
        <PublishNotice />

        <header className="grid gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{listing.title}</h1>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
              <Rating value={listing.ratingAvg} count={listing.reviewCount} showCount="long" />
              <span aria-hidden="true">·</span>
              <a href="#location" className="underline underline-offset-4">
                {listing.city}, {listing.country}
              </a>
            </p>
            <div className="-mr-3 flex items-center">
              <Suspense>
                <OwnerEditLink listingId={listing.id} hostId={listing.host.id} />
              </Suspense>
              <ShareButton listingId={listing.id} title={listing.title} imageUrl={listing.images[0]?.url} />
              <FavouriteButton listingId={listing.id} listingTitle={listing.title} variant="inline" />
            </div>
          </div>
        </header>

        <div className="mt-6">
          <ListingGallery images={listing.images} title={listing.title} />
        </div>

        <FictionalNotice />

        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-20">
          <div className="min-w-0">
            <Overview listing={listing} />
            <Section title="About this place">
              <p className="leading-relaxed whitespace-pre-line">{listing.description}</p>
            </Section>
            <Amenities listing={listing} />
          </div>

          <aside aria-label="Booking" className="lg:sticky lg:top-28 lg:self-start">
            <BookingCard
              title={listing.title}
              nightlyPrice={listing.nightlyPrice}
              cleaningFee={listing.cleaningFee}
              serviceFee={listing.serviceFee}
              maxGuests={listing.maxGuests}
              ratingAvg={listing.ratingAvg}
              reviewCount={listing.reviewCount}
            />
          </aside>
        </div>

        <Reviews listing={listing} />
        <Location listing={listing} />
        <div className="border-t py-6">
          <ReportButton targetType="listing" targetId={listing.id} />
        </div>
      </article>
    </FavouritesProvider>
  );
}

/** Shown only to the listing's owner. */
async function OwnerEditLink({ listingId, hostId }: { listingId: string; hostId: string }) {
  const user = await getCurrentUser();
  if (user?.id !== hostId) return null;
  return (
    <Button asChild variant="ghost" className="h-9 rounded-lg px-3">
      <Link href={`/listings/${listingId}/edit`}>
        <Pencil aria-hidden="true" />
        <span className="hidden sm:inline">Edit listing</span>
        <span className="sr-only sm:hidden">Edit listing</span>
      </Link>
    </Button>
  );
}

async function ReviewComposer({ listingId, hostId }: { listingId: string; hostId: string }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <p className="rounded-2xl border border-dashed px-5 py-4 text-sm">
        <Link
          href={`/login?next=${encodeURIComponent(`/listings/${listingId}#reviews`)}`}
          className="font-semibold underline underline-offset-4"
        >
          Log in
        </Link>{" "}
        to leave a review. No stay required, obviously.
      </p>
    );
  }
  if (user.id === hostId) {
    return (
      <p className="rounded-2xl border border-dashed px-5 py-4 text-sm text-muted-foreground">
        You can&apos;t review your own listing. We admire the confidence, though.
      </p>
    );
  }
  const existing = await getMyReview(listingId, user.id);
  // Remount after a save so the form shows the stored review.
  return <ReviewForm key={existing?.updatedAt ?? "new"} listingId={listingId} existing={existing} />;
}

function FictionalNotice() {
  return (
    <aside
      aria-label="Fictional listing notice"
      className="mt-6 flex gap-3 rounded-xl border border-brand/25 bg-brand/5 px-4 py-3.5 text-sm"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
      <p>
        <strong className="font-semibold">This is a fictional listing.</strong> The place, the host, the prices and the
        reviews are all made up for fun. Nothing here can be booked, paid for or visited.
      </p>
    </aside>
  );
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-heading` : undefined} className="scroll-mt-28 border-t py-8">
      <h2 id={id ? `${id}-heading` : undefined} className="mb-5 text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Overview({ listing }: { listing: ListingDetail }) {
  return (
    <div className="pb-8">
      <h2 className="text-xl font-semibold">
        {propertyTypeLabel(listing.propertyType)} in {listing.city}, {listing.country}
      </h2>
      <p className="mt-1 text-muted-foreground">{listingFacts(listing)}</p>

      <div className="mt-6 flex items-center gap-4 rounded-xl border p-4">
        <UserAvatar username={listing.host.username} avatarUrl={listing.host.avatarUrl} className="size-12" />
        <div>
          <p className="font-semibold">
            Hosted by{" "}
            <Link href={`/users/${listing.host.username}`} className="hover:underline">
              @{listing.host.username}
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Hosting imaginary guests since {format(parseISO(listing.host.joinedAt), "MMMM yyyy")}
          </p>
        </div>
      </div>
    </div>
  );
}

function Amenities({ listing }: { listing: ListingDetail }) {
  const { standard, custom } = listing.amenities;
  if (!standard.length && !custom.length) return null;

  return (
    <Section title="What this place offers">
      <AmenityList amenities={listing.amenities} />
    </Section>
  );
}

async function Reviews({ listing }: { listing: ListingDetail }) {
  const reviews = await getListingReviews(listing.id);
  const heading =
    listing.ratingAvg !== null && listing.reviewCount > 0
      ? `★ ${formatRating(listing.ratingAvg)} · ${pluralize(listing.reviewCount, "review")}`
      : "Reviews";

  return (
    <Section title={heading} id="reviews">
      <p className="-mt-3 mb-6 text-sm text-muted-foreground">
        Comedic reviews by fellow fantasists. Nobody has actually stayed here, because nobody can.
      </p>
      <div className="mb-10 max-w-2xl">
        {/* Depends on who's looking, so it streams in separately from the cached reviews. */}
        <Suspense fallback={<div className="h-14 rounded-2xl bg-muted/60" aria-hidden="true" />}>
          <ReviewComposer listingId={listing.id} hostId={listing.host.id} />
        </Suspense>
      </div>
      {reviews.length === 0 ? (
        <p className="rounded-xl border border-dashed px-6 py-10 text-center text-muted-foreground">
          No reviews yet. This place is so exclusive that not even imaginary guests have arrived.
        </p>
      ) : (
        <ul className="grid gap-x-16 gap-y-10 md:grid-cols-2">
          {reviews.map((review) => (
            <li key={review.id}>
              <div className="flex items-center gap-3">
                <UserAvatar username={review.author.username} avatarUrl={review.author.avatarUrl} />
                <div>
                  <p className="font-semibold">
                    <Link href={`/users/${review.author.username}`} className="hover:underline">
                      @{review.author.username}
                    </Link>
                  </p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Stars rating={review.rating} />
                    <time dateTime={review.createdAt}>{format(parseISO(review.createdAt), "MMMM yyyy")}</time>
                  </p>
                </div>
              </div>
              <p className="mt-3 leading-relaxed whitespace-pre-line">{review.content}</p>
              <ReportButton targetType="review" targetId={review.id} className="mt-2" />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Location({ listing }: { listing: ListingDetail }) {
  return (
    <Section title="Where you'll (not) be" id="location">
      <div className="flex items-start gap-4 rounded-xl bg-muted/60 p-5">
        <MapPin className="mt-0.5 size-6 shrink-0 text-brand" aria-hidden="true" />
        <div>
          <p className="font-semibold">
            {listing.city}, {listing.country}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            That&apos;s as precise as it gets. This listing is fictional, so there is no street address, no map pin and
            no front door.
          </p>
        </div>
      </div>
    </Section>
  );
}

function ListingSkeleton() {
  return (
    <div className="page-container max-w-7xl pt-6 sm:pt-8" aria-busy="true" aria-label="Loading listing">
      <div className="h-9 w-2/3 rounded bg-muted" />
      <div className="mt-3 h-5 w-1/3 rounded bg-muted" />
      <div className="mt-6 aspect-[4/3] animate-pulse rounded-2xl bg-muted md:aspect-auto md:h-[min(60vh,32rem)]" />
      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-20">
        <div className="grid content-start gap-3">
          <div className="h-6 w-1/2 rounded bg-muted" />
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="mt-6 h-20 rounded-xl bg-muted" />
        </div>
        <div className="h-80 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
