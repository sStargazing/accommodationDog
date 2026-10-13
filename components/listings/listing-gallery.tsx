"use client";

import { Grid2x2, ImageOff } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ListingImage } from "@/lib/queries/listings";
import { cn } from "@/lib/utils";

/** Grid cell spans for the desktop mosaic, by number of photos. */
export function mosaicClasses(count: number): string[] {
  if (count === 1) return ["col-span-4 row-span-2"];
  if (count === 2) return ["col-span-2 row-span-2", "col-span-2 row-span-2"];
  if (count === 3) return ["col-span-2 row-span-2", "col-span-2", "col-span-2"];
  if (count === 4) return ["col-span-2 row-span-2", "col-span-2", "", ""];
  return ["col-span-2 row-span-2", "", "", "", ""];
}

export function ListingGallery({ images, title }: { images: ListingImage[]; title: string }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState(0);
  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [mobileIndex, setMobileIndex] = useState(0);

  useEffect(() => {
    if (!mobileApi) return;
    const onSelect = () => setMobileIndex(mobileApi.selectedScrollSnap());
    mobileApi.on("select", onSelect);
    return () => {
      mobileApi.off("select", onSelect);
    };
  }, [mobileApi]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[2/1] items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <ImageOff className="size-10" aria-hidden="true" />
        <span className="sr-only">No photos</span>
      </div>
    );
  }

  const alt = (index: number) => `${title}, photo ${index + 1} of ${images.length}`;
  const openViewer = (index: number) => {
    setViewerStart(index);
    setViewerOpen(true);
  };
  const mosaic = images.slice(0, 5);
  const spans = mosaicClasses(mosaic.length);

  return (
    <>
      {/* Phones and small tablets: swipeable carousel. */}
      <div className="relative -mx-4 sm:mx-0 md:hidden">
        <Carousel setApi={setMobileApi} aria-label={`Photos of ${title}`}>
          <CarouselContent className="ml-0">
            {images.map((image, index) => (
              <CarouselItem key={image.id} className="pl-0">
                <button
                  type="button"
                  onClick={() => openViewer(index)}
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:rounded-2xl"
                  aria-label={`Open ${alt(index)} full screen`}
                >
                  <Image
                    src={image.url}
                    alt={alt(index)}
                    fill
                    sizes="100vw"
                    // The first photo is the main image on phones.
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    className="object-cover"
                  />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-black/65 px-2 py-1 text-xs font-medium text-white tabular-nums">
          {mobileIndex + 1} / {images.length}
        </span>
      </div>

      {/* Desktop: one large photo plus up to four smaller ones. */}
      <div className="relative hidden h-[min(60vh,32rem)] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl md:grid">
        {mosaic.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => openViewer(index)}
            className={cn(
              "group relative overflow-hidden bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset",
              spans[index],
            )}
            aria-label={`Open ${alt(index)} full screen`}
          >
            <Image
              src={image.url}
              alt={alt(index)}
              fill
              sizes={index === 0 ? "(min-width: 1440px) 680px, 50vw" : "(min-width: 1440px) 340px, 25vw"}
              // Hidden on phones, so not eager: lazy images that aren't displayed never download.
              fetchPriority={index === 0 ? "high" : "auto"}
              className="object-cover transition duration-300 group-hover:brightness-90"
            />
          </button>
        ))}
        <button
          type="button"
          onClick={() => openViewer(0)}
          className="absolute right-4 bottom-4 inline-flex h-9 items-center gap-2 rounded-lg border border-foreground/80 bg-background px-3 text-sm font-semibold shadow-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Grid2x2 className="size-4" aria-hidden="true" />
          Show all {images.length} photos
        </button>
      </div>

      <PhotoViewer images={images} title={title} open={viewerOpen} onOpenChange={setViewerOpen} startIndex={viewerStart} />
    </>
  );
}

function PhotoViewer({
  images,
  title,
  open,
  onOpenChange,
  startIndex,
}: {
  images: ListingImage[];
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startIndex: number;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Arrow keys work wherever focus is inside the dialog.
  useEffect(() => {
    if (!open || !api) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") api.scrollPrev();
      if (event.key === "ArrowRight") api.scrollNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, api]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-0 left-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-neutral-950 p-0 text-white ring-0 sm:max-w-none [&_[data-slot=dialog-close]]:top-3 [&_[data-slot=dialog-close]]:right-3 [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10"
      >
        <div className="flex h-14 shrink-0 items-center px-4 pr-14">
          <DialogTitle className="truncate text-sm font-medium">{title}</DialogTitle>
          <DialogDescription className="sr-only">Use the arrow keys or swipe to browse photos.</DialogDescription>
          <span className="ml-auto text-sm text-white/70 tabular-nums" aria-live="polite">
            {index + 1} / {images.length}
          </span>
        </div>
        <Carousel
          key={startIndex}
          setApi={setApi}
          opts={{ startIndex }}
          className="min-h-0 flex-1 [&_[data-slot=carousel-content]]:h-full"
          aria-label={`Photos of ${title}`}
        >
          <CarouselContent className="ml-0 h-full">
            {images.map((image, i) => (
              <CarouselItem key={image.id} className="relative h-full pl-0">
                <Image
                  src={image.url}
                  alt={`${title}, photo ${i + 1} of ${images.length}`}
                  fill
                  sizes="100vw"
                  className="object-contain p-2 sm:p-10"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-4 hidden size-11 border-white/30 bg-black/40 text-white hover:bg-black/70 hover:text-white disabled:opacity-0 sm:flex" />
          <CarouselNext className="right-4 hidden size-11 border-white/30 bg-black/40 text-white hover:bg-black/70 hover:text-white disabled:opacity-0 sm:flex" />
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
