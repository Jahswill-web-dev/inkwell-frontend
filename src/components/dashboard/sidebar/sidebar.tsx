"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CaretDown,
  SidebarSimple,
  SignOut,
  type Icon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useSignOut } from "@/components/auth/use-sign-out";
import styles from "./sidebar.module.css";

const SIDEBAR_ID = "dashboard-sidebar";
const SIDEBAR_STORAGE_KEY = "inkwell:sidebar-open";
const SIDEBAR_WIDTH_PROPERTY = "--dashboard-sidebar-width";

function applySidebarWidth(isOpen: boolean) {
  document.documentElement.style.setProperty(
    SIDEBAR_WIDTH_PROPERTY,
    isOpen ? "215px" : "0px",
  );
}

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const { isSigningOut, signOut } = useSignOut();

  useEffect(() => {
    let shouldOpen = true;
    try {
      shouldOpen = window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "false";
    } catch {
      // Keep the accessible expanded default when storage is unavailable.
    }
    const timer = window.setTimeout(() => {
      setIsSidebarOpen(shouldOpen);
      applySidebarWidth(shouldOpen);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const changeSidebarState = (shouldOpen: boolean) => {
    setIsSidebarOpen(shouldOpen);
    setIsProfileOpen(false);
    applySidebarWidth(shouldOpen);
    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        shouldOpen ? "true" : "false",
      );
    } catch {
      // The control still works for this page when storage is unavailable.
    }
    window.setTimeout(() => {
      (shouldOpen ? closeButtonRef : openButtonRef).current?.focus();
    }, 0);
  };

  return (
    <>
      <aside
        aria-hidden={!isSidebarOpen}
        aria-label={ariaLabel}
        className={`${styles.sidebar} ${isSidebarOpen ? "" : styles.sidebarClosed}`}
        id={SIDEBAR_ID}
        inert={!isSidebarOpen}
      >
        <button
          aria-controls={SIDEBAR_ID}
          aria-expanded={isSidebarOpen}
          aria-label="Close sidebar"
          className={styles.closeButton}
          onClick={() => changeSidebarState(false)}
          ref={closeButtonRef}
          type="button"
        >
          <SidebarSimple size={21} aria-hidden />
        </button>
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
      {!isSidebarOpen ? (
        <button
          aria-controls={SIDEBAR_ID}
          aria-expanded={isSidebarOpen}
          aria-label="Open sidebar"
          className={styles.openButton}
          onClick={() => changeSidebarState(true)}
          ref={openButtonRef}
          type="button"
        >
          <SidebarSimple size={23} aria-hidden />
        </button>
      ) : null}
    </>
  );
}
