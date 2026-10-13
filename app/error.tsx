"use client";

import { Button } from "@/components/ui/button";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="main" className="page-container flex flex-1 flex-col items-start justify-center gap-4 py-24">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Something went wrong.</h1>
      <p className="max-w-xl text-muted-foreground">
        We hit an unexpected problem loading this page. Please try again in a moment.
      </p>
      <Button size="lg" className="mt-2" onClick={() => retry()}>
        Try again
      </Button>
    </main>
  );
}
