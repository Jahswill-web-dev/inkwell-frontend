import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignupForm } from "@/components/auth/signup-form/signup-form";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create your Inkwell account and start turning ideas into articles worth reading.",
};

export default function SignupPage() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}
