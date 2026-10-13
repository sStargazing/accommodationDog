import Image from "next/image";
import { AmenityList, listingFacts } from "@/components/listings/listing-details";
import { mosaicClasses } from "@/components/listings/listing-gallery";
import { propertyTypeLabel } from "@/lib/listings/constants";
import { LISTING_IMAGES_BUCKET, publicStorageUrl } from "@/lib/storage";
import { formatPrice } from "@/lib/utils/format";
import type { ListingFormValues } from "@/lib/validations/listing";

/** How the listing will look, built from the unsaved form values. */
export function ListingPreview({ values }: { values: Partial<ListingFormValues> }) {
  const images = [...(values.images ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const amenities = values.amenities ?? { standard: [], custom: [] };
  const number = (value: number | undefined) => (Number.isFinite(value) ? (value as number) : 0);

  return (
    <article aria-label="Listing preview" className="overflow-hidden rounded-2xl border">
      <div className="grid grid-cols-4 grid-rows-2 gap-1.5 bg-muted p-1.5" style={{ aspectRatio: "2 / 1" }}>
        {images.slice(0, 5).map((image, index, shown) => (
          <div
            key={image.path}
            className={`relative overflow-hidden rounded-lg ${mosaicClasses(shown.length)[index]}`}
          >
            <Image
              src={publicStorageUrl(LISTING_IMAGES_BUCKET, image.path)}
              alt={index === 0 ? "Cover photo" : `Photo ${index + 1}`}
              fill
              sizes={index === 0 ? "400px" : "200px"}
              className="object-cover"
              unoptimized
            />
          </div>
        ))}
      </div>

      <div className="grid gap-6 p-5 sm:p-6">
        <div>
          <h3 className="font-heading text-2xl font-semibold tracking-tight break-words">{values.title}</h3>
          <p className="mt-1 text-muted-foreground">
            {propertyTypeLabel(values.property_type ?? "other")} in {values.city}, {values.country}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {listingFacts({
              maxGuests: number(values.max_guests),
              bedrooms: number(values.bedrooms),
              beds: number(values.beds),
              bathrooms: number(values.bathrooms),
            })}
          </p>
        </div>

        <p className="leading-relaxed break-words whitespace-pre-line">{values.description}</p>

        {(amenities.standard.length > 0 || amenities.custom.length > 0) && (
          <div className="border-t pt-6">
            <h4 className="mb-4 font-semibold">What this place offers</h4>
            <AmenityList amenities={amenities} />
          </div>
        )}

        <dl className="grid gap-2 border-t pt-6 text-sm sm:max-w-xs">
          <div className="flex justify-between">
            <dt className="font-semibold">Per night</dt>
            <dd className="font-semibold">{formatPrice(number(values.nightly_price))}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Cleaning fee</dt>
            <dd>{formatPrice(number(values.cleaning_fee))}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Service fee</dt>
            <dd>{formatPrice(number(values.service_fee))}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
