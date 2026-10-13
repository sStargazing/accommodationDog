"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useId, useState } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitReport } from "@/lib/actions/social";
import { cn } from "@/lib/utils";
import { initialFormState } from "@/lib/validations/form-state";
import { REPORT_DETAILS_MAX_LENGTH, REPORT_REASONS, type ReportTargetType } from "@/lib/validations/social";

export function ReportButton({
  targetType,
  targetId,
  className,
}: {
  targetType: ReportTargetType;
  targetId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Remount the form each time the dialog opens, so it starts fresh.
  const [session, setSession] = useState(0);
  const noun = targetType === "listing" ? "listing" : "review";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSession((count) => count + 1);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50",
            className,
          )}
        >
          <Flag className="size-3.5" aria-hidden="true" />
          Report {targetType === "listing" ? "this listing" : <span className="sr-only">review</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto p-6 sm:max-w-lg">
        <div className="grid gap-1">
          <DialogTitle className="text-xl font-semibold">Report this {noun}</DialogTitle>
          <DialogDescription>
            Jokes are welcome. Harassment, real people&apos;s private details and impersonation are not. Reports are
            private and go to our moderators.
          </DialogDescription>
        </div>
        <ReportForm key={session} targetType={targetType} targetId={targetId} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ReportForm({
  targetType,
  targetId,
  onDone,
}: {
  targetType: ReportTargetType;
  targetId: string;
  onDone: () => void;
}) {
  const [state, action] = useActionState(submitReport, initialFormState);
  const pathname = usePathname();
  const id = useId();

  if (state.status === "success") {
    return (
      <div className="grid gap-4">
        <FormMessage tone="success">{state.message}</FormMessage>
        <Button onClick={onDone}>Done</Button>
      </div>
    );
  }

  if (state.message === "signed_out") {
    return (
      <div className="grid gap-4">
        <FormMessage tone="error">Please log in to report content. It helps us keep reports genuine.</FormMessage>
        <Button asChild>
          <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Log in</Link>
        </Button>
      </div>
    );
  }

  const reasonError = state.fieldErrors?.reason?.[0];
  const detailsError = state.fieldErrors?.details?.[0];

  return (
    <form action={action} className="grid gap-5" noValidate>
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />

      <fieldset aria-describedby={reasonError ? `${id}-reason-error` : undefined}>
        <legend className="mb-2 text-sm font-medium">What&apos;s wrong?</legend>
        <div className="grid gap-2">
          {REPORT_REASONS.map((reason) => (
            <label
              key={reason.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm has-checked:border-foreground has-checked:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="reason"
                value={reason.value}
                defaultChecked={state.values?.reason === reason.value}
                className="size-4 accent-foreground"
              />
              {reason.label}
            </label>
          ))}
        </div>
        {reasonError && (
          <p id={`${id}-reason-error`} className="mt-2 text-sm text-destructive">
            {reasonError}
          </p>
        )}
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor={`${id}-details`}>Anything else? (optional)</Label>
        <Textarea
          id={`${id}-details`}
          name="details"
          rows={3}
          maxLength={REPORT_DETAILS_MAX_LENGTH}
          defaultValue={state.values?.details}
          aria-invalid={detailsError ? true : undefined}
          className="px-3.5 py-3"
        />
        {detailsError && <p className="text-sm text-destructive">{detailsError}</p>}
      </div>

      <SubmitButton pendingLabel="Sending…" className="w-full">
        Send report
      </SubmitButton>
    </form>
  );
}
