import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ListingNotFound() {
  return (
    <main id="main" className="page-container flex flex-1 flex-col items-start justify-center gap-4 py-24">
      <p className="font-medium text-brand">Listing not found</p>
      <h1 className="font-heading text-4xl font-semibold tracking-tight">We couldn&apos;t find that listing.</h1>
      <p className="max-w-xl text-muted-foreground">
        It may have been removed by its host, or the link might be wrong. There are plenty of other places to
        explore.
      </p>
      <Button asChild size="lg" className="mt-2">
        <Link href="/">Explore stays</Link>
      </Button>
    </main>
  );
}
