import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormFieldProps = ComponentProps<typeof Input> & {
  name: string;
  label: string;
  errors?: string[];
  hint?: ReactNode;
  labelAction?: ReactNode;
};

/** Labelled input with accessible hint and error text. */
export function FormField({ name, label, errors, hint, labelAction, id = name, ...inputProps }: FormFieldProps) {
  const errorId = errors?.length ? `${id}-error` : undefined;
  // An error replaces the hint rather than stacking under it.
  const hintId = hint && !errorId ? `${id}-hint` : undefined;

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>
      <Input
        id={id}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        {...inputProps}
      />
      {hintId && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {errorId && (
        <p id={errorId} className="text-sm text-destructive">
          {errors![0]}
        </p>
      )}
    </div>
  );
}
