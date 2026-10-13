import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/forms/auth/auth-card";
import { ForgotPasswordForm } from "@/components/forms/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  alternates: { canonical: "/forgot-password" },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      description="It happens to the best of us. Enter your email and we'll send you a reset link."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
