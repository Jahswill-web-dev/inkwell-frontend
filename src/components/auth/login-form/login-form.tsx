"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button/button";
import { FormField } from "@/components/ui/form-field/form-field";
import { safeProtectedPath } from "@/lib/auth/constants";
import {
  authErrorResponseSchema,
  loginMessages,
  loginSchema,
  type RegistrationSuccess,
} from "@/lib/auth/registration";
import { AuthDivider } from "../auth-divider/auth-divider";
import { GoogleAuthButton } from "../google-auth-button/google-auth-button";
import { PasswordField } from "../password-field/password-field";
import authStyles from "../auth.module.css";
import styles from "./login-form.module.css";

type LoginErrors = { email?: string; password?: string };

function readLogin(form: HTMLFormElement) {
  const data = new FormData(form);
  return loginSchema.safeParse({
    email: String(data.get("email") ?? ""),
    password: String(data.get("password") ?? ""),
  });
}

function validationErrors(result: ReturnType<typeof readLogin>): LoginErrors {
  if (result.success) return {};
  const errors: LoginErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if ((field === "email" || field === "password") && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

function apiFailure(error: unknown): { errors: LoginErrors; message: string } {
  const generic = "We couldn't sign you in. Try again.";
  if (!axios.isAxiosError(error)) return { errors: {}, message: generic };

  const result = authErrorResponseSchema.safeParse(error.response?.data);
  if (!result.success) return { errors: {}, message: generic };

  if (result.data.error.code === "invalid_credentials") {
    return { errors: {}, message: "Invalid email or password." };
  }

  if (result.data.error.code === "too_many_login_attempts") {
    const retryAfter = error.response?.headers?.["retry-after"];
    const seconds =
      typeof retryAfter === "string" && /^\d+$/.test(retryAfter)
        ? Number(retryAfter)
        : null;
    return {
      errors: {},
      message:
        seconds === null
          ? "Too many login attempts. Please try again later."
          : `Too many login attempts. Try again in ${seconds} seconds.`,
    };
  }

  if (
    result.data.error.code === "validation_error" &&
    result.data.error.details
  ) {
    const errors: LoginErrors = {};
    for (const detail of result.data.error.details) {
      const field = detail.loc.at(-1);
      if (field === "email") errors.email = loginMessages.email;
      if (field === "password") errors.password = loginMessages.password;
    }
    if (Object.keys(errors).length) return { errors, message: "" };
  }

  return { errors: {}, message: generic };
}

export function LoginForm({
  redirectTo = "/dashboard",
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const result = readLogin(event.currentTarget);
    const nextErrors = validationErrors(result);
    setErrors(nextErrors);
    setNotice("");
    setSubmitError("");
    if (!result.success) return;

    setIsSubmitting(true);
    try {
      await axios.post<RegistrationSuccess>("/api/auth/login", result.data, {
        headers: { "Content-Type": "application/json" },
      });
      router.replace(safeProtectedPath(redirectTo));
      router.refresh();
    } catch (error) {
      const failure = apiFailure(error);
      setErrors(failure.errors);
      setSubmitError(failure.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <header className={authStyles.formHeader}>
        <h2>Welcome back</h2>
        <p>Sign in to continue writing.</p>
      </header>

      <GoogleAuthButton
        className={authStyles.googleAction}
        onClick={() => setNotice("Google sign-in will be available soon.")}
      />
      <AuthDivider />

      <form className={authStyles.authForm} noValidate onSubmit={handleSubmit}>
        <FormField
          id="login-email"
          name="email"
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email}
        />
        <PasswordField
          id="login-password"
          autoComplete="current-password"
          minLength={1}
          maxLength={128}
          error={errors.password}
        />

        <div className={styles.optionsRow}>
          <Link
            className={styles.forgotLink}
            href="/forgot-password"
            prefetch={false}
          >
            Forgot password?
          </Link>
        </div>

        <Button
          className={authStyles.submitAction}
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          loadingLabel="Signing in..."
        >
          Sign in
        </Button>
      </form>

      {submitError ? (
        <p className={authStyles.formError} role="alert">
          {submitError}
        </p>
      ) : null}
      {notice ? (
        <p className={authStyles.formNotice} role="status">
          {notice}
        </p>
      ) : null}

      <p className={authStyles.accountPrompt}>
        New to Inkwell? <Link href="/signup">Create an account</Link>
      </p>
    </div>
  );
}
