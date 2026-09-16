import { Article, Gear, House, Lightbulb } from "@phosphor-icons/react";
import styles from "./dashboard.module.css";

const items = [
  { label: "Workspace", icon: House },
  { label: "Articles", icon: Article },
  { label: "Ideas", icon: Lightbulb },
  { label: "Settings", icon: Gear },
] as const;

export function MobileNav({
  onNavigate,
}: {
  onNavigate: (label: string) => void;
}) {
  return (
    <nav className={styles.mobileNav} aria-label="Mobile navigation">
      {items.map(({ icon: Icon, label }, index) => (
        <button
          className={index === 0 ? styles.mobileNavActive : ""}
          type="button"
          key={label}
          onClick={() => onNavigate(label)}
        >
          <Icon
            size={29}
            weight={index === 0 ? "fill" : "regular"}
            aria-hidden
          />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
