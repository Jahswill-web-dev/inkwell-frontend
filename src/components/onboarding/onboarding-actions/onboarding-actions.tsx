import Link from "next/link";
import { Button } from "@/components/ui/button/button";
import styles from "./onboarding-actions.module.css";

type OnboardingActionsProps = {
  isSubmitting: boolean;
  onContinue: () => void;
};

export function OnboardingActions({
  isSubmitting,
  onContinue,
}: OnboardingActionsProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.actions}>
        <Link className={styles.back} href="/signup">
          Back
        </Link>
        <Button
          className={styles.continue}
          isLoading={isSubmitting}
          loadingLabel="Saving…"
          onClick={onContinue}
        >
          Continue
        </Button>
      </div>
    </footer>
  );
}
