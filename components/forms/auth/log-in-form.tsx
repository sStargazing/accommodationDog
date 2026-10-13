"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { logIn } from "@/lib/actions/auth";
import { initialFormState } from "@/lib/validations/form-state";

const LINK_ERRORS: Record<string, string> = {
  link_expired: "That link has expired or was already used. Log in, or request a new link.",
};

export function LogInForm() {
  const searchParams = useSearchParams();
  const [state, action] = useActionState(logIn, initialFormState);
  const linkError = LINK_ERRORS[searchParams.get("error") ?? ""];

  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="next" value={searchParams.get("next") ?? "/"} />

      {state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : (
        linkError && <FormMessage tone="error">{linkError}</FormMessage>
      )}

      <FormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
        labelAction={
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        }
      />

      <SubmitButton pendingLabel="Logging in…" className="w-full">
        Log in
      </SubmitButton>
    </form>
  );
}
