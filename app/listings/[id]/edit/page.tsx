import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingForm } from "@/components/forms/listing/listing-form";
import { ListingFormSkeleton } from "@/components/forms/listing/listing-form-skeleton";
import { requireUser } from "@/lib/auth";
import { getEditableListing } from "@/lib/queries/account";

export const metadata: Metadata = {
  title: "Edit listing",
  robots: { index: false },
};

export default function EditListingPage({ params }: PageProps<"/listings/[id]/edit">) {
  return (
    <main id="main" className="page-container max-w-3xl flex-1 py-8 sm:py-12">
      <Link href="/my-listings" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        ← My listings
      </Link>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Edit listing</h1>
      <p className="mt-2 mb-10 text-muted-foreground">Changes go live as soon as you save.</p>
      <Suspense fallback={<ListingFormSkeleton />}>
        <EditForm params={params} />
      </Suspense>
    </main>
  );
}

async function EditForm({ params }: { params: PageProps<"/listings/[id]/edit">["params"] }) {
  const { id } = await params;
  const user = await requireUser(`/listings/${id}/edit`);
  // Only the owner gets the listing back; anyone else sees a 404.
  const listing = await getEditableListing(id, user.id);
  if (!listing) notFound();

  return <ListingForm mode="edit" listingId={listing.id} initialValues={listing.values} />;
}
