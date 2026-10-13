import "server-only";
import { publicStorageUrl } from "@/lib/storage";
import { detectImageType } from "./signature";

/**
 * Server-side check of an uploaded file: it must exist, be no larger than
 * `maxBytes`, and its bytes must match the image type in its file name.
 * Fetches only the first 16 bytes (via an HTTP range request).
 */
export async function verifyStoredImage(bucket: string, path: string, maxBytes: number): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch(publicStorageUrl(bucket, path), {
      headers: { Range: "bytes=0-15" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return false;
  }

  // "bytes 0-15/123456" for a range response, otherwise the full length.
  const total = Number(response.headers.get("content-range")?.split("/")[1] ?? response.headers.get("content-length"));
  const ok = (response.status === 200 || response.status === 206) && Number.isFinite(total) && total > 0 && total <= maxBytes;
  if (!ok) {
    // Don't download a body we're rejecting. (Not awaited: cancelling can
    // stall inside Next's instrumented fetch.)
    void response.body?.cancel().catch(() => {});
    return false;
  }

  // At most 16 bytes for a range response; at most `maxBytes` otherwise.
  const bytes = new Uint8Array(await response.arrayBuffer()).subarray(0, 16);
  const extension = path.split(".").pop();
  return detectImageType(bytes) === extension;
}
