import { LogoMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="page-container flex flex-col gap-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-6" />
          <span>
            <span className="font-medium text-foreground">accommodationDog</span> · Unreal stays. Unbelievable
            experiences.
          </span>
        </div>
        <p className="max-w-md sm:text-right">
          A parody site. Every listing is fictional: nothing here can be booked, paid for or slept in.
        </p>
      </div>
    </footer>
  );
}
