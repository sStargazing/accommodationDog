"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteListing } from "@/lib/actions/listings";

export function DeleteListingButton({ listingId, title }: { listingId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteListing(listingId);
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 aria-hidden="true" />
          Delete
          <span className="sr-only"> {title}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-4 p-6 sm:max-w-md">
        <DialogTitle className="text-lg font-semibold">Delete this listing?</DialogTitle>
        <DialogDescription className="text-foreground">
          <strong className="font-semibold">“{title}”</strong> will be removed for good, along with its photos, reviews
          and saves. This can&apos;t be undone.
        </DialogDescription>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter className="-mx-6 -mb-6 rounded-b-xl border-t bg-muted/50 p-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Keep it
            </Button>
          </DialogClose>
          <Button variant="destructive" className="bg-destructive text-white hover:bg-destructive/90" onClick={confirmDelete} disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {pending ? "Deleting…" : "Delete listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
