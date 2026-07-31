"use client";

import { List, X } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { navigationLinks } from "./content";
import styles from "./navigation.module.css";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const firstMobileLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    firstMobileLink.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className={styles.header}>
      <div className={`page-shell ${styles.inner}`}>
        <a className={styles.brand} href="#home" aria-label="Inkwell home">
          <Image
            src="/images/inkwell.png"
            alt="Inkwell"
            width={200}
            height={75}
            priority
          />
        </a>

        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {navigationLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <a href="/login">Sign in</a>
          <a className="button button--primary" href="/signup">
            Start writing free
          </a>
        </nav>

        <button
          className={styles.menuButton}
          type="button"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? (
            <X size={25} aria-hidden />
          ) : (
            <List size={27} aria-hidden />
          )}
        </button>
      </div>

      <nav
        id="mobile-navigation"
        className={styles.mobileNav}
        data-open={isOpen}
        aria-label="Mobile navigation"
      >
        {navigationLinks.map((link, index) => (
          <a
            key={link.href}
            ref={index === 0 ? firstMobileLink : undefined}
            href={link.href}
            onClick={closeMenu}
          >
            {link.label}
          </a>
        ))}
        <a href="/login" onClick={closeMenu}>
          Sign in
        </a>
        <a
          className="button button--primary"
          href="/signup"
          onClick={closeMenu}
        >
          Start writing free
        </a>
      </nav>
    </header>
  );
}
