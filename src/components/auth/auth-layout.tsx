import type { ReactNode } from "react";
import { AuthStoryPanel } from "./auth-story-panel";
import styles from "./auth.module.css";

type AuthLayoutProps = {
  children: ReactNode;
  ariaLabel?: string;
};

export function AuthLayout({
  ariaLabel = "Account signup",
  children,
}: AuthLayoutProps) {
  return (
    <main className={styles.authPage}>
      <AuthStoryPanel />
      <section className={styles.formPanel} aria-label={ariaLabel}>
        <div className={styles.formPanelInner}>{children}</div>
      </section>
    </main>
  );
}
