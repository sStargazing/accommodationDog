"use client";

import { addDays, format, parseISO } from "date-fns";
import { useSearchParams } from "next/navigation";
import { Suspense, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { calculatePrice, countNights } from "@/lib/listings/pricing";
import { formatPrice, pluralize } from "@/lib/utils/format";
import { LogoMark } from "@/components/layout/logo";
import { Rating } from "./rating";

type BookingCardProps = {
  title: string;
  nightlyPrice: number;
  cleaningFee: number;
  serviceFee: number;
  maxGuests: number;
  ratingAvg: number | null;
  reviewCount: number;
};

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Prefills dates and guests from the URL (carried over from a search). The
 * URL is only known per request, so the card without them is the static
 * fallback; it's the same size, so nothing shifts when it swaps in.
 */
export function BookingCard(props: BookingCardProps) {
  return (
    <Suspense fallback={<SimulatedBooking {...props} />}>
      <BookingCardFromUrl {...props} />
    </Suspense>
  );
}

function BookingCardFromUrl(props: BookingCardProps) {
  const searchParams = useSearchParams();
  const date = (key: string) => {
    const value = searchParams.get(key) ?? "";
    return isoDate.test(value) ? value : "";
  };
  return (
    <SimulatedBooking
      {...props}
      initialCheckIn={date("checkin")}
      initialCheckOut={date("checkout")}
      initialGuests={Number(searchParams.get("guests")) || 1}
    />
  );
}

/**
 * The simulated booking card. It calculates a price breakdown and "reserves"
 * by opening a joke dialog. It never talks to the server, asks for payment
 * details or creates a booking of any kind.
 */
function SimulatedBooking({
  title,
  nightlyPrice,
  cleaningFee,
  serviceFee,
  maxGuests,
  ratingAvg,
  reviewCount,
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests = 1,
}: BookingCardProps & { initialCheckIn?: string; initialCheckOut?: string; initialGuests?: number }) {
  const id = useId();
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(() => Math.min(Math.max(initialGuests, 1), maxGuests));
  const [reserveOpen, setReserveOpen] = useState(false);

  const nights = countNights(checkIn, checkOut);
  const price = nights ? calculatePrice({ nightlyPrice, cleaningFee, serviceFee, nights }) : null;
  const dateError = checkIn && checkOut && !nights ? "Check-out must be 1 to 365 nights after check-in." : null;
  const checkOutMin = checkIn && isoDate.test(checkIn) ? format(addDays(parseISO(checkIn), 1), "yyyy-MM-dd") : undefined;

  const dateClass = "w-full bg-transparent text-sm outline-none";

  return (
    <>
      <section
        id="booking"
        aria-labelledby={`${id}-heading`}
        className="scroll-mt-28 rounded-2xl border p-6 shadow-[0_6px_24px_rgb(0_0_0/0.08)]"
      >
        <h2 id={`${id}-heading`} className="sr-only">
          Simulated booking
        </h2>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p>
            <span className="text-2xl font-semibold">{formatPrice(nightlyPrice)}</span>{" "}
            <span className="text-muted-foreground">night</span>
          </p>
          <Rating value={ratingAvg} count={reviewCount} showCount="long" className="text-sm" />
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-input">
          <div className="grid grid-cols-2">
            <label className="grid gap-0.5 px-3 py-2.5 focus-within:bg-muted/60">
              <span className="text-[0.6875rem] font-bold tracking-wide uppercase">Check-in</span>
              <input
                type="date"
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
                className={dateClass}
                aria-describedby={dateError ? `${id}-date-error` : undefined}
              />
            </label>
            <label className="grid gap-0.5 border-l border-input px-3 py-2.5 focus-within:bg-muted/60">
              <span className="text-[0.6875rem] font-bold tracking-wide uppercase">Checkout</span>
              <input
                type="date"
                value={checkOut}
                min={checkOutMin}
                onChange={(event) => setCheckOut(event.target.value)}
                className={dateClass}
                aria-invalid={dateError ? true : undefined}
                aria-describedby={dateError ? `${id}-date-error` : undefined}
              />
            </label>
          </div>
          <label className="grid gap-0.5 border-t border-input px-3 py-2.5 focus-within:bg-muted/60">
            <span className="text-[0.6875rem] font-bold tracking-wide uppercase">Guests</span>
            <select
              value={guests}
              onChange={(event) => setGuests(Number(event.target.value))}
              className="w-full bg-transparent text-sm outline-none"
            >
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((count) => (
                <option key={count} value={count}>
                  {pluralize(count, "guest")}
                </option>
              ))}
            </select>
          </label>
        </div>
        {dateError && (
          <p id={`${id}-date-error`} className="mt-2 text-sm text-destructive">
            {dateError}
          </p>
        )}

        <Button size="lg" className="mt-4 w-full" onClick={() => setReserveOpen(true)}>
          Reserve
        </Button>
        <p className="mt-3 text-center text-sm text-muted-foreground">You won&apos;t be charged. You can&apos;t be charged.</p>

        {price ? (
          <dl className="mt-5 grid gap-3 text-[0.9375rem]">
            <div className="flex justify-between gap-4">
              <dt className="underline decoration-dotted underline-offset-4">
                {formatPrice(nightlyPrice)} × {pluralize(price.nights, "night")}
              </dt>
              <dd>{formatPrice(price.nightsSubtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Cleaning fee</dt>
              <dd>{formatPrice(price.cleaningFee)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Service fee</dt>
              <dd>{formatPrice(price.serviceFee)}</dd>
            </div>
            <div className="mt-1 flex justify-between gap-4 border-t pt-4 font-semibold">
              <dt>Total (fictional)</dt>
              <dd>{formatPrice(price.total)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-5 text-center text-sm text-muted-foreground">Add dates to see the (entirely made-up) total.</p>
        )}
      </section>

      {/* Phones: a sticky bar keeps Reserve within reach. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <a href="#booking" className="min-w-0 text-sm">
            <span className="block font-semibold">
              {price ? `${formatPrice(price.total)} total` : `${formatPrice(nightlyPrice)} night`}
            </span>
            <span className="block truncate text-muted-foreground underline underline-offset-2">
              {price && checkIn && checkOut
                ? `${format(parseISO(checkIn), "d MMM")} – ${format(parseISO(checkOut), "d MMM")}`
                : "Add dates"}
            </span>
          </a>
          <Button size="lg" className="shrink-0" onClick={() => setReserveOpen(true)}>
            Reserve
          </Button>
        </div>
      </div>

      <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
        <DialogContent className="gap-5 p-6 sm:max-w-md">
          <LogoMark className="size-12" />
          <div className="grid gap-2">
            <DialogTitle className="font-heading text-2xl font-semibold">Nice try.</DialogTitle>
            <DialogDescription className="text-base text-foreground">
              This place isn&apos;t real. Neither is your reservation.
            </DialogDescription>
          </div>
          <p className="text-sm text-muted-foreground">
            {price
              ? `You almost booked ${pluralize(price.nights, "night")} at “${title}” for ${pluralize(guests, "guest")}, a bargain at ${formatPrice(price.total)}. `
              : `You almost booked “${title}”. `}
            No payment details were requested, no booking was made and no money changed hands. Your imaginary holiday
            remains entirely imaginary.
          </p>
          <DialogFooter className="-mx-6 -mb-6 rounded-b-xl border-t bg-muted/50 p-4">
            <Button size="lg" className="w-full sm:w-auto" onClick={() => setReserveOpen(false)}>
              Back to daydreaming
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
