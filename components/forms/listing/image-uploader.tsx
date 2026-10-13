"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2, TriangleAlert, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createUploadTicket } from "@/lib/actions/uploads";
import { LISTING_IMAGES_BUCKET, publicStorageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES, type ListingImageValue } from "@/lib/validations/listing";

type PendingUpload = {
  id: string;
  name: string;
  /** Object URL for a local preview; only for files the browser can display as images. */
  previewUrl?: string;
  error?: string;
};

type ImageUploaderProps = {
  value: ListingImageValue[];
  onChange: (images: ListingImageValue[]) => void;
  /** Photos already saved on the listing; they are deleted from storage only when the listing is saved. */
  savedPaths: ReadonlySet<string>;
  onBusyChange: (busy: boolean) => void;
  invalid?: boolean;
  describedBy?: string;
};

const ACCEPT = Object.keys(IMAGE_TYPES).join(",");

export function ImageUploader({ value, onChange, savedPaths, onBusyChange, invalid, describedBy }: ImageUploaderProps) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Latest images, so uploads finishing at the same time don't overwrite each other.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const uploading = pending.filter((item) => !item.error).length;
  useEffect(() => onBusyChange(uploading > 0), [uploading, onBusyChange]);

  // Release preview object URLs when they're no longer shown.
  const previewUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function commit(images: ListingImageValue[]) {
    // Exactly one cover: keep the current one, or fall back to the first photo.
    const withCover =
      images.length && !images.some((image) => image.isPrimary)
        ? images.map((image, i) => ({ ...image, isPrimary: i === 0 }))
        : images;
    valueRef.current = withCover;
    onChange(withCover);
  }

  function dropPending(id: string) {
    setPending((items) => {
      const item = items.find((entry) => entry.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
        previewUrls.current.delete(item.previewUrl);
      }
      return items.filter((entry) => entry.id !== id);
    });
  }

  async function upload(file: File, item: PendingUpload) {
    const fail = (error: string) =>
      setPending((items) => items.map((entry) => (entry.id === item.id ? { ...entry, error } : entry)));

    const ticket = await createUploadTicket({ kind: "listing", contentType: file.type, size: file.size }).catch(() => null);
    if (!ticket) return fail("Upload failed. Check your connection and try again.");
    if (!ticket.ok) return fail(ticket.error);

    const { error } = await createClient()
      .storage.from(ticket.bucket)
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
    if (error) return fail("Upload failed. Please try again.");

    commit([...valueRef.current, { path: ticket.path, isPrimary: false }]);
    dropPending(item.id);
  }

  function addFiles(files: File[]) {
    setNotice(null);
    const slots = MAX_IMAGES - valueRef.current.length - uploading;
    if (files.length > slots) {
      setNotice(
        slots > 0
          ? `Only ${slots} more ${slots === 1 ? "photo fits" : "photos fit"}; the rest were skipped. Listings can have up to ${MAX_IMAGES}.`
          : `Listings can have up to ${MAX_IMAGES} photos. Remove one to add another.`,
      );
    }

    for (const file of files.slice(0, Math.max(slots, 0))) {
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      if (previewUrl) previewUrls.current.add(previewUrl);
      const item: PendingUpload = { id: crypto.randomUUID(), name: file.name, previewUrl };

      if (!(file.type in IMAGE_TYPES)) item.error = "Not a JPEG, PNG or WebP image.";
      else if (file.size > MAX_IMAGE_BYTES) item.error = "Larger than 5 MB.";

      setPending((items) => [...items, item]);
      if (!item.error) void upload(file, item);
    }
  }

  function remove(index: number) {
    const [removed] = value.slice(index, index + 1);
    const next = value.filter((_, i) => i !== index);
    commit(next.length && removed.isPrimary ? next.map((image, i) => ({ ...image, isPrimary: i === 0 })) : next);
    // Unsaved uploads can be deleted right away; saved photos are removed when the listing is saved.
    if (!savedPaths.has(removed.path)) {
      void createClient().storage.from(LISTING_IMAGES_BUCKET).remove([removed.path]);
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
  }

  function makeCover(index: number) {
    commit(value.map((image, i) => ({ ...image, isPrimary: i === index })));
  }

  const full = value.length + uploading >= MAX_IMAGES;

  return (
    <div className="grid gap-4">
      <div
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragOver(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
        aria-describedby={describedBy}
        className={cn(
          "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragOver ? "border-brand bg-brand/5" : invalid ? "border-destructive/60" : "border-input",
        )}
      >
        <ImagePlus className="size-8 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="font-semibold">Drag your photos here</p>
          <p className="text-sm text-muted-foreground">JPEG, PNG or WebP · up to 5 MB each · {MAX_IMAGES} photos max</p>
        </div>
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={full}>
          Choose photos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {value.length} of {MAX_IMAGES} photos
        {uploading > 0 && ` · uploading ${uploading}…`}
      </p>
      {notice && (
        <p role="status" className="text-sm text-destructive">
          {notice}
        </p>
      )}

      {(value.length > 0 || pending.length > 0) && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Photos">
          {value.map((image, index) => (
            <li
              key={image.path}
              draggable
              onDragStart={(event) => {
                setDraggedIndex(index);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                if (draggedIndex === null) return;
                event.preventDefault();
              }}
              onDrop={(event) => {
                if (draggedIndex === null) return;
                event.preventDefault();
                move(draggedIndex, index);
                setDraggedIndex(null);
              }}
              onDragEnd={() => setDraggedIndex(null)}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-muted",
                draggedIndex === index && "opacity-50",
              )}
            >
              <div className="relative aspect-[4/3] cursor-grab active:cursor-grabbing">
                <Image
                  src={publicStorageUrl(LISTING_IMAGES_BUCKET, image.path)}
                  alt={`Photo ${index + 1}${image.isPrimary ? " (cover)" : ""}`}
                  fill
                  sizes="(min-width: 640px) 220px, 45vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
              {image.isPrimary && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold shadow-sm">
                  <Star className="size-3 fill-current" aria-hidden="true" />
                  Cover
                </span>
              )}
              <div className="flex items-center justify-between gap-1 bg-background px-1.5 py-1.5">
                <div className="flex">
                  <IconButton label={`Move photo ${index + 1} earlier`} onClick={() => move(index, index - 1)} disabled={index === 0}>
                    <ArrowLeft />
                  </IconButton>
                  <IconButton
                    label={`Move photo ${index + 1} later`}
                    onClick={() => move(index, index + 1)}
                    disabled={index === value.length - 1}
                  >
                    <ArrowRight />
                  </IconButton>
                  <IconButton
                    label={image.isPrimary ? `Photo ${index + 1} is the cover` : `Make photo ${index + 1} the cover`}
                    onClick={() => makeCover(index)}
                    disabled={image.isPrimary}
                    pressed={image.isPrimary}
                  >
                    <Star className={cn(image.isPrimary && "fill-current")} />
                  </IconButton>
                </div>
                <IconButton label={`Remove photo ${index + 1}`} onClick={() => remove(index)}>
                  <Trash2 />
                </IconButton>
              </div>
            </li>
          ))}

          {pending.map((item) => (
            <li key={item.id} className="relative overflow-hidden rounded-xl border bg-muted">
              <div className="relative aspect-[4/3]">
                {item.previewUrl && (
                  <Image src={item.previewUrl} alt="" fill sizes="220px" className="object-cover opacity-50" unoptimized />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  {item.error ? (
                    <TriangleAlert className="size-6 text-destructive" aria-hidden="true" />
                  ) : (
                    <Loader2 className="size-6 animate-spin text-foreground" aria-label={`Uploading ${item.name}`} />
                  )}
                </div>
              </div>
              <div className="flex items-start justify-between gap-2 bg-background px-2.5 py-2 text-xs">
                <p className={cn("min-w-0", item.error ? "text-destructive" : "text-muted-foreground")} role={item.error ? "alert" : undefined}>
                  <span className="block truncate font-medium text-foreground">{item.name}</span>
                  {item.error ?? "Uploading…"}
                </p>
                {item.error && (
                  <IconButton label={`Dismiss ${item.name}`} onClick={() => dropPending(item.id)}>
                    <X />
                  </IconButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {value.length > 1 && (
        <p className="text-sm text-muted-foreground">
          Drag photos to reorder them, or use the arrows. The cover photo appears in search results.
        </p>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-30 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
