"use server";

import { refresh, updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { verifyStoredImage } from "@/lib/images/verify";
import { AVATARS_BUCKET, publicStorageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { usernameSchema } from "@/lib/validations/auth";
import { formValues, type FormState } from "@/lib/validations/form-state";
import { MAX_AVATAR_BYTES, STORAGE_PATH_PATTERN } from "@/lib/validations/listing";

const AVATAR_PREFIX = `/storage/v1/object/public/${AVATARS_BUCKET}/`;

/** The storage path of an avatar URL in our bucket, if it is one. */
function avatarPath(url: string | null): string | null {
  if (!url) return null;
  const index = url.indexOf(AVATAR_PREFIX);
  return index === -1 ? null : decodeURIComponent(url.slice(index + AVATAR_PREFIX.length));
}

/**
 * Updates the signed-in user's username and avatar. The `avatar` field is
 * "keep", "remove", or the storage path of a freshly uploaded image.
 */
export async function updateProfile(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["username"]);
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again.", values };

  const parsed = usernameSchema.safeParse(values.username);
  if (!parsed.success) {
    return { status: "error", fieldErrors: { username: [parsed.error.issues[0].message] }, values };
  }
  const username = parsed.data;

  const avatar = String(formData.get("avatar") ?? "keep");
  let avatarUrl = user.avatarUrl;
  if (avatar === "remove") {
    avatarUrl = null;
  } else if (avatar !== "keep") {
    const valid =
      STORAGE_PATH_PATTERN.test(avatar) &&
      avatar.startsWith(`${user.id}/`) &&
      (await verifyStoredImage(AVATARS_BUCKET, avatar, MAX_AVATAR_BYTES));
    if (!valid) {
      return {
        status: "error",
        fieldErrors: { avatar: ["That photo couldn't be verified. Upload a JPEG, PNG or WebP under 2 MB."] },
        values,
      };
    }
    avatarUrl = publicStorageUrl(AVATARS_BUCKET, avatar);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ username, avatar_url: avatarUrl }).eq("id", user.id);
  if (error) {
    if (error.code === "23505") {
      return { status: "error", fieldErrors: { username: ["That username is already taken."] }, values };
    }
    return { status: "error", message: "Couldn't save your profile. Please try again.", values };
  }

  // Remove the previous avatar file once it's no longer used.
  const previous = avatarPath(user.avatarUrl);
  if (previous && previous !== avatarPath(avatarUrl) && previous.startsWith(`${user.id}/`)) {
    await supabase.storage.from(AVATARS_BUCKET).remove([previous]);
  }

  // Usernames and avatars appear on listings, reviews and profiles.
  updateTag("profiles");
  updateTag("listings");
  updateTag("reviews");
  refresh();
  return { status: "success", message: "Your profile has been updated.", values: { username } };
}
