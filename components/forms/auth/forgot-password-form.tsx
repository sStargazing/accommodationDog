"use client";

import { useActionState } from "react";
import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { requestPasswordReset } from "@/lib/actions/auth";
import { initialFormState } from "@/lib/validations/form-state";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initialFormState);

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={action} className="grid gap-5" noValidate>
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}

      <FormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />

      <SubmitButton pendingLabel="Sending link…" className="w-full">
        Send reset link
      </SubmitButton>
    </form>
  );
}
