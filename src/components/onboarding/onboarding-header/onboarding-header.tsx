import Image from "next/image";
import Link from "next/link";
import styles from "./onboarding-header.module.css";

type OnboardingHeaderProps = {
  onSkip: () => void;
};

export function OnboardingHeader({ onSkip }: OnboardingHeaderProps) {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="Inkwell home">
        <Image
          className={styles.logo}
          src="/images/inkwell.png"
          alt="Inkwell"
          width={874}
          height={512}
          priority
        />
      </Link>
      <button className={styles.skip} type="button" onClick={onSkip}>
        <span className={styles.desktopLabel}>Skip for now</span>
        <span className={styles.mobileLabel}>Skip</span>
      </button>
    </header>
  );
}
