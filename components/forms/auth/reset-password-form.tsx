"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/lib/actions/auth";
import { initialFormState } from "@/lib/validations/form-state";

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPassword, initialFormState);

  if (state.status === "success") {
    return (
      <div className="grid gap-5">
        <FormMessage tone="success">{state.message}</FormMessage>
        <Button asChild size="lg" className="w-full">
          <Link href="/">Continue exploring</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5" noValidate>
      {state.message && (
        <FormMessage tone="error">
          {state.message}{" "}
          <Link href="/forgot-password" className="font-medium underline underline-offset-2">
            Request a new link
          </Link>
        </FormMessage>
      )}

      <FormField
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        errors={state.fieldErrors?.password}
        hint="At least 8 characters."
      />
      <FormField
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirmPassword}
      />

      <SubmitButton pendingLabel="Saving…" className="w-full">
        Update password
      </SubmitButton>
    </form>
  );
}
