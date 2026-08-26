"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import type { InputHTMLAttributes } from "react";
import { useState } from "react";
import { FormField } from "@/components/ui/form-field/form-field";
import styles from "./password-field.module.css";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "type"
> & {
  id: string;
  label?: string;
  error?: string;
};

export function PasswordField({
  autoComplete = "new-password",
  error,
  id,
  label = "Password",
  name = "password",
  placeholder = "••••••••",
  ...inputProps
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <FormField
      {...inputProps}
      id={id}
      name={name}
      label={label}
      type={isVisible ? "text" : "password"}
      autoComplete={autoComplete}
      placeholder={placeholder}
      error={error}
      trailing={
        <button
          className={styles.toggle}
          type="button"
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((visible) => !visible)}
        >
          {isVisible ? (
            <EyeSlash size={25} weight="regular" aria-hidden />
          ) : (
            <Eye size={25} weight="regular" aria-hidden />
          )}
        </button>
      }
    />
  );
}
