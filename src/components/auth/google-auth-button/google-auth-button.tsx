import Image from "next/image";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button/button";
import styles from "./google-auth-button.module.css";

type GoogleAuthButtonProps = Pick<
  ComponentProps<typeof Button>,
  "className" | "disabled" | "onClick"
> & {
  label?: string;
};

export function GoogleAuthButton({
  className,
  disabled,
  label = "Continue with Google",
  onClick,
}: GoogleAuthButtonProps) {
  const classes = [styles.button, className ?? ""].filter(Boolean).join(" ");

  return (
    <Button
      className={classes}
      variant="outlined"
      fullWidth
      disabled={disabled}
      onClick={onClick}
      icon={
        <Image
          className={styles.logo}
          src="/images/google-logo.svg"
          alt=""
          width={24}
          height={24}
        />
      }
    >
      {label}
    </Button>
  );
}
