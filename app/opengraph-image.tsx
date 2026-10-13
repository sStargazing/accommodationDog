import { ImageResponse } from "next/og";
import { loadGoogleFont, OG_SIZE } from "@/lib/og/assets";
import { OG_COLORS, OgWordmark } from "@/lib/og/brand";

export const alt = "accommodationDog: Unreal stays. Unbelievable experiences.";
export const size = OG_SIZE;
export const contentType = "image/png";

const HEADLINE = "Unreal stays.";
const ACCENT = "Unbelievable experiences.";
const NOTE = "A parody marketplace. Every stay is 100% fictional.";

/** The default social preview card for the site. */
export default async function Image() {
  const text = `${HEADLINE}${ACCENT}${NOTE}accommodationDog`;
  const [heading, body] = await Promise.all([
    loadGoogleFont("Bricolage Grotesque", 700, text),
    loadGoogleFont("Geist", 400, text),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px 80px",
          background: "#fff",
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", fontFamily: "Bricolage Grotesque" }}>
          <OgWordmark size={56} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontFamily: "Bricolage Grotesque", fontWeight: 700, fontSize: 96, lineHeight: 1.02 }}>
          <span style={{ color: OG_COLORS.ink }}>{HEADLINE}</span>
          <span style={{ color: OG_COLORS.brand }}>{ACCENT}</span>
        </div>
        <div style={{ display: "flex", fontSize: 32, color: OG_COLORS.muted }}>{NOTE}</div>
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
}
