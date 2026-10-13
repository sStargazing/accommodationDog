"use client";

import { useEffect } from "react";
import { recordListingView } from "@/lib/actions/listings";

/** Counts one view per listing per browser session. */
export function ViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    const key = `viewed:${listingId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage unavailable (private mode): count the view anyway.
    }
    void recordListingView(listingId);
  }, [listingId]);

  return null;
}
