"use client";

import { CircleCheck, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Confirmation after publishing or saving, driven by ?published=1 / ?updated=1. */
export function PublishNotice() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const published = searchParams.get("published") === "1";
  const updated = searchParams.get("updated") === "1";
  if (!published && !updated) return null;

  function dismiss() {
    const params = new URLSearchParams(searchParams);
    params.delete("published");
    params.delete("updated");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-600/25 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900">
      <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">
        {published ? (
          <>
            <strong className="font-semibold">Your listing is live.</strong> Share the link so everyone can admire a
            place they will never visit.
          </>
        ) : (
          <strong className="font-semibold">Your changes have been saved.</strong>
        )}
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-m-1 flex size-7 items-center justify-center rounded-md outline-none hover:bg-emerald-100 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
