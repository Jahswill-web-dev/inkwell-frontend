import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "outlined";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
};

export function Button({
  children,
  className,
  disabled,
  fullWidth = false,
  icon,
  isLoading = false,
  loadingLabel = "Loading…",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    fullWidth ? styles.fullWidth : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      className={classes}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
    >
      {!isLoading && icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{isLoading ? loadingLabel : children}</span>
    </button>
  );
}
