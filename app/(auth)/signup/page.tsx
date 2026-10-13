import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/forms/auth/auth-card";
import { SignUpForm } from "@/components/forms/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Sign up",
  alternates: { canonical: "/signup" },
};

export default function SignUpPage() {
  return (
    <AuthCard
      title="Join the pack"
      description="Create an account to list your place, save favourites and write reviews."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
