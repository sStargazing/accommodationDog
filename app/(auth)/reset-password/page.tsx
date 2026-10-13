import type { Metadata } from "next";
import { AuthCard } from "@/components/forms/auth/auth-card";
import { ResetPasswordForm } from "@/components/forms/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" description="Pick something memorable, but not guessable.">
      <ResetPasswordForm />
    </AuthCard>
  );
}
