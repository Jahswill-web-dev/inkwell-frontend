"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./consultant.module.css";

export function ConsultantNavigation({
  performanceOwner,
}: {
  performanceOwner: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav className={styles.links} aria-label="Consultant navigation">
      <Link
        href="/consultant"
        aria-current={pathname === "/consultant" ? "page" : undefined}
      >
        My articles
      </Link>
      <Link
        href="/consultant/settings"
        aria-current={pathname === "/consultant/settings" ? "page" : undefined}
      >
        Settings
      </Link>
      {performanceOwner && (
        <Link
          href="/consultant/performance"
          aria-current={
            pathname === "/consultant/performance" ? "page" : undefined
          }
        >
          Generation performance
        </Link>
      )}
    </nav>
  );
}
