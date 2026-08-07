import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Inkwell and continue writing.",
};

export default function LoginPage() {
  return (
    <AuthLayout ariaLabel="Account login">
      <LoginForm />
    </AuthLayout>
  );
}
