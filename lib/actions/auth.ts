"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";
import { getSiteUrl } from "@/lib/utils/site-url";
import {
  forgotPasswordSchema,
  logInSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validations/auth";
import { formValues, validationError, type FormState } from "@/lib/validations/form-state";

const NOT_CONFIGURED: FormState = {
  status: "error",
  message: "Accounts aren't available yet: Supabase hasn't been configured for this deployment.",
};

function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password don't match. Even imaginary doors need the right key.";
    case "email_not_confirmed":
      return "Please confirm your email address first. Check your inbox for the link.";
    case "user_already_exists":
    case "email_exists":
      return "An account with that email already exists. Try logging in instead.";
    case "weak_password":
      return "That password is too easy to guess. Try something longer or less common.";
    case "same_password":
      return "Your new password must be different from your current one.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "signup_disabled":
      return "New sign-ups are currently closed.";
    default:
      return "Something went wrong on our side. Please try again.";
  }
}

export async function signUp(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["username", "email"]);
  const parsed = signUpSchema.safeParse({ ...values, password: formData.get("password") });
  if (!parsed.success) return validationError(parsed.error, values);
  if (!isSupabaseConfigured) return { ...NOT_CONFIGURED, values };
  const { username, email, password } = parsed.data;

  const supabase = await createClient();

  // Friendly early check. The unique constraint on profiles.username is the real guard.
  const { data: existing } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (existing) {
    return { status: "error", fieldErrors: { username: ["That username is already taken."] }, values };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${await getSiteUrl()}/auth/confirm?next=/`,
    },
  });

  if (error) {
    // The profile trigger rejects a username that was taken between the check and the insert.
    if (error.code === "unexpected_failure") {
      return {
        status: "error",
        fieldErrors: { username: ["We couldn't reserve this username. It may have just been taken."] },
        values,
      };
    }
    return { status: "error", message: authErrorMessage(error), values };
  }

  // With email confirmation enabled there is no session until the link is clicked.
  if (!data.session) {
    return {
      status: "success",
      message: `We've sent a confirmation link to ${email}. Click it to activate your account.`,
    };
  }

  redirect("/");
}

export async function logIn(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email"]);
  const parsed = logInSchema.safeParse({ ...values, password: formData.get("password") });
  if (!parsed.success) return validationError(parsed.error, values);
  if (!isSupabaseConfigured) return { ...NOT_CONFIGURED, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: authErrorMessage(error), values };

  redirect(safeRedirectPath(formData.get("next")));
}

export async function logOut(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function requestPasswordReset(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email"]);
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  if (!isSupabaseConfigured) return { ...NOT_CONFIGURED, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await getSiteUrl()}/auth/confirm?next=/reset-password`,
  });

  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return { status: "error", message: authErrorMessage(error), values };
  }

  // Same answer whether or not the account exists, so emails can't be enumerated.
  return {
    status: "success",
    message: `If an account exists for ${parsed.data.email}, a password reset link is on its way.`,
  };
}

export async function resetPassword(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return validationError(parsed.error);
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return {
      status: "error",
      message: "Your reset link has expired or was already used. Request a new one to continue.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error) };

  return { status: "success", message: "Your password has been updated." };
}
