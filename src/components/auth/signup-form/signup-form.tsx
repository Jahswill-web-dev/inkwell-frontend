"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button/button";
import { FormField } from "@/components/ui/form-field/form-field";
import { AuthDivider } from "../auth-divider/auth-divider";
import styles from "../auth.module.css";
import { GoogleAuthButton } from "../google-auth-button/google-auth-button";
import { PasswordField } from "../password-field/password-field";

type SignupErrors = {
  email?: string;
  password?: string;
};

function getSignupErrors(form: HTMLFormElement): SignupErrors {
  const data = new FormData(form);
  const email = String(data.get("email") ?? "").trim();
  const password = String(data.get("password") ?? "");
  const errors: SignupErrors = {};

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }

  return errors;
}

export function SignupForm() {
  const [errors, setErrors] = useState<SignupErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = getSignupErrors(event.currentTarget);
    setErrors(nextErrors);
    setNotice("");

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      setNotice("Your account is ready. Onboarding will open next.");
    }, 500);
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

        <PasswordField id="password" error={errors.password} />

        <Button
          className={styles.submitAction}
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          loadingLabel="Creating account…"
        >
          Create account
        </Button>
      </form>

      {notice ? (
        <p className={styles.formNotice} role="status">
          {notice}
        </p>
      ) : null}

      <p className={styles.accountPrompt}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>

      <p className={styles.legalCopy}>
        By creating an account, you agree to Inkwell’s
        <br />
        <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );
}
