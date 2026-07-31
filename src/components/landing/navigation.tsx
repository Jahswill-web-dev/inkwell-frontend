"use client";

import { List, X } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { navigationLinks } from "./content";
import { pageShellClass, primaryButtonClass } from "./ui-classes";

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
  const mobileLinkClass = "min-h-12 px-2 py-3 font-semibold";

  return (
    <header className="relative z-20 border-b border-transparent bg-ink-paper/95">
      <div
        className={`${pageShellClass} flex min-h-[78px] items-center justify-between max-[800px]:min-h-[70px]`}
      >
        <a
          className="inline-flex shrink-0 items-center"
          href="#home"
          aria-label="Inkwell home"
        >
          <Image
            src="/images/inkwell.png"
            alt="Inkwell"
            width={200}
            height={75}
            priority
            className="h-auto w-[124px] max-[800px]:w-[118px]"
          />
        </a>

        <nav
          className="hidden items-center gap-[34px] text-[0.86rem] font-semibold min-[801px]:flex"
          aria-label="Primary navigation"
        >
          {navigationLinks.map((link) => (
            <a
              className="transition-colors duration-150 hover:text-ink-crimson"
              key={link.href}
              href={link.href}
            >
              {link.label}
            </a>
          ))}
          <a
            className="transition-colors duration-150 hover:text-ink-crimson"
            href="/login"
          >
            Sign in
          </a>
          <a className={primaryButtonClass} href="/signup">
            Start writing free
          </a>
        </nav>

        <button
          className="hidden size-12 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-navy max-[800px]:inline-flex"
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
        className={
          isOpen
            ? "absolute right-0 left-0 grid gap-1 border-y border-ink-line bg-ink-paper px-4 pt-3 pb-5 shadow-[0_18px_30px_rgba(7,25,79,0.1)] min-[801px]:hidden"
            : "hidden"
        }
        aria-label="Mobile navigation"
      >
        {navigationLinks.map((link, index) => (
          <a
            className={mobileLinkClass}
            key={link.href}
            ref={index === 0 ? firstMobileLink : undefined}
            href={link.href}
            onClick={closeMenu}
          >
            {link.label}
          </a>
        ))}
        <a className={mobileLinkClass} href="/login" onClick={closeMenu}>
          Sign in
        </a>
        <a
          className={`${primaryButtonClass} mt-2 w-full`}
          href="/signup"
          onClick={closeMenu}
        >
          Start writing free
        </a>
      </nav>
    </header>
  );
}
