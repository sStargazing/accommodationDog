import { amenityLabel, type ListingAmenities } from "@/lib/listings/constants";
import { pluralize } from "@/lib/utils/format";
import { AMENITY_ICONS, CUSTOM_AMENITY_ICON } from "./icons";

// Presentational pieces shared by the listing page and the create-form preview.

export function listingFacts(listing: { maxGuests: number; bedrooms: number; beds: number; bathrooms: number }) {
  return [
    pluralize(listing.maxGuests, "guest"),
    pluralize(listing.bedrooms, "bedroom"),
    pluralize(listing.beds, "bed"),
    pluralize(listing.bathrooms, "bath"),
  ].join(" · ");
}

/** Standard amenities with icons, then custom ones in the same style. */
export function AmenityList({ amenities }: { amenities: ListingAmenities }) {
  return (
    <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {amenities.standard.map((value) => {
        const Icon = AMENITY_ICONS[value] ?? CUSTOM_AMENITY_ICON;
        return (
          <li key={value} className="flex items-center gap-4">
            <Icon className="size-6 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            {amenityLabel(value)}
          </li>
        );
      })}
      {amenities.custom.map((value) => (
        <li key={`custom-${value}`} className="flex items-center gap-4">
          <CUSTOM_AMENITY_ICON className="size-6 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <span className="break-words">{value}</span>
        </li>
      ))}
    </ul>
  );
}
