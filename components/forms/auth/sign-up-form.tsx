"use client";

import { useActionState } from "react";
import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { signUp } from "@/lib/actions/auth";
import { initialFormState } from "@/lib/validations/form-state";

export function SignUpForm() {
  const [state, action] = useActionState(signUp, initialFormState);

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={action} className="grid gap-5" noValidate>
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}

      <FormField
        name="username"
        label="Username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        minLength={3}
        maxLength={30}
        defaultValue={state.values?.username}
        errors={state.fieldErrors?.username}
        hint="Shown on your listings and reviews. Letters, numbers and underscores."
      />
      <FormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
        hint="Never shown publicly."
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        errors={state.fieldErrors?.password}
        hint="At least 8 characters."
      />

      <SubmitButton pendingLabel="Creating account…" className="w-full">
        Create account
      </SubmitButton>
    </form>
  );
}
