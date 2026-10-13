import "server-only";
import { cacheLife } from "next/cache";
import sharp from "sharp";

// Helpers for the generated Open Graph (social preview) images.

export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * Fetches a Google Font subset as TTF (the format ImageResponse needs), for
 * just the characters in `text`. Returns null if the font can't be loaded, in
 * which case ImageResponse falls back to its built-in font.
 */
export async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  "use cache";
  cacheLife("max");
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`,
      { signal: AbortSignal.timeout(5000) },
    ).then((response) => response.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const font = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/**
 * The listing's cover photo as a JPEG data URL, cropped to the left half of
 * the card. (Uploaded photos may be WebP, which ImageResponse can't draw.)
 */
export async function coverImageDataUrl(url: string): Promise<string | null> {
  "use cache";
  cacheLife("days");
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const jpeg = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(OG_SIZE.width / 2, OG_SIZE.height, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}
