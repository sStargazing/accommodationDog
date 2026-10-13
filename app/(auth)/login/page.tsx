import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, AuthFormSkeleton } from "@/components/forms/auth/auth-card";
import { LogInForm } from "@/components/forms/auth/log-in-form";

export const metadata: Metadata = {
  title: "Log in",
  alternates: { canonical: "/login" },
};

export default function LogInPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Log in to list, review and save stays."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {/* The form reads ?next= and ?error= from the URL. */}
      <Suspense fallback={<AuthFormSkeleton fields={2} />}>
        <LogInForm />
      </Suspense>
    </AuthCard>
  );
}
