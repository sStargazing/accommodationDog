"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AVATARS_BUCKET, LISTING_IMAGES_BUCKET } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { IMAGE_TYPES, MAX_AVATAR_BYTES, MAX_IMAGE_BYTES } from "@/lib/validations/listing";

const UPLOAD_KINDS = {
  listing: { bucket: LISTING_IMAGES_BUCKET, maxBytes: MAX_IMAGE_BYTES },
  avatar: { bucket: AVATARS_BUCKET, maxBytes: MAX_AVATAR_BYTES },
} as const;

const requestSchema = z.object({
  kind: z.enum(["listing", "avatar"]),
  contentType: z.enum(Object.keys(IMAGE_TYPES) as [keyof typeof IMAGE_TYPES, ...(keyof typeof IMAGE_TYPES)[]]),
  size: z.number().int().positive(),
});

export type UploadTicket =
  | { ok: true; bucket: string; path: string; token: string }
  | { ok: false; error: string };

/**
 * Issues a one-time upload URL for a single image. The server checks the
 * user, the declared type and size, and picks a random file name inside the
 * user's own folder. The browser then uploads straight to Supabase Storage,
 * whose bucket settings enforce the same type and size limits, and the file's
 * actual bytes are verified again before it is attached to anything.
 */
export async function createUploadTicket(request: {
  kind: "listing" | "avatar";
  contentType: string;
  size: number;
}): Promise<UploadTicket> {
  const parsed = requestSchema.safeParse(request);
  if (!parsed.success) return { ok: false, error: "Only JPEG, PNG and WebP images can be uploaded." };
  const { bucket, maxBytes } = UPLOAD_KINDS[parsed.data.kind];
  if (parsed.data.size > maxBytes) {
    return { ok: false, error: `Images must be ${maxBytes / 1024 / 1024} MB or smaller.` };
  }
  if (!isSupabaseConfigured) return { ok: false, error: "Uploads aren't available: Supabase isn't configured." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { ok: false, error: "Your session has expired. Please log in again." };

  const path = `${auth.claims.sub}/${randomUUID()}.${IMAGE_TYPES[parsed.data.contentType]}`;
  // Signed with the user's own session, so storage RLS (own folder only) applies.
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Couldn't start the upload. Please try again." };

  return { ok: true, bucket, path, token: data.token };
}
