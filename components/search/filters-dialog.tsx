"use client";

import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { AMENITY_ICONS } from "@/components/listings/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AMENITIES, RATING_FILTERS } from "@/lib/listings/constants";
import { countActiveFilters, listingsHref, type ListingFilters } from "@/lib/listings/search-params";
import { HiddenFilterFields } from "./hidden-filter-fields";

const inputClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function FiltersDialog({ filters }: { filters: ListingFilters }) {
  const active = countActiveFilters(filters);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 rounded-lg">
          <SlidersHorizontal aria-hidden="true" />
          Filters
          {active > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-xs text-background">
              {active}
              <span className="sr-only"> active</span>
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-xl">
        <div className="border-b px-6 py-4">
          <DialogTitle className="text-center text-base font-semibold">Filters</DialogTitle>
          <DialogDescription className="sr-only">Narrow down the fictional stays shown.</DialogDescription>
        </div>

        <form action="/" className="flex min-h-0 flex-1 flex-col">
          <HiddenFilterFields
            filters={filters}
            exclude={["guests", "min_price", "max_price", "amenity", "rating"]}
          />

          <div className="grid gap-8 overflow-y-auto px-6 py-6">
            <fieldset className="grid gap-3">
              <legend className="mb-3 text-lg font-semibold">Price per night</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-sm">
                  <span className="text-muted-foreground">Minimum ($)</span>
                  <input
                    name="min_price"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    defaultValue={filters.minPrice}
                    placeholder="0"
                    className={inputClass}
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="text-muted-foreground">Maximum ($)</span>
                  <input
                    name="max_price"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    defaultValue={filters.maxPrice}
                    placeholder="Any"
                    className={inputClass}
                  />
                </label>
              </div>
            </fieldset>

            <label className="grid gap-1.5">
              <span className="text-lg font-semibold">Guests</span>
              <span className="text-sm text-muted-foreground">Stays that sleep at least this many people.</span>
              <input
                name="guests"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                defaultValue={filters.guests}
                placeholder="Any"
                className={`${inputClass} mt-1.5 max-w-40`}
              />
            </label>

            <fieldset>
              <legend className="mb-3 text-lg font-semibold">Amenities</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {AMENITIES.map(({ value, label }) => {
                  const Icon = AMENITY_ICONS[value];
                  return (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm has-checked:border-foreground has-checked:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                    >
                      <input
                        type="checkbox"
                        name="amenity"
                        value={value}
                        defaultChecked={filters.amenities.includes(value)}
                        className="size-4 accent-foreground"
                      />
                      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                      {label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-lg font-semibold">Minimum rating</legend>
              <div className="flex flex-wrap gap-2">
                {[undefined, ...RATING_FILTERS].map((value) => (
                  <label
                    key={value ?? "any"}
                    className="cursor-pointer rounded-full border px-4 py-2 text-sm has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                  >
                    <input
                      type="radio"
                      name="rating"
                      value={value ?? ""}
                      defaultChecked={filters.rating === value}
                      className="sr-only"
                    />
                    {value ? `${value}+ ★` : "Any"}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
            <Link
              href={listingsHref({ ...filters, guests: undefined, minPrice: undefined, maxPrice: undefined, amenities: [], rating: undefined, page: 1 })}
              className="text-sm font-semibold underline underline-offset-4"
            >
              Clear filters
            </Link>
            <Button type="submit" className="h-11 px-6">
              Show stays
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
