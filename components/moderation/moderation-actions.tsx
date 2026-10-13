"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { moderateReport, type ModerationDecision } from "@/lib/actions/moderation";

export function ModerationActions({
  reportId,
  targetLabel,
  canRemove,
  status,
}: {
  reportId: string;
  targetLabel: string;
  canRemove: boolean;
  status: "open" | "resolved" | "dismissed";
}) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<ModerationDecision | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function act(decision: ModerationDecision) {
    setError(null);
    setActive(decision);
    startTransition(async () => {
      const result = await moderateReport(reportId, decision);
      if (!result.ok) setError(result.error);
      setConfirmRemove(false);
    });
  }

  const spinner = (decision: ModerationDecision) =>
    pending && active === decision ? <Loader2 className="animate-spin" aria-hidden="true" /> : null;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canRemove &&
          (confirmRemove ? (
            <>
              <span className="text-sm">Remove this {targetLabel} for everyone?</span>
              <Button
                variant="destructive"
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => act("remove")}
                disabled={pending}
              >
                {spinner("remove")}
                Yes, remove
              </Button>
              <Button variant="ghost" onClick={() => setConfirmRemove(false)} disabled={pending}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="destructive" onClick={() => setConfirmRemove(true)} disabled={pending}>
              Remove {targetLabel}
            </Button>
          ))}
        {!confirmRemove && status !== "resolved" && (
          <Button variant="outline" onClick={() => act("resolve")} disabled={pending}>
            {spinner("resolve")}
            Mark resolved
          </Button>
        )}
        {!confirmRemove && status !== "dismissed" && (
          <Button variant="ghost" onClick={() => act("dismiss")} disabled={pending}>
            {spinner("dismiss")}
            Dismiss
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
