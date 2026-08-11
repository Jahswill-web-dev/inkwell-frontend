"use client";

import Image from "next/image";
import Link from "next/link";
import { CaretDown, SignOut, type Icon } from "@phosphor-icons/react";
import { useState } from "react";
import { useSignOut } from "@/components/auth/use-sign-out";
import styles from "./sidebar.module.css";

export type SidebarItem = { label: string; icon: Icon; href: string };
export type SidebarUser = { name: string; initials: string };
export type SidebarProps = {
  items: readonly SidebarItem[];
  activeHref: string;
  user: SidebarUser;
  onProfileClick?: () => void;
  ariaLabel?: string;
};

export function Sidebar({
  items,
  activeHref,
  user,
  onProfileClick,
  ariaLabel = "Primary navigation",
}: SidebarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { isSigningOut, signOut } = useSignOut();

  return (
    <aside className={styles.sidebar} aria-label={ariaLabel}>
      <Link className={styles.brand} href="/" aria-label="Inkwell home">
        <Image
          src="/images/inkwell.png"
          alt="Inkwell"
          width={874}
          height={512}
          priority
        />
      </Link>

      <nav className={styles.navigation}>
        {items.map(({ href, icon: IconComponent, label }) => {
          const isActive = href === activeHref;
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={isActive ? styles.activeLink : styles.link}
              href={href}
              key={href}
            >
              <IconComponent size={25} weight="regular" aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.profileWrap}>
        {isProfileOpen ? (
          <div className={styles.profileMenu} role="menu">
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
        ) : null}
        <button
          className={styles.profile}
          type="button"
          aria-label={`Open ${user.name} profile menu`}
          aria-haspopup="menu"
          aria-expanded={isProfileOpen}
          onClick={() => {
            setIsProfileOpen((open) => !open);
            onProfileClick?.();
          }}
        >
          <span className={styles.initials}>{user.initials}</span>
          <span>{user.name}</span>
          <CaretDown size={16} aria-hidden />
        </button>
      </div>
    </aside>
  );
}
