import { cn } from "@/lib/utils";

/** Small but visible marker that a listing is not a real place. */
export function FictionalBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
      Fictional listing
    </span>
  );
}
