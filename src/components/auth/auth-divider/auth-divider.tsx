import styles from "./auth-divider.module.css";

type AuthDividerProps = {
  label?: string;
};

export function AuthDivider({
  label = "or continue with email",
}: AuthDividerProps) {
  return (
    <div className={styles.divider} aria-hidden="true">
      <span>{label}</span>
    </div>
  );
}
