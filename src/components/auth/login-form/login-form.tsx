"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { FormField } from "@/components/ui/form-field/form-field";
import { AuthDivider } from "../auth-divider/auth-divider";
import { GoogleAuthButton } from "../google-auth-button/google-auth-button";
import { PasswordField } from "../password-field/password-field";
import authStyles from "../auth.module.css";
import styles from "./login-form.module.css";

type LoginErrors = {
  email?: string;
  password?: string;
};

function getLoginErrors(form: HTMLFormElement): LoginErrors {
  const data = new FormData(form);
  const email = String(data.get("email") ?? "").trim();
  const password = String(data.get("password") ?? "");
  const errors: LoginErrors = {};

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!password) {
    errors.password = "Enter your password.";
  }

  return errors;
}

export function LoginForm() {
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = getLoginErrors(event.currentTarget);
    setErrors(nextErrors);
    setNotice("");

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      setNotice("You’re signed in. Your dashboard will open next.");
    }, 500);
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
          error={errors.password}
        />

        <div className={styles.optionsRow}>
          <Checkbox
            id="remember-me"
            name="remember"
            label="Remember me"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
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
          loadingLabel="Signing in…"
        >
          Sign in
        </Button>
      </form>

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
