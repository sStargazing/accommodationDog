"use client";

import { Check, Copy, Share, Share2 } from "lucide-react";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const noSubscription = () => () => {};

export function ShareButton({ listingId, title, imageUrl }: { listingId: string; title: string; imageUrl?: string }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  // navigator only exists in the browser; the server snapshot (false) avoids a hydration mismatch.
  const canShareNatively = useSyncExternalStore(
    noSubscription,
    () => typeof navigator.share === "function",
    () => false,
  );

  // The canonical listing URL, without search dates.
  const url = () => `${window.location.origin}/listings/${listingId}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyFailed(true);
    }
  }

  async function shareNatively() {
    try {
      await navigator.share({ title, text: `${title}: a fictional stay on accommodationDog`, url: url() });
    } catch {
      // Dismissed by the user, or not allowed; nothing to do.
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Share className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Share</span>
          <span className="sr-only sm:hidden">Share this listing</span>
        </button>
      </DialogTrigger>
      <DialogContent className="gap-5 p-6 sm:max-w-md">
        <div className="grid gap-1">
          <DialogTitle className="text-xl font-semibold">Share this stay</DialogTitle>
          <DialogDescription>Spread the word about somewhere nobody can visit.</DialogDescription>
        </div>
        <div className="flex items-center gap-3">
          {imageUrl && (
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image src={imageUrl} alt="" fill sizes="64px" className="object-cover" />
            </div>
          )}
          <p className="line-clamp-2 font-medium">{title}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" size="lg" onClick={copyLink} className="justify-start text-[0.9375rem]">
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? "Link copied" : "Copy link"}
          </Button>
          {canShareNatively && (
            <Button variant="outline" size="lg" onClick={shareNatively} className="justify-start text-[0.9375rem]">
              <Share2 aria-hidden="true" />
              More options
            </Button>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? "Link copied to clipboard" : ""}
        </p>
        {copyFailed && (
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t access the clipboard. Copy this link instead:{" "}
            <span className="font-medium break-all text-foreground select-all">{url()}</span>
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
