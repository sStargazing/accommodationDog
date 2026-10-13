import { format, parseISO } from "date-fns";
import { Info, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingCard } from "@/components/listings/booking-card";
import { FavouriteButton, FavouritesProvider } from "@/components/listings/favourite-button";
import { AMENITY_ICONS, CUSTOM_AMENITY_ICON } from "@/components/listings/icons";
import { ListingGallery } from "@/components/listings/listing-gallery";
import { Rating, Stars } from "@/components/listings/rating";
import { ShareButton } from "@/components/listings/share-button";
import { UserAvatar } from "@/components/listings/user-avatar";
import { ViewTracker } from "@/components/listings/view-tracker";
import { amenityLabel, propertyTypeLabel } from "@/lib/listings/constants";
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
  const cover = listing.images[0];

  return {
    title: listing.title,
    description,
    alternates: { canonical: `/listings/${listing.id}` },
    openGraph: {
      type: "website",
      title: `${listing.title} · accommodationDog`,
      description,
      url: `/listings/${listing.id}`,
      images: cover ? [{ url: cover.url, alt: listing.title }] : undefined,
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
      </article>
    </FavouritesProvider>
  );
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
  const facts = [
    pluralize(listing.maxGuests, "guest"),
    pluralize(listing.bedrooms, "bedroom"),
    pluralize(listing.beds, "bed"),
    pluralize(listing.bathrooms, "bath"),
  ];

  return (
    <div className="pb-8">
      <h2 className="text-xl font-semibold">
        {propertyTypeLabel(listing.propertyType)} in {listing.city}, {listing.country}
      </h2>
      <p className="mt-1 text-muted-foreground">{facts.join(" · ")}</p>

      <div className="mt-6 flex items-center gap-4 rounded-xl border p-4">
        <UserAvatar username={listing.host.username} avatarUrl={listing.host.avatarUrl} className="size-12" />
        <div>
          <p className="font-semibold">Hosted by @{listing.host.username}</p>
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
      <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {standard.map((value) => {
          const Icon = AMENITY_ICONS[value] ?? CUSTOM_AMENITY_ICON;
          return (
            <li key={value} className="flex items-center gap-4">
              <Icon className="size-6 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              {amenityLabel(value)}
            </li>
          );
        })}
        {custom.map((value) => (
          <li key={`custom-${value}`} className="flex items-center gap-4">
            <CUSTOM_AMENITY_ICON className="size-6 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            {value}
          </li>
        ))}
      </ul>
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
                  <p className="font-semibold">@{review.author.username}</p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Stars rating={review.rating} />
                    <time dateTime={review.createdAt}>{format(parseISO(review.createdAt), "MMMM yyyy")}</time>
                  </p>
                </div>
              </div>
              <p className="mt-3 leading-relaxed whitespace-pre-line">{review.content}</p>
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
