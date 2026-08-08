import Image from "next/image";
import Link from "next/link";
import { MagnifyingGlass, Question } from "@phosphor-icons/react";
import styles from "./dashboard.module.css";

type DashboardHeaderProps = {
  query: string;
  onQueryChange: (query: string) => void;
};

export function DashboardHeader({
  query,
  onQueryChange,
}: DashboardHeaderProps) {
  return (
    <header className={styles.dashboardHeader}>
      <Link className={styles.mobileBrand} href="/" aria-label="Inkwell home">
        <Image
          src="/images/inkwell.png"
          alt="Inkwell"
          width={874}
          height={512}
          priority
        />
      </Link>
      <label className={styles.search}>
        <span className={styles.visuallyHidden}>
          Search articles, ideas, or templates
        </span>
        <MagnifyingGlass size={24} aria-hidden />
        <input
          type="search"
          value={query}
          placeholder="Search articles, ideas, or templates..."
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <div className={styles.headerActions}>
        <button type="button" className={styles.help}>
          <Question size={24} aria-hidden /> Help
        </button>
        <span className={styles.headerDivider} />
        <button
          type="button"
          className={styles.initials}
          aria-label="Open profile menu"
        >
          NK
        </button>
      </div>
      <button
        className={styles.mobileAvatar}
        type="button"
        aria-label="Open profile menu"
      >
        <Image
          src="/images/dashboard/nina-profile.png"
          alt="Nina Koskinen"
          width={96}
          height={96}
        />
      </button>
    </header>
  );
}
