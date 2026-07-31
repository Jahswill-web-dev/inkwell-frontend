import Image from "next/image";
import { navigationLinks } from "./content";
import styles from "./footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`page-shell ${styles.inner}`}>
        <div className={styles.brandBlock}>
          <a className={styles.brand} href="#home" aria-label="Inkwell home">
            <Image
              src="/images/inkwell.png"
              alt="Inkwell"
              width={200}
              height={75}
            />
          </a>
          <p>© {new Date().getFullYear()} Inkwell. All rights reserved.</p>
        </div>

        <nav className={styles.links} aria-label="Footer navigation">
          {navigationLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <a href="/login">Sign in</a>
        </nav>

        <div className={styles.legal}>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </div>
    </footer>
  );
}
