export type ImageExtension = "jpg" | "png" | "webp";

/**
 * Identifies JPEG, PNG and WebP files from their first bytes, so a file's
 * real type can be checked regardless of its name or claimed content type.
 */
export function detectImageType(bytes: Uint8Array): ImageExtension | null {
  const startsWith = (signature: number[], offset = 0) =>
    bytes.length >= offset + signature.length && signature.every((byte, i) => bytes[offset + i] === byte);

  if (startsWith([0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  // "RIFF" <size> "WEBP"
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}
