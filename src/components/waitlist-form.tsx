"use client";

import { FormEvent, useState } from "react";
import type { WaitlistResponse } from "@/lib/waitlist";

type Fields = {
  name: string;
  email: string;
};

const initialFields: Fields = { name: "", email: "" };
const inputClass =
  "min-h-12 rounded-md border border-ink-navy/25 bg-white px-4 text-ink-navy outline-none transition-colors placeholder:text-ink-muted/70 focus:border-ink-crimson aria-invalid:border-ink-crimson";

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
    <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-1.5">
        <label className="text-sm font-bold" htmlFor="waitlist-name">
          Full name
        </label>
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
          className={inputClass}
        />
        {fieldErrors.name?.[0] ? (
          <p id="name-error" className="m-0 text-sm text-ink-crimson">
            {fieldErrors.name[0]}
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-bold" htmlFor="waitlist-email">
          Email address
        </label>
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
          className={inputClass}
        />
        {fieldErrors.email?.[0] ? (
          <p id="email-error" className="m-0 text-sm text-ink-crimson">
            {fieldErrors.email[0]}
          </p>
        ) : null}
      </div>

      <button
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-transparent bg-white px-6 py-3 font-bold text-ink-navy transition-colors hover:bg-ink-blue-soft disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span
              className="size-4 animate-spin rounded-full border-2 border-ink-navy/25 border-t-ink-navy"
              aria-hidden="true"
            />
            Joining…
          </>
        ) : (
          "Join the waitlist"
        )}
      </button>

      <div aria-live="polite" aria-atomic="true">
        {status ? (
          <p
            className={`m-0 text-sm font-semibold ${
              status.success ? "text-ink-green" : "text-ink-crimson"
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
