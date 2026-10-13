import { ImageResponse } from "next/og";
import sharp from "sharp";
import { coverImageDataUrl, loadGoogleFont, OG_SIZE } from "@/lib/og/assets";
import { OG_COLORS, OgFictionalPill, OgWordmark } from "@/lib/og/brand";
import { getListing } from "@/lib/queries/listings";
import { formatPrice, formatRating, pluralize } from "@/lib/utils/format";

export const alt = "A fictional listing on accommodationDog";
export const size = OG_SIZE;
// JPEG keeps photo cards small enough for chat apps (WhatsApp skips previews over ~300 KB).
export const contentType = "image/jpeg";

/** The social preview card shown when a listing link is shared. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);

  const title = listing?.title ?? "This place doesn't exist. Even by our standards.";
  const location = listing ? `${listing.city}, ${listing.country}` : "";
  const price = listing ? formatPrice(listing.nightlyPrice) : "";
  const rating =
    listing && listing.ratingAvg !== null && listing.reviewCount > 0
      ? `${formatRating(listing.ratingAvg)} · ${pluralize(listing.reviewCount, "review")}`
      : listing
        ? "New listing"
        : "";
  const cover = listing?.images[0] ? await coverImageDataUrl(listing.images[0].url) : null;

  const text = `${title}${location}${price}${rating} night Fictional listing accommodationDog`;
  const [heading, body] = await Promise.all([
    loadGoogleFont("Bricolage Grotesque", 700, text),
    loadGoogleFont("Geist", 400, text),
  ]);

  const card = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#fff", fontFamily: "Geist" }}>
        {cover && (
          <img src={cover} alt="" width={OG_SIZE.width / 2} height={OG_SIZE.height} style={{ objectFit: "cover" }} />
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "56px 56px 48px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <OgFictionalPill />
            <div
              style={{
                display: "flex",
                marginTop: 32,
                fontFamily: "Bricolage Grotesque",
                fontSize: title.length > 48 ? 46 : title.length > 30 ? 54 : 64,
                fontWeight: 700,
                lineHeight: 1.06,
                color: OG_COLORS.ink,
              }}
            >
              {title}
            </div>
            {location && <div style={{ display: "flex", marginTop: 18, fontSize: 28, color: OG_COLORS.muted }}>{location}</div>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {listing && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 18, fontSize: 30, color: OG_COLORS.ink }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "Bricolage Grotesque", fontWeight: 700, fontSize: 40 }}>{price}</span>
                  <span style={{ color: OG_COLORS.muted }}>night</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: OG_COLORS.muted }}>
                  {listing.ratingAvg !== null && listing.reviewCount > 0 && (
                    <svg width="26" height="26" viewBox="0 0 24 24">
                      <path
                        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
                        fill={OG_COLORS.ink}
                      />
                    </svg>
                  )}
                  {rating}
                </div>
              </div>
            )}
            <div style={{ display: "flex", fontFamily: "Bricolage Grotesque" }}>
              <OgWordmark size={44} />
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        ...(heading ? [{ name: "Bricolage Grotesque", data: heading, weight: 700 as const, style: "normal" as const }] : []),
        ...(body ? [{ name: "Geist", data: body, weight: 400 as const, style: "normal" as const }] : []),
      ],
    },
  );

  const jpeg = await sharp(Buffer.from(await card.arrayBuffer())).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
