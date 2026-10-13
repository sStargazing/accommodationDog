import { Star } from "lucide-react";
import { formatRating, pluralize } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/** "★ 4.67 (12)" — or "New" when a listing has no reviews yet. */
export function Rating({
  value,
  count,
  showCount = "short",
  className,
}: {
  value: number | null;
  count: number;
  showCount?: "short" | "long";
  className?: string;
}) {
  if (value === null || count === 0) {
    return <span className={cn("inline-flex items-center gap-1", className)}>New</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Star className="size-3.5 fill-current" aria-hidden="true" />
      <span>
        <span className="sr-only">Rated </span>
        {formatRating(value)}
        <span className="sr-only"> out of 5</span>
      </span>
      {showCount === "short" ? (
        <span className="text-muted-foreground">
          ({count}
          <span className="sr-only"> {count === 1 ? "review" : "reviews"}</span>)
        </span>
      ) : (
        <span>· {pluralize(count, "review")}</span>
      )}
    </span>
  );
}

/** Five stars with the first `rating` filled. */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-3", i < rating ? "fill-foreground" : "fill-muted stroke-muted-foreground/40")} aria-hidden="true" />
      ))}
    </span>
  );
}
