import Link from "next/link";
import { safeProtectedPath } from "@/lib/auth/constants";
import styles from "./unavailable.module.css";

export const metadata = {
  title: "Authentication unavailable",
  description: "The authentication service is temporarily unavailable.",
};

export default async function AuthUnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const retryPath = safeProtectedPath(next);

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="unavailable-title">
        <p className={styles.eyebrow}>Inkwell</p>
        <h1 id="unavailable-title">
          We can&apos;t verify your session right now
        </h1>
        <p>
          The authentication service is temporarily unavailable. Your session
          has been preserved, so you can safely try again.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} href={retryPath}>
            Try again
          </Link>
          <Link className={styles.secondary} href="/login">
            Return to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
