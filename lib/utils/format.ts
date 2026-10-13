const wholeDollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const dollarsAndCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** "$120", or "$120.50" when there are cents. All prices on the site are fictional. */
export function formatPrice(value: number): string {
  return Number.isInteger(value) ? wholeDollars.format(value) : dollarsAndCents.format(value);
}

export function formatRating(value: number): string {
  // 5 → "5.0", 4.5 → "4.5", 4.67 → "4.67"
  return value.toFixed(2).replace(/0$/, "");
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
