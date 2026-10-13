"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, use, useOptimistic, useState, useTransition } from "react";
import { setFavourite } from "@/lib/actions/listings";
import type { FavouriteState } from "@/lib/queries/favourites";
import { cn } from "@/lib/utils";

const FavouritesContext = createContext<Promise<FavouriteState> | null>(null);

/** Shares one request for the user's favourites with every heart below it. */
export function FavouritesProvider({ state, children }: { state: Promise<FavouriteState>; children: React.ReactNode }) {
  return <FavouritesContext value={state}>{children}</FavouritesContext>;
}

type FavouriteButtonProps = {
  listingId: string;
  listingTitle: string;
  /** "overlay" sits on a photo; "inline" is a labelled button for the listing header. */
  variant?: "overlay" | "inline";
  className?: string;
};

export function FavouriteButton(props: FavouriteButtonProps) {
  return (
    <Suspense fallback={<HeartButton {...props} favourited={false} disabled />}>
      <ConnectedFavouriteButton {...props} />
    </Suspense>
  );
}

function ConnectedFavouriteButton(props: FavouriteButtonProps) {
  const statePromise = use(FavouritesContext);
  if (!statePromise) throw new Error("FavouriteButton must be rendered inside a FavouritesProvider");
  const { signedIn, ids } = use(statePromise);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [saved, setSaved] = useState(() => ids.includes(props.listingId));
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function toggle() {
    if (!signedIn) {
      const here = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
      router.push(`/login?next=${encodeURIComponent(here)}`);
      return;
    }
    const next = !optimisticSaved;
    setFailed(false);
    startTransition(async () => {
      setOptimisticSaved(next);
      const result = await setFavourite(props.listingId, next);
      if (result.ok) setSaved(result.favourited);
      else if (result.reason === "signed_out") router.push(`/login?next=${encodeURIComponent(pathname)}`);
      else setFailed(true);
    });
  }

  return <HeartButton {...props} favourited={optimisticSaved} failed={failed} onClick={toggle} />;
}

function HeartButton({
  listingTitle,
  variant = "overlay",
  className,
  favourited,
  failed,
  disabled,
  onClick,
}: FavouriteButtonProps & { favourited: boolean; failed?: boolean; disabled?: boolean; onClick?: () => void }) {
  const label = favourited ? `Remove ${listingTitle} from saved` : `Save ${listingTitle}`;

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={favourited}
        aria-label={label}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium underline-offset-4 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
          className,
        )}
      >
        <Heart className={cn("size-4", favourited && "fill-brand stroke-brand")} aria-hidden="true" />
        <span className="hidden sm:inline">{favourited ? "Saved" : "Save"}</span>
        {failed && <span className="sr-only" role="alert">Couldn&apos;t save. Please try again.</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={favourited}
      aria-label={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-3 focus-visible:ring-white active:scale-95",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-6 stroke-white stroke-2 drop-shadow-[0_1px_2px_rgb(0_0_0/0.5)]",
          favourited ? "fill-brand" : "fill-black/40",
        )}
        aria-hidden="true"
      />
      {failed && <span className="sr-only" role="alert">Couldn&apos;t save. Please try again.</span>}
    </button>
  );
}
