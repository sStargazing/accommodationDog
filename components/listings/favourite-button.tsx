"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, use, useEffect, useOptimistic, useState, useTransition } from "react";
import { setFavourite } from "@/lib/actions/listings";
import type { FavouriteState } from "@/lib/queries/favourites";
import { cn } from "@/lib/utils";

type FavouritesContextValue = {
  /** null until the session-dependent state has streamed in. */
  state: FavouriteState | null;
  setState: (state: FavouriteState) => void;
};

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

/**
 * Holds the signed-in user's favourites for every heart below it. The page
 * around it can stay static: the state arrives separately through
 * <FavouritesSync>, rendered by the server inside its own <Suspense>.
 */
export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FavouriteState | null>(null);
  return <FavouritesContext value={{ state, setState }}>{children}</FavouritesContext>;
}

export function FavouritesSync({ state }: { state: FavouriteState }) {
  const context = use(FavouritesContext);
  useEffect(() => context?.setState(state), [context, state]);
  return null;
}

type FavouriteButtonProps = {
  listingId: string;
  listingTitle: string;
  /** "overlay" sits on a photo; "inline" is a labelled button for the listing header. */
  variant?: "overlay" | "inline";
  className?: string;
};

export function FavouriteButton(props: FavouriteButtonProps) {
  const context = use(FavouritesContext);
  if (!context) throw new Error("FavouriteButton must be rendered inside a FavouritesProvider");
  if (!context.state) return <HeartButton {...props} favourited={false} disabled />;
  return <ConnectedFavouriteButton {...props} state={context.state} />;
}

function ConnectedFavouriteButton({ state, ...props }: FavouriteButtonProps & { state: FavouriteState }) {
  const router = useRouter();
  const pathname = usePathname();
  // The user's own toggles override what the server reported.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const saved = toggled ?? state.ids.includes(props.listingId);
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function toggle() {
    if (!state.signedIn) {
      router.push(`/login?next=${encodeURIComponent(`${pathname}${window.location.search}`)}`);
      return;
    }
    const next = !optimisticSaved;
    setFailed(false);
    startTransition(async () => {
      setOptimisticSaved(next);
      const result = await setFavourite(props.listingId, next);
      if (result.ok) setToggled(result.favourited);
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
