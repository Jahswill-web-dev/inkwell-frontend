"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useEffect } from "react";
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
  const [experience, setExperience] = useState<"marketing" | "consultant">(
    "marketing",
  );
  const [step, setStep] = useState<"choose" | "account">("choose");
  const [consultantEnabled, setConsultantEnabled] = useState(false);
  useEffect(() => {
    const saved = new URL(window.location.href).searchParams.get("experience");
    const timer = window.setTimeout(() => {
      if (saved === "consultant" || saved === "marketing") {
        setExperience(saved);
        setStep(
          new URL(window.location.href).searchParams.get("step") === "choose"
            ? "choose"
            : "account",
        );
      }
    }, 0);
    fetch("/api/consultant/availability")
      .then((r) => r.json())
      .then((value) => setConsultantEnabled(value.enabled === true))
      .catch(() => {});
    return () => window.clearTimeout(timer);
  }, []);
  function choose() {
    const url = new URL(window.location.href);
    url.searchParams.set("experience", experience);
    url.searchParams.set("step", "account");
    window.history.replaceState(null, "", url);
    setStep("account");
  }

  function selectExperience(value: "marketing" | "consultant") {
    setExperience(value);
    const url = new URL(window.location.href);
    url.searchParams.set("experience", value);
    url.searchParams.set("step", "choose");
    window.history.replaceState(null, "", url);
  }
  function back() {
    setStep("choose");
    const url = new URL(window.location.href);
    url.searchParams.set("step", "choose");
    window.history.replaceState(null, "", url);
  }
  const router = useRouter();
  const [errors, setErrors] = useState<SignupErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const result = getSignupInput(event.currentTarget);
    const nextErrors = getSignupErrors(result);
    setErrors(nextErrors);
    setSubmitError("");

    if (!result.success) return;

    setIsSubmitting(true);
    try {
      await axios.post<RegistrationSuccess>(
        "/api/auth/register",
        { ...result.data, experience },
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      router.push(
        experience === "consultant" ? "/consultant/onboarding" : "/onboarding",
      );
    } catch (error) {
      const apiErrors = getApiErrors(error);
      setErrors(apiErrors.errors);
      setSubmitError(apiErrors.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "choose")
    return (
      <div>
        <header className={styles.formHeader}>
          <h2>How will you use Inkwell?</h2>
          <p>You can use both experiences and switch later.</p>
        </header>
        <fieldset
          style={{
            display: "grid",
            gap: 16,
            border: 0,
            padding: 0,
            marginBottom: 24,
          }}
        >
          <legend className="sr-only">Choose your experience</legend>
          <label
            style={{
              padding: 20,
              border: "1px solid #d5d5cf",
              borderRadius: 12,
            }}
          >
            <input
              type="radio"
              name="experience"
              checked={experience === "marketing"}
              onChange={() => selectExperience("marketing")}
            />{" "}
            <strong>For my company or marketing team</strong>
            <p>Interview clients and turn their expertise into articles.</p>
          </label>
          {consultantEnabled && (
            <label
              style={{
                padding: 20,
                border: "1px solid #d5d5cf",
                borderRadius: 12,
              }}
            >
              <input
                type="radio"
                name="experience"
                checked={experience === "consultant"}
                onChange={() => selectExperience("consultant")}
              />{" "}
              <strong>For myself</strong>
              <p>
                Talk through your own ideas and turn them into articles in your
                voice.
              </p>
            </label>
          )}
        </fieldset>
        <Button fullWidth onClick={choose}>
          Continue
        </Button>
        <p className={styles.accountPrompt}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    );
  return (
    <div>
      <button type="button" onClick={back}>
        ← Back ·{" "}
        {experience === "consultant"
          ? "For myself"
          : "Company or marketing team"}
      </button>
      <header className={styles.formHeader}>
        <h2>Create your account</h2>
        <p>Start writing better articles with AI that works with you.</p>
      </header>

      <div className={styles.googleUnavailable}>
        <GoogleAuthButton
          className={styles.googleAction}
          disabled
          label="Google sign-up is coming soon"
        />
        <p>Google sign-up isn’t available yet. Use your email and password.</p>
      </div>

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
