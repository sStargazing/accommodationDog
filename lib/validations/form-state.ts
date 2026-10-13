import { z } from "zod";

/** Shape returned by Server Actions used with useActionState. */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  /** Submitted non-secret values, echoed back so fields survive a failed submit. */
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

export function formValues(formData: FormData, keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? "")]));
}

export function validationError(error: z.ZodError, values?: Record<string, string>): FormState {
  return {
    status: "error",
    fieldErrors: z.flattenError(error).fieldErrors as FormState["fieldErrors"],
    values,
  };
}
