import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton } from "@/components/forms/auth/auth-card";
import { ProfileForm } from "@/components/forms/profile-form";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Edit profile",
  robots: { index: false },
};

export default function EditProfilePage() {
  return (
    <main id="main" className="page-container max-w-xl flex-1 py-8 sm:py-12">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Edit profile</h1>
      <p className="mt-2 mb-10 text-muted-foreground">
        Your username and photo are public. Your email address never is.
      </p>
      <Suspense fallback={<AuthFormSkeleton fields={2} />}>
        <SignedInProfileForm />
      </Suspense>
    </main>
  );
}

async function SignedInProfileForm() {
  const user = await requireUser("/settings/profile");
  return <ProfileForm username={user.username} avatarUrl={user.avatarUrl} />;
}
