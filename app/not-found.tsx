import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="page-container flex flex-1 flex-col items-start justify-center gap-4 py-24">
      <p className="font-medium text-brand">404</p>
      <h1 className="font-heading text-4xl font-semibold tracking-tight">We couldn&apos;t find that page.</h1>
      <p className="max-w-xl text-muted-foreground">
        We sniffed everywhere and couldn&apos;t find it. It may have been moved, deleted, or never existed at all.
      </p>
      <Button asChild size="lg" className="mt-2">
        <Link href="/">Back to the homepage</Link>
      </Button>
    </main>
  );
}
