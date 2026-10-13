import { Suspense } from "react";
import { getFavouriteState } from "@/lib/queries/favourites";
import { FavouritesProvider, FavouritesSync } from "./favourite-button";

/**
 * Wrap any content with favourite hearts in this. The content itself can be
 * prerendered; the signed-in user's favourites stream in alongside it.
 */
export function Favourites({ children }: { children: React.ReactNode }) {
  return (
    <FavouritesProvider>
      <Suspense>
        <SessionFavourites />
      </Suspense>
      {children}
    </FavouritesProvider>
  );
}

async function SessionFavourites() {
  return <FavouritesSync state={await getFavouriteState()} />;
}
