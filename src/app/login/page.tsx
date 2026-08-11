import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Inkwell and continue writing.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthLayout ariaLabel="Account login">
      <LoginForm redirectTo={next} />
    </AuthLayout>
  );
}
