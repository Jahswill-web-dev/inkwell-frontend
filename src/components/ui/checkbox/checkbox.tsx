import type { InputHTMLAttributes } from "react";
import styles from "./checkbox.module.css";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "type"
> & {
  id: string;
  label: string;
};

export function Checkbox({ className, id, label, ...props }: CheckboxProps) {
  const inputClasses = [styles.input, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={styles.checkbox} htmlFor={id}>
      <input {...props} className={inputClasses} id={id} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}
