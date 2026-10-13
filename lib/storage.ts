export const LISTING_IMAGES_BUCKET = "listing-images";
export const AVATARS_BUCKET = "avatars";

/** Public URL of an object in one of the public-read storage buckets. */
export function publicStorageUrl(bucket: string, path: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
