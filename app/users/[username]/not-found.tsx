import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProfileNotFound() {
  return (
    <main id="main" className="page-container flex flex-1 flex-col items-start justify-center gap-4 py-24">
      <p className="font-medium text-brand">Profile not found</p>
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Nobody by that name lives here.</h1>
      <p className="max-w-xl text-muted-foreground">The username may have changed, or the account may no longer exist.</p>
      <Button asChild size="lg" className="mt-2">
        <Link href="/">Explore stays</Link>
      </Button>
    </main>
  );
}
