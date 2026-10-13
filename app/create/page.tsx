import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingForm } from "@/components/forms/listing/listing-form";
import { ListingFormSkeleton } from "@/components/forms/listing/listing-form-skeleton";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create a listing",
  robots: { index: false },
};

export default function CreateListingPage() {
  return (
    <main id="main" className="page-container max-w-3xl flex-1 py-8 sm:py-12">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Create a listing</h1>
      <p className="mt-2 mb-10 text-muted-foreground">
        Invent somewhere wonderful, ridiculous or both. It will appear on the site as a fictional listing.
      </p>
      <Suspense fallback={<ListingFormSkeleton />}>
        <SignedInForm />
      </Suspense>
    </main>
  );
}

async function SignedInForm() {
  await requireUser("/create");
  return <ListingForm mode="create" />;
}
