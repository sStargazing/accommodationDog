"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { Controller, get, useForm, useWatch, type Control, type FieldErrors, type FieldPath } from "react-hook-form";
import { FormMessage } from "@/components/forms/form-message";
import { AMENITY_ICONS } from "@/components/listings/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createListing, updateListing } from "@/lib/actions/listings";
import { AMENITIES, MAX_CUSTOM_AMENITIES, PROPERTY_TYPES } from "@/lib/listings/constants";
import { cn } from "@/lib/utils";
import {
  LISTING_FORM_STEPS,
  listingFormSchema,
  stepForField,
  type ListingFormValues,
} from "@/lib/validations/listing";
import { ImageUploader } from "./image-uploader";
import { ListingPreview } from "./listing-preview";

type ListingFormProps =
  | { mode: "create" }
  | { mode: "edit"; listingId: string; initialValues: Omit<ListingFormValues, "confirmFictional" | "confirmImageRights"> };

const EMPTY: Partial<ListingFormValues> = {
  title: "",
  description: "",
  city: "",
  country: "",
  max_guests: 2,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  cleaning_fee: 0,
  service_fee: 0,
  amenities: { standard: [], custom: [] },
  images: [],
  confirmFictional: false,
  confirmImageRights: false,
};

export function ListingForm(props: ListingFormProps) {
  const editing = props.mode === "edit";
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: editing ? { ...props.initialValues, confirmFictional: false, confirmImageRights: false } : EMPTY,
    mode: "onTouched",
  });
  const { register, control, formState, trigger, handleSubmit, setError } = form;
  const errors = formState.errors;

  const [step, setStep] = useState(0);
  // Steps you can jump to from the progress bar: all when editing, visited ones when creating.
  const [furthestStep, setFurthestStep] = useState(editing ? LISTING_FORM_STEPS.length - 1 : 0);
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const savedPaths = useMemo(
    () => new Set(editing ? props.initialValues.images.map((image) => image.path) : []),
    // Only the photos that were saved when the form opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!formState.isDirty || submitting) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [formState.isDirty, submitting]);

  const goTo = useCallback((next: number) => {
    setStep(next);
    setFurthestStep((furthest) => Math.max(furthest, next));
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }, []);

  async function next() {
    const fields = LISTING_FORM_STEPS[step].fields as readonly FieldPath<ListingFormValues>[];
    if (await trigger(fields, { shouldFocus: true })) goTo(step + 1);
  }

  function jumpToFirstError(fieldErrors: FieldErrors<ListingFormValues>) {
    const first = Object.keys(fieldErrors)[0];
    if (first) goTo(stepForField(first));
  }

  function onValid(values: ListingFormValues) {
    setServerError(null);
    startSubmit(async () => {
      const result = editing ? await updateListing(props.listingId, values) : await createListing(values);
      if (!result) {
        // Published: the action is redirecting to the new listing. Next keeps
        // recently visited pages alive in the background, so clear the form
        // now or "Create listing" would reopen this one, ready to post twice.
        if (!editing) {
          form.reset(EMPTY);
          setStep(0);
          setFurthestStep(0);
        }
        return;
      }
      setServerError(result.error);
      const fieldErrors = Object.entries(result.fieldErrors ?? {});
      for (const [field, messages] of fieldErrors) {
        if (messages?.length) setError(field as FieldPath<ListingFormValues>, { message: messages[0] });
      }
      if (fieldErrors.length) goTo(stepForField(fieldErrors[0][0]));
    });
  }

  const isLast = step === LISTING_FORM_STEPS.length - 1;

  return (
    <form onSubmit={(event) => void handleSubmit(onValid, jumpToFirstError)(event)} noValidate className="grid gap-8">
      <StepIndicator current={step} furthest={furthestStep} onSelect={(index) => goTo(index)} />

      <div className="grid gap-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Step {step + 1} of {LISTING_FORM_STEPS.length}
          </p>
          <h2 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold tracking-tight outline-none">
            {STEP_HEADINGS[step]}
          </h2>
        </div>

        {serverError && <FormMessage tone="error">{serverError}</FormMessage>}

        {step === 0 && (
          <div className="grid gap-6">
            <Field label="Listing title" name="title" errors={errors} counter={<Counter control={control} name="title" max={100} />}>
              {(field) => (
                <Input {...field} {...register("title")} placeholder="e.g. Haunted Lighthouse With Strong Opinions" maxLength={120} />
              )}
            </Field>
            <Field
              label="Description"
              name="description"
              errors={errors}
              hint="What makes it unforgettable, uninhabitable or both? Plain text; line breaks are kept."
              counter={<Counter control={control} name="description" max={3000} />}
            >
              {(field) => <Textarea {...field} {...register("description")} rows={8} className="min-h-40 px-3.5 py-3" />}
            </Field>
            <Field label="Property type" name="property_type" errors={errors}>
              {(field) => (
                <Controller
                  control={control}
                  name="property_type"
                  render={({ field: { value, onChange, onBlur, ref, name } }) => (
                    <select
                      {...field}
                      ref={ref}
                      name={name}
                      value={value ?? ""}
                      onChange={(event) => onChange(event.target.value)}
                      onBlur={onBlur}
                      className={selectClass}
                    >
                      <option value="" disabled>
                        Choose a type
                      </option>
                      {PROPERTY_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
              )}
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="City or town" name="city" errors={errors}>
                {(field) => <Input {...field} {...register("city")} placeholder="e.g. Foghorn Point" autoComplete="off" />}
              </Field>
              <Field label="Country" name="country" errors={errors}>
                {(field) => <Input {...field} {...register("country")} placeholder="e.g. Ireland" autoComplete="off" />}
              </Field>
            </div>
            <p className="text-sm text-muted-foreground">
              Only the city and country are shown. Never enter a real street address or someone&apos;s home.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-8">
            <fieldset className="grid gap-4">
              <legend className="mb-2 font-semibold">The space</legend>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(
                  [
                    ["max_guests", "Max guests", 1, 1],
                    ["bedrooms", "Bedrooms", 0, 1],
                    ["beds", "Beds", 0, 1],
                    ["bathrooms", "Bathrooms", 0, 0.5],
                  ] as const
                ).map(([name, label, min, stepSize]) => (
                  <Field key={name} label={label} name={name} errors={errors}>
                    {(field) => (
                      <Input
                        {...field}
                        {...register(name, { valueAsNumber: true })}
                        type="number"
                        inputMode={stepSize === 1 ? "numeric" : "decimal"}
                        min={min}
                        step={stepSize}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </fieldset>
            <fieldset className="grid gap-4">
              <legend className="mb-1 font-semibold">Pricing</legend>
              <p className="-mt-2 text-sm text-muted-foreground">
                All prices are simulated. Nobody will ever pay them, which is why you can be as ambitious as you like.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ["nightly_price", "Price per night"],
                    ["cleaning_fee", "Cleaning fee"],
                    ["service_fee", "Service fee"],
                  ] as const
                ).map(([name, label]) => (
                  <Field key={name} label={label} name={name} errors={errors}>
                    {(field) => (
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          {...field}
                          {...register(name, { valueAsNumber: true })}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.01}
                          className="pl-7"
                        />
                      </div>
                    )}
                  </Field>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-8">
            <Controller
              control={control}
              name="amenities.standard"
              render={({ field }) => (
                <fieldset>
                  <legend className="mb-3 font-semibold">Standard amenities</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {AMENITIES.map(({ value, label }) => {
                      const Icon = AMENITY_ICONS[value];
                      const checked = field.value.includes(value);
                      return (
                        <label
                          key={value}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-sm has-checked:border-foreground has-checked:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              field.onChange(checked ? field.value.filter((item) => item !== value) : [...field.value, value])
                            }
                            className="size-4 accent-foreground"
                          />
                          <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            />
            <Controller
              control={control}
              name="amenities.custom"
              render={({ field }) => (
                <CustomAmenities value={field.value} onChange={field.onChange} error={errorText(errors, "amenities.custom")} />
              )}
            />
          </div>
        )}

        {step === 3 && (
          <Controller
            control={control}
            name="images"
            render={({ field }) => {
              const error = errorText(errors, "images");
              return (
                <div className="grid gap-2">
                  <ImageUploader
                    value={field.value}
                    onChange={(images) => {
                      field.onChange(images);
                      if (formState.isSubmitted || error) void trigger("images");
                    }}
                    savedPaths={savedPaths}
                    onBusyChange={setUploading}
                    invalid={Boolean(error)}
                    describedBy={error ? "images-error" : undefined}
                  />
                  {error && (
                    <p id="images-error" className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </div>
              );
            }}
          />
        )}

        {step === 4 && (
          <div className="grid gap-8">
            <ListingPreview values={form.getValues()} />
            <fieldset className="grid gap-3 rounded-2xl border bg-muted/40 p-5">
              <legend className="sr-only">Confirmations</legend>
              {(
                [
                  ["confirmFictional", "This listing is fictional. It isn't a real place to stay, doesn't impersonate a real host or business, and doesn't target a real person."],
                  ["confirmImageRights", "I took these photos or have permission to use them, and they don't show anyone's private information."],
                ] as const
              ).map(([name, label]) => {
                const error = errorText(errors, name);
                return (
                  <div key={name} className="grid gap-1">
                    <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                      <input
                        type="checkbox"
                        {...register(name)}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${name}-error` : undefined}
                        className="mt-1 size-4 shrink-0 accent-foreground"
                      />
                      {label}
                    </label>
                    {error && (
                      <p id={`${name}-error`} className="pl-7 text-sm text-destructive">
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
            </fieldset>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-6">
        {step > 0 ? (
          <Button type="button" variant="ghost" size="lg" onMouseDown={keepFocus} onClick={() => goTo(step - 1)} disabled={submitting}>
            <ChevronLeft aria-hidden="true" />
            Back
          </Button>
        ) : (
          <span />
        )}
        {isLast ? (
          // Distinct keys: React must not reuse the Next button as the submit
          // button, or the click that reaches the last step would also submit.
          <Button key="publish" type="submit" size="lg" onMouseDown={keepFocus} disabled={submitting || uploading}>
            {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {submitting ? (editing ? "Saving…" : "Publishing…") : editing ? "Save changes" : "Publish listing"}
          </Button>
        ) : (
          <Button
            key="next"
            type="button"
            size="lg"
            onMouseDown={keepFocus}
            onClick={(event) => {
              event.preventDefault();
              void next();
            }}
            disabled={uploading}
          >
            {uploading ? "Uploading photos…" : "Next"}
            {!uploading && <ChevronRight aria-hidden="true" />}
          </Button>
        )}
      </div>
    </form>
  );
}

/**
 * Pressing a navigation button would normally blur the current field first.
 * That blur re-validates the field, and if its error message disappears the
 * page shifts and the button moves out from under the pointer before the
 * click lands. Keeping focus where it is avoids the lost click; the button's
 * own handler validates everything anyway.
 */
function keepFocus(event: React.MouseEvent) {
  event.preventDefault();
}

const STEP_HEADINGS = [
  "Tell us about your place",
  "Rooms, beds and (fictional) prices",
  "What does it offer?",
  "Add some photos",
  "Preview and publish",
];

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm";

function errorText(errors: FieldErrors<ListingFormValues>, name: string): string | undefined {
  const error = get(errors, name);
  return error?.message ?? error?.root?.message;
}

/** Label, hint and error wiring for one input. */
function Field({
  label,
  name,
  errors,
  hint,
  counter,
  children,
}: {
  label: string;
  name: string;
  errors: FieldErrors<ListingFormValues>;
  hint?: string;
  counter?: ReactNode;
  children: (field: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const error = errorText(errors, name);
  const describedBy = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="grid content-start gap-2">
      <div className="flex items-end justify-between gap-2">
        <Label htmlFor={name}>{label}</Label>
        {counter}
      </div>
      {children({ id: name, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={`${name}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Counter({
  control,
  name,
  max,
}: {
  control: Control<ListingFormValues>;
  name: "title" | "description";
  max: number;
}) {
  const length = useWatch({ control, name })?.length ?? 0;
  return (
    <span className={cn("text-xs tabular-nums", length > max ? "text-destructive" : "text-muted-foreground")}>
      {length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
    </span>
  );
}

function CustomAmenities({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const full = value.length >= MAX_CUSTOM_AMENITIES;

  function add() {
    const amenity = draft.trim();
    if (!amenity) return;
    if (amenity.length > 40) return setLocalError("Keep custom amenities to 40 characters.");
    if (value.some((item) => item.toLowerCase() === amenity.toLowerCase())) return setLocalError("You've already added that one.");
    onChange([...value, amenity]);
    setDraft("");
    setLocalError(null);
  }

  const message = localError ?? error;
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 font-semibold">Custom amenities</legend>
      <p className="-mt-2 text-sm text-muted-foreground">
        Up to {MAX_CUSTOM_AMENITIES}. A moat of soup, a resident ghost, a strongly worded goose.
      </p>
      <div className="flex gap-2">
        <Label htmlFor="custom-amenity" className="sr-only">
          New custom amenity
        </Label>
        <Input
          id="custom-amenity"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={full ? "That's the maximum" : "e.g. Drawbridge"}
          maxLength={60}
          disabled={full}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? "custom-amenity-error" : undefined}
        />
        <Button type="button" variant="outline" className="h-11 shrink-0" onClick={add} disabled={full || !draft.trim()}>
          <Plus aria-hidden="true" />
          Add
        </Button>
      </div>
      {message && (
        <p id="custom-amenity-error" className="text-sm text-destructive">
          {message}
        </p>
      )}
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Custom amenities">
          {value.map((amenity) => (
            <li key={amenity} className="inline-flex items-center gap-1 rounded-full border bg-muted py-1 pr-1 pl-3 text-sm">
              {amenity}
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== amenity))}
                aria-label={`Remove ${amenity}`}
                className="flex size-6 items-center justify-center rounded-full outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

function StepIndicator({
  current,
  furthest,
  onSelect,
}: {
  current: number;
  furthest: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav aria-label="Listing steps">
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300"
          style={{ width: `${((current + 1) / LISTING_FORM_STEPS.length) * 100}%` }}
        />
      </div>
      <ol className="flex justify-between gap-2">
        {LISTING_FORM_STEPS.map(({ title }, index) => {
          const done = index < current;
          const reachable = index <= furthest;
          return (
            <li key={title} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onSelect(index)}
                disabled={!reachable}
                aria-current={index === current ? "step" : undefined}
                className="flex w-full flex-col items-center gap-1.5 rounded-lg py-1 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed sm:flex-row sm:text-sm"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs",
                    index === current && "border-foreground bg-foreground text-background",
                    done && "border-brand bg-brand text-white",
                    !done && index !== current && "text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span className={cn("truncate", index === current ? "text-foreground" : "text-muted-foreground")}>
                  {title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
