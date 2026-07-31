"use client";

import { FormEvent, useState } from "react";
import type { WaitlistResponse } from "@/lib/waitlist";

type Fields = {
  name: string;
  email: string;
};

const initialFields: Fields = { name: "", email: "" };

export function WaitlistForm() {
  const [fields, setFields] = useState<Fields>(initialFields);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<WaitlistResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof Fields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: [] }));
    if (status && !status.success) setStatus(null);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatus(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const result = (await response.json()) as WaitlistResponse;

      setStatus(result);
      if (!result.success && result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      if (result.success) setFields(initialFields);
    } catch {
      setStatus({
        success: false,
        message: "We couldn't connect. Check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="waitlist-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="waitlist-name">Full name</label>
        <input
          id="waitlist-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="John Doe"
          value={fields.name}
          aria-invalid={Boolean(fieldErrors.name?.length)}
          aria-describedby={fieldErrors.name?.length ? "name-error" : undefined}
          onChange={(event) => updateField("name", event.target.value)}
        />
        {fieldErrors.name?.[0] ? (
          <p id="name-error" className="field__error">
            {fieldErrors.name[0]}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="waitlist-email">Email address</label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="john@example.com"
          value={fields.email}
          aria-invalid={Boolean(fieldErrors.email?.length)}
          aria-describedby={
            fieldErrors.email?.length ? "email-error" : undefined
          }
          onChange={(event) => updateField("email", event.target.value)}
        />
        {fieldErrors.email?.[0] ? (
          <p id="email-error" className="field__error">
            {fieldErrors.email[0]}
          </p>
        ) : null}
      </div>

      <button
        className="button button--light"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Joining…
          </>
        ) : (
          "Join the waitlist"
        )}
      </button>

      <div aria-live="polite" aria-atomic="true">
        {status ? (
          <p
            className={`form-status ${
              status.success ? "form-status--success" : "form-status--error"
            }`}
            role={status.success ? "status" : "alert"}
          >
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
