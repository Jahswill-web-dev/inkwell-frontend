import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./form-field.module.css";

export type FormFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id"
> & {
  id: string;
  label: string;
  error?: string;
  trailing?: ReactNode;
};

export function FormField({
  "aria-describedby": describedBy,
  "aria-invalid": ariaInvalid,
  className,
  error,
  id,
  label,
  trailing,
  ...inputProps
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const descriptionIds = [describedBy, error ? errorId : undefined]
    .filter(Boolean)
    .join(" ");
  const inputClasses = [
    styles.input,
    trailing ? styles.inputWithTrailing : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.control}>
        <input
          {...inputProps}
          id={id}
          className={inputClasses}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={descriptionIds || undefined}
        />
        {trailing ? <div className={styles.trailing}>{trailing}</div> : null}
      </div>
      {error ? (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
