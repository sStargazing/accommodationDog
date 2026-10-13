import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { HeaderSearch } from "./header-search";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85">
      <div className="page-container flex h-16 items-center justify-between gap-4 sm:h-20">
        <Logo className="shrink-0" />
        <div className="flex flex-1 items-center justify-end gap-2 md:justify-center">
          <HeaderSearch />
        </div>
        <nav aria-label="Main" className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="hidden rounded-full px-4 py-2.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 lg:block"
          >
            Explore
          </Link>
          {/* Signed-out visitors are sent to log in first (see proxy.ts). */}
          <Link
            href="/create"
            className="hidden items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:inline-flex"
          >
            <Plus className="size-4" aria-hidden="true" />
            Create listing
          </Link>
          {/* The session is read per request, so it streams in after the static shell. */}
          <Suspense fallback={<div className="h-10 w-[4.5rem] rounded-full bg-muted sm:w-40" aria-hidden="true" />}>
            <AccountNav />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

async function AccountNav() {
  const user = await getCurrentUser();

  if (user) {
    return <UserMenu username={user.username} email={user.email} avatarUrl={user.avatarUrl} isAdmin={user.isAdmin} />;
  }

  return (
    <>
      <Button asChild variant="ghost" className="rounded-full">
        <Link href="/login">Log in</Link>
      </Button>
      {/* On phones the log-in page links to sign-up, keeping the header to one button. */}
      <Button asChild className="hidden rounded-full sm:inline-flex">
        <Link href="/signup">Sign up</Link>
      </Button>
    </>
  );
}
