"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button/button";
import { FormField } from "@/components/ui/form-field/form-field";
import {
  authErrorResponseSchema,
  registrationMessages,
  registrationSchema,
  type RegistrationSuccess,
} from "@/lib/auth/registration";
import { AuthDivider } from "../auth-divider/auth-divider";
import styles from "../auth.module.css";
import { GoogleAuthButton } from "../google-auth-button/google-auth-button";
import { PasswordField } from "../password-field/password-field";

type SignupErrors = {
  email?: string;
  username?: string;
  password?: string;
};

const fieldMessages: Record<keyof SignupErrors, string> = {
  email: registrationMessages.email,
  username: registrationMessages.username,
  password: registrationMessages.password,
};

function getSignupInput(form: HTMLFormElement) {
  const data = new FormData(form);
  return registrationSchema.safeParse({
    email: String(data.get("email") ?? ""),
    username: String(data.get("username") ?? ""),
    password: String(data.get("password") ?? ""),
  });
}

function getSignupErrors(
  result: ReturnType<typeof getSignupInput>,
): SignupErrors {
  const errors: SignupErrors = {};
  if (result.success) return errors;

  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (
      (field === "email" || field === "username" || field === "password") &&
      !errors[field]
    ) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

function getApiErrors(error: unknown): {
  errors: SignupErrors;
  message: string;
} {
  const genericMessage = "We couldn't create your account. Try again.";

  if (!axios.isAxiosError(error)) {
    return { errors: {}, message: genericMessage };
  }

  const parsed = authErrorResponseSchema.safeParse(error.response?.data);
  if (!parsed.success) {
    return { errors: {}, message: genericMessage };
  }

  const { code, details } = parsed.data.error;

  if (code === "email_already_registered") {
    return {
      errors: { email: "An account with this email already exists." },
      message: "",
    };
  }

  if (code === "username_taken") {
    return {
      errors: { username: "This username is already taken." },
      message: "",
    };
  }

  if (code === "validation_error" && details) {
    const errors: SignupErrors = {};
    for (const detail of details) {
      const field = detail.loc.at(-1);
      if (
        (field === "email" || field === "username" || field === "password") &&
        !errors[field]
      ) {
        errors[field] = fieldMessages[field];
      }
    }

    if (Object.keys(errors).length > 0) return { errors, message: "" };
  }

  return { errors: {}, message: genericMessage };
}

export function SignupForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<SignupErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const result = getSignupInput(event.currentTarget);
    const nextErrors = getSignupErrors(result);
    setErrors(nextErrors);
    setNotice("");
    setSubmitError("");

    if (!result.success) return;

    setIsSubmitting(true);
    try {
      await axios.post<RegistrationSuccess>("/api/auth/register", result.data, {
        headers: { "Content-Type": "application/json" },
      });
      router.push("/onboarding");
    } catch (error) {
      const apiErrors = getApiErrors(error);
      setErrors(apiErrors.errors);
      setSubmitError(apiErrors.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <header className={styles.formHeader}>
        <h2>Create your account</h2>
        <p>Start writing better articles with AI that works with you.</p>
      </header>

      <GoogleAuthButton
        className={styles.googleAction}
        onClick={() => setNotice("Google sign-up will be available soon.")}
      />

      <AuthDivider />

      <form className={styles.authForm} noValidate onSubmit={handleSubmit}>
        <FormField
          id="email"
          name="email"
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email}
        />

        <FormField
          id="username"
          name="username"
          label="Username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="writer_01"
          error={errors.username}
        />

        <PasswordField
          id="password"
          minLength={8}
          maxLength={128}
          error={errors.password}
        />

        <Button
          className={styles.submitAction}
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          loadingLabel="Creating account..."
        >
          Create account
        </Button>
      </form>

      {submitError ? (
        <p className={styles.formError} role="alert">
          {submitError}
        </p>
      ) : null}

      {notice ? (
        <p className={styles.formNotice} role="status">
          {notice}
        </p>
      ) : null}

      <p className={styles.accountPrompt}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>

      <p className={styles.legalCopy}>
        By creating an account, you agree to Inkwell&apos;s
        <br />
        <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );
}
