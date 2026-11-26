"use client";
import {
  Buildings,
  CaretDown,
  Check,
  CircleNotch,
  User,
} from "@phosphor-icons/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { consultantRequest } from "@/lib/consultant/client";
import styles from "./experience-switcher.module.css";

const experiences = [
  { value: "consultant", label: "Consultant", Icon: User, path: "/consultant" },
  {
    value: "marketing",
    label: "Content marketing",
    Icon: Buildings,
    path: "/dashboard",
  },
] as const;
type Experience = (typeof experiences)[number]["value"];

export function ExperienceSwitcher({
  current = "marketing",
}: {
  current?: Experience;
}) {
  const router = useRouter();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const initialFocus = useRef(0);
  const busyRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const positioned = position !== null;
  const selected = experiences.find(
    (experience) => experience.value === current,
  )!;

  function closeMenu(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function openMenu(
    index = experiences.findIndex((experience) => experience.value === current),
  ) {
    setPortalTarget(
      triggerRef.current?.closest('[role="dialog"]') ?? document.body,
    );
    initialFocus.current = index;
    setPosition(null);
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const placeMenu = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      const gutter = 16;
      const width = Math.min(360, window.innerWidth - gutter * 2);
      const height = menu.scrollHeight + 2;
      const below = window.innerHeight - rect.bottom - gutter - 8;
      const above = rect.top - gutter - 8;
      const placeAbove = below < height && above > below;
      const maxHeight = Math.max(
        48,
        Math.min(window.innerHeight - gutter * 2, placeAbove ? above : below),
      );
      const desiredTop = placeAbove
        ? rect.top - 8 - Math.min(height, maxHeight)
        : rect.bottom + 8;
      setPosition({
        width,
        left: Math.max(
          gutter,
          Math.min(rect.right - width, window.innerWidth - width - gutter),
        ),
        top: Math.max(
          gutter,
          Math.min(
            desiredTop,
            window.innerHeight - Math.min(height, maxHeight) - gutter,
          ),
        ),
        maxHeight,
      });
    };
    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, error]);

  useLayoutEffect(() => {
    if (open && positioned)
      itemRefs.current[initialFocus.current]?.focus({ preventScroll: true });
  }, [open, positioned, error]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      )
        closeMenu();
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      )
        closeMenu();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);

  async function switchExperience(experience: Experience) {
    if (busyRef.current) return;
    if (experience === current) {
      closeMenu(true);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await consultantRequest("experience", "PUT", { experience });
      closeMenu(true);
      router.push(experiences.find((item) => item.value === experience)!.path);
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to switch. Please try again.",
      );
      initialFocus.current = experiences.findIndex(
        (item) => item.value === experience,
      );
      setOpen(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function handleMenuKey(event: KeyboardEvent<HTMLDivElement>) {
    // Escape should dismiss this menu without closing an enclosing review.
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const scope =
        triggerRef.current?.closest('[role="dialog"]') ?? document.body;
      const focusable = Array.from(
        scope.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      ).filter((element) => {
        if (
          element.tabIndex < 0 ||
          menuRef.current?.contains(element) ||
          element.closest("[hidden], [inert]")
        )
          return false;
        let ancestor: HTMLElement | null = element;
        while (ancestor && ancestor !== scope.parentElement) {
          const style = window.getComputedStyle(ancestor);
          if (style.display === "none" || style.visibility === "hidden")
            return false;
          ancestor = ancestor.parentElement;
        }
        return true;
      });
      const index = focusable.indexOf(triggerRef.current!);
      const target =
        focusable[
          (index + (event.shiftKey ? -1 : 1) + focusable.length) %
            focusable.length
        ];
      closeMenu();
      (target ?? triggerRef.current)?.focus();
      return;
    }
    const index = itemRefs.current.findIndex(
      (item) => item === document.activeElement,
    );
    const next =
      event.key === "ArrowDown"
        ? (index + 1) % experiences.length
        : event.key === "ArrowUp"
          ? (index + experiences.length - 1) % experiences.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? experiences.length - 1
              : -1;
    if (next >= 0) {
      event.preventDefault();
      itemRefs.current[next]?.focus();
    }
  }

  const menu = open ? (
    <div
      id={menuId}
      role="menu"
      aria-label="Switch experience"
      aria-busy={busy}
      className={styles.menu}
      ref={menuRef}
      onKeyDown={handleMenuKey}
      style={{ ...position, visibility: position ? "visible" : "hidden" }}
    >
      <p className={styles.caption}>Switch experience</p>
      {experiences.map(({ value, label, Icon }, index) => (
        <button
          key={value}
          role="menuitemradio"
          aria-checked={current === value}
          aria-disabled={busy}
          tabIndex={-1}
          type="button"
          className={styles.option}
          ref={(element) => {
            itemRefs.current[index] = element;
          }}
          onClick={() => void switchExperience(value)}
        >
          <Icon size={24} aria-hidden="true" />
          <span>{label}</span>
          {current === value && (
            <Check size={20} weight="bold" aria-hidden="true" />
          )}
        </button>
      ))}
      {busy && (
        <p className={styles.status} role="status">
          Switching experience…
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  ) : null;

  return (
    <div className={styles.root}>
      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        aria-label={`Experience: ${selected.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={busy}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(event.key === "ArrowDown" ? 0 : experiences.length - 1);
          }
        }}
      >
        {busy ? (
          <CircleNotch
            aria-hidden="true"
            className={styles.spinner}
            size={24}
          />
        ) : (
          <selected.Icon aria-hidden="true" size={24} />
        )}
        <span>{selected.label}</span>
        <CaretDown size={18} weight="bold" aria-hidden="true" />
      </button>
      {menu && portalTarget && createPortal(menu, portalTarget)}
    </div>
  );
}
