import { format, parseISO } from "date-fns";
import { Heart, LayoutList, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Favourites } from "@/components/listings/favourites";
import { LISTING_GRID_CLASS, ListingCard } from "@/components/listings/listing-card";
import { UserAvatar } from "@/components/listings/user-avatar";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getProfile, getUserListings, type PublicProfile } from "@/lib/queries/profiles";
import { pluralize } from "@/lib/utils/format";

type Params = PageProps<"/users/[username]">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(decodeURIComponent(username));
  if (!profile) return { title: "Profile not found" };
  return {
    title: `@${profile.username}`,
    description: `Fictional stays hosted by @${profile.username} on accommodationDog.`,
    alternates: { canonical: `/users/${profile.username}` },
  };
}

export default function ProfilePage({ params }: PageProps<"/users/[username]">) {
  return (
    <main id="main" className="page-container flex-1 py-8 sm:py-12">
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile params={params} />
      </Suspense>
    </main>
  );
}

async function Profile({ params }: { params: Params }) {
  const { username } = await params;
  const profile = await getProfile(decodeURIComponent(username));
  if (!profile) notFound();
  const listings = await getUserListings(profile.id);

  return (
    <Favourites>
      <header className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <UserAvatar username={profile.username} avatarUrl={profile.avatarUrl} className="size-20 text-2xl sm:size-24" />
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight break-all">@{profile.username}</h1>
            <p className="mt-1 text-muted-foreground">
              Joined {format(parseISO(profile.joinedAt), "MMMM yyyy")} · {pluralize(listings.length, "listing")}
            </p>
          </div>
        </div>
        {/* Visible only to the profile's owner; the session streams in separately. */}
        <Suspense>
          <OwnerTools profile={profile} />
        </Suspense>
      </header>

      <section aria-labelledby="listings-heading" className="pt-8">
        <h2 id="listings-heading" className="mb-6 text-xl font-semibold">
          {listings.length ? `Stays hosted by @${profile.username}` : "No listings yet"}
        </h2>
        {listings.length > 0 ? (
          <div className={LISTING_GRID_CLASS}>
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} href={`/listings/${listing.id}`} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">@{profile.username} hasn&apos;t invented anywhere to stay. Yet.</p>
        )}
      </section>
    </Favourites>
  );
}

async function OwnerTools({ profile }: { profile: PublicProfile }) {
  const user = await getCurrentUser();
  if (user?.id !== profile.id) return null;

  return (
    <nav aria-label="Your account" className="flex flex-wrap gap-2">
      <Button asChild variant="outline">
        <Link href="/settings/profile">
          <Pencil aria-hidden="true" />
          Edit profile
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/my-listings">
          <LayoutList aria-hidden="true" />
          Manage listings
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/saved">
          <Heart aria-hidden="true" />
          Saved
        </Link>
      </Button>
    </nav>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading profile">
      <div className="flex items-center gap-5 border-b pb-8">
        <div className="size-20 rounded-full bg-muted sm:size-24" />
        <div className="grid gap-2">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
