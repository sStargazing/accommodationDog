"use client";

import { Loader2, Pencil, Star, Trash2 } from "lucide-react";
import { useActionState, useId, useState, useTransition } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Stars } from "@/components/listings/rating";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteReview, saveReview } from "@/lib/actions/social";
import type { OwnReview } from "@/lib/queries/account";
import { cn } from "@/lib/utils";
import { initialFormState } from "@/lib/validations/form-state";
import { REVIEW_MAX_LENGTH } from "@/lib/validations/social";

const RATING_LABELS = ["", "Dreadful", "Meh", "Fine", "Lovely", "Unreal"];

/** Write, edit or delete the signed-in user's review of a listing. */
export function ReviewForm({ listingId, existing }: { listingId: string; existing: OwnReview | null }) {
  const [editing, setEditing] = useState(!existing);

  if (existing && !editing) {
    return <YourReview listingId={listingId} review={existing} onEdit={() => setEditing(true)} />;
  }
  return <ReviewEditor listingId={listingId} existing={existing} onCancel={existing ? () => setEditing(false) : undefined} />;
}

function ReviewEditor({
  listingId,
  existing,
  onCancel,
}: {
  listingId: string;
  existing: OwnReview | null;
  onCancel?: () => void;
}) {
  const [state, action] = useActionState(saveReview, initialFormState);
  const [rating, setRating] = useState(Number(state.values?.rating) || existing?.rating || 0);
  const [content, setContent] = useState(state.values?.content ?? existing?.content ?? "");
  const id = useId();

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  const ratingError = state.fieldErrors?.rating?.[0];
  const contentError = state.fieldErrors?.content?.[0];

  return (
    <form action={action} className="grid gap-5 rounded-2xl border p-5 sm:p-6" noValidate>
      <div>
        <h3 className="text-lg font-semibold">{existing ? "Edit your review" : "Write a review"}</h3>
        <p className="text-sm text-muted-foreground">You don&apos;t need to have stayed. Nobody has.</p>
      </div>
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <input type="hidden" name="listingId" value={listingId} />
      {existing && <input type="hidden" name="reviewId" value={existing.id} />}

      <fieldset aria-describedby={ratingError ? `${id}-rating-error` : undefined}>
        <legend className="mb-2 text-sm font-medium">Your rating</legend>
        <div className="flex items-center gap-3">
          <div className="flex" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className="cursor-pointer rounded-md p-0.5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="sr-only"
                  aria-label={`${value} ${value === 1 ? "star" : "stars"} (${RATING_LABELS[value]})`}
                />
                <Star
                  aria-hidden="true"
                  className={cn("size-8 transition-colors", value <= rating ? "fill-brand stroke-brand" : "stroke-muted-foreground/50")}
                />
              </label>
            ))}
          </div>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {RATING_LABELS[rating]}
          </span>
        </div>
        {ratingError && (
          <p id={`${id}-rating-error`} className="mt-2 text-sm text-destructive">
            {ratingError}
          </p>
        )}
      </fieldset>

      <div className="grid gap-2">
        <div className="flex items-end justify-between">
          <Label htmlFor={`${id}-content`}>Your review</Label>
          <span className={cn("text-xs tabular-nums", content.length > REVIEW_MAX_LENGTH ? "text-destructive" : "text-muted-foreground")}>
            {content.length.toLocaleString("en-US")} / {REVIEW_MAX_LENGTH.toLocaleString("en-US")}
          </span>
        </div>
        <Textarea
          id={`${id}-content`}
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          placeholder="The ghost was charming, the moat was soup, and I'd absolutely not go again."
          aria-invalid={contentError ? true : undefined}
          aria-describedby={contentError ? `${id}-content-error` : undefined}
          className="min-h-28 px-3.5 py-3"
        />
        {contentError && (
          <p id={`${id}-content-error`} className="text-sm text-destructive">
            {contentError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving…" size="default">
          {existing ? "Save review" : "Post review"}
        </SubmitButton>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function YourReview({ listingId, review, onEdit }: { listingId: string; review: OwnReview; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="grid gap-3 rounded-2xl border bg-muted/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Your review</h3>
        <Stars rating={review.rating} />
      </div>
      <p className="leading-relaxed whitespace-pre-line">{review.content}</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={onEdit} disabled={pending}>
          <Pencil aria-hidden="true" />
          Edit
        </Button>
        {confirming ? (
          <>
            <span className="text-sm">Delete your review?</span>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteReview(review.id, listingId);
                  if (!result.ok) setError(result.error);
                })
              }
            >
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Yes, delete
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
              Keep it
            </Button>
          </>
        ) : (
          <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
