"use client";

import Image from "next/image";
import Link from "next/link";
import { MagnifyingGlass, Question, SignOut } from "@phosphor-icons/react";
import { useState } from "react";
import { useSignOut } from "@/components/auth/use-sign-out";
import type { AuthIdentity } from "@/lib/auth/identity";
import styles from "./dashboard.module.css";

type DashboardHeaderProps = {
  identity: AuthIdentity;
  query: string;
  onQueryChange: (query: string) => void;
};

export function DashboardHeader({
  identity,
  query,
  onQueryChange,
}: DashboardHeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { isSigningOut, signOut } = useSignOut();

  const menu = isProfileOpen ? (
    <div className={styles.headerProfileMenu} role="menu">
      <strong>{identity.username}</strong>
      <button
        type="button"
        role="menuitem"
        disabled={isSigningOut}
        onClick={signOut}
      >
        <SignOut size={18} aria-hidden />
        {isSigningOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  ) : null;

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
        <div className={styles.headerProfileControl}>
          <button
            type="button"
            className={styles.initials}
            aria-label={`Open ${identity.username} profile menu`}
            aria-haspopup="menu"
            aria-expanded={isProfileOpen}
            onClick={() => setIsProfileOpen((open) => !open)}
          >
            {identity.initials}
          </button>
          {menu}
        </div>
      </div>
      <div className={styles.mobileProfileControl}>
        <button
          className={styles.mobileAvatar}
          type="button"
          aria-label={`Open ${identity.username} profile menu`}
          aria-haspopup="menu"
          aria-expanded={isProfileOpen}
          onClick={() => setIsProfileOpen((open) => !open)}
        >
          {identity.initials}
        </button>
        {menu}
      </div>
    </header>
  );
}
