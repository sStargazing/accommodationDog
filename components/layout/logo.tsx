import Link from "next/link";
import { cn } from "@/lib/utils";

/** The dog-house mark. Decorative: pair it with visible or sr-only text. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <path d="M8.5 14.2 16 7.8l7.5 6.4V23.5a1.5 1.5 0 0 1-1.5 1.5H10a1.5 1.5 0 0 1-1.5-1.5z" fill="#fff" />
      <path d="M10.2 12.7C7.6 13 5.5 15.6 5.6 19.4c0 1.6 1.9 2.1 2.8.8l2.6-3.9z" fill="var(--brand-deep)" />
      <path d="M21.8 12.7c2.6.3 4.7 2.9 4.6 6.7 0 1.6-1.9 2.1-2.8.8l-2.6-3.9z" fill="var(--brand-deep)" />
      <circle cx="13.3" cy="17" r="1.2" fill="#1c1917" />
      <circle cx="18.7" cy="17" r="1.2" fill="#1c1917" />
      <path
        d="M14.5 20h3c.45 0 .67.54.35.85l-1.5 1.4a.5.5 0 0 1-.7 0l-1.5-1.4c-.32-.31-.1-.85.35-.85z"
        fill="#1c1917"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 rounded-lg font-heading text-lg tracking-tight sm:text-xl", className)}
    >
      <LogoMark className="size-7 sm:size-8" />
      <span className="font-semibold">
        accommodation<span className="text-brand">Dog</span>
      </span>
    </Link>
  );
}
