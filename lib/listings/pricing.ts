import { differenceInCalendarDays, isValid, parseISO } from "date-fns";

export const MAX_NIGHTS = 365;

/** Nights between two yyyy-MM-dd dates, or null if the range isn't usable. */
export function countNights(checkIn: string | undefined, checkOut: string | undefined): number | null {
  if (!checkIn || !checkOut) return null;
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  if (!isValid(start) || !isValid(end)) return null;
  const nights = differenceInCalendarDays(end, start);
  return nights >= 1 && nights <= MAX_NIGHTS ? nights : null;
}

export type PriceBreakdown = {
  nights: number;
  nightsSubtotal: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
};

/** Total = (nightly price × nights) + cleaning fee + service fee. All fictional. */
export function calculatePrice({
  nightlyPrice,
  cleaningFee,
  serviceFee,
  nights,
}: {
  nightlyPrice: number;
  cleaningFee: number;
  serviceFee: number;
  nights: number;
}): PriceBreakdown {
  // Work in cents so totals don't pick up floating-point noise.
  const cents = (value: number) => Math.round(value * 100);
  const nightsSubtotal = cents(nightlyPrice) * nights;
  const total = nightsSubtotal + cents(cleaningFee) + cents(serviceFee);
  return {
    nights,
    nightsSubtotal: nightsSubtotal / 100,
    cleaningFee: cents(cleaningFee) / 100,
    serviceFee: cents(serviceFee) / 100,
    total: total / 100,
  };
}
