import Image from "next/image";
import Link from "next/link";
import { CaretDown, type Icon } from "@phosphor-icons/react";
import styles from "./sidebar.module.css";

export type SidebarItem = {
  label: string;
  icon: Icon;
  href: string;
};

export type SidebarUser = {
  name: string;
  initials: string;
};

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

      <button
        className={styles.profile}
        type="button"
        aria-label={`Open ${user.name} profile menu`}
        onClick={onProfileClick}
      >
        <span className={styles.initials}>{user.initials}</span>
        <span>{user.name}</span>
        <CaretDown size={16} aria-hidden />
      </button>
    </aside>
  );
}
