"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { UserAvatar } from "@/components/listings/user-avatar";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/lib/actions/profile";
import { createUploadTicket } from "@/lib/actions/uploads";
import { createClient } from "@/lib/supabase/client";
import { AVATARS_BUCKET, IMMUTABLE_CACHE_CONTROL, publicStorageUrl } from "@/lib/storage";
import { initialFormState } from "@/lib/validations/form-state";
import { IMAGE_TYPES, MAX_AVATAR_BYTES } from "@/lib/validations/listing";

export function ProfileForm({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  const [state, action] = useActionState(updateProfile, initialFormState);
  // "keep", "remove", or the storage path of a new upload.
  const [avatar, setAvatar] = useState("keep");
  const [preview, setPreview] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploadError(null);
    if (!(file.type in IMAGE_TYPES)) return setUploadError("Choose a JPEG, PNG or WebP image.");
    if (file.size > MAX_AVATAR_BYTES) return setUploadError("Profile photos must be 2 MB or smaller.");

    setUploading(true);
    try {
      const ticket = await createUploadTicket({ kind: "avatar", contentType: file.type, size: file.size });
      if (!ticket.ok) return setUploadError(ticket.error);
      const { error } = await createClient()
        .storage.from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type, cacheControl: IMMUTABLE_CACHE_CONTROL });
      if (error) return setUploadError("Upload failed. Please try again.");
      setAvatar(ticket.path);
      setPreview(publicStorageUrl(AVATARS_BUCKET, ticket.path));
    } catch {
      setUploadError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  const currentUsername = state.values?.username ?? username;
  const avatarError = uploadError ?? state.fieldErrors?.avatar?.[0];

  return (
    <form action={action} className="grid gap-8" noValidate>
      {state.status === "success" && (
        <FormMessage tone="success">
          {state.message}{" "}
          <Link href={`/users/${currentUsername}`} className="font-medium underline underline-offset-2">
            View your profile
          </Link>
        </FormMessage>
      )}
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}

      <fieldset className="grid gap-3">
        <legend className="mb-3 text-sm font-medium">Profile photo</legend>
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            <UserAvatar username={currentUsername} avatarUrl={preview} className="size-20 text-2xl" />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                <Loader2 className="size-5 animate-spin" aria-label="Uploading photo" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {preview ? "Change photo" : "Upload photo"}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAvatar("remove");
                  setPreview(null);
                }}
                disabled={uploading}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG or WebP, up to 2 MB. A dog is traditional but not required.</p>
        {avatarError && (
          <p role="alert" className="text-sm text-destructive">
            {avatarError}
          </p>
        )}
        <input type="hidden" name="avatar" value={avatar} />
        <input
          ref={inputRef}
          type="file"
          accept={Object.keys(IMAGE_TYPES).join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </fieldset>

      <FormField
        name="username"
        label="Username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        minLength={3}
        maxLength={30}
        defaultValue={currentUsername}
        errors={state.fieldErrors?.username}
        hint="Letters, numbers and underscores. Changing it changes your profile link."
      />

      <div>
        <SubmitButton pendingLabel="Saving…" disabled={uploading}>
          Save profile
        </SubmitButton>
      </div>
    </form>
  );
}
