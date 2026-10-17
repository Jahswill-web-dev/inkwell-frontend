import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { ExperienceSwitcher } from "@/components/consultant/experience-switcher";
import styles from "@/components/consultant/consultant.module.css";
export default async function ConsultantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser("/consultant");
  return (
    <div className={styles.shell}>
      <header className={styles.nav}>
        <Link className={styles.brand} href="/consultant">
          inkwell
        </Link>
        <nav className={styles.links} aria-label="Consultant navigation">
          <Link href="/consultant">My articles</Link>
          <Link href="/consultant/voice">My voice</Link>
          <Link href="/consultant/settings">Settings</Link>
        </nav>
        <ExperienceSwitcher current="consultant" />
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
