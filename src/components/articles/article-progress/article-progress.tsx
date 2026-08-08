import { Check, type IconWeight } from "@phosphor-icons/react";
import styles from "./article-progress.module.css";

type ProgressStep = {
  desktopLabel: string;
  mobileLabel: string;
};

const steps: readonly ProgressStep[] = [
  { desktopLabel: "Idea", mobileLabel: "Idea" },
  { desktopLabel: "Brief", mobileLabel: "Brief" },
  { desktopLabel: "Outline", mobileLabel: "Outline" },
  { desktopLabel: "Draft", mobileLabel: "Write" },
  { desktopLabel: "Review", mobileLabel: "Refine" },
];

export function ArticleProgress({ currentStep }: { currentStep: number }) {
  return (
    <nav className={styles.progress} aria-label="Article progress">
      <ol>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const weight: IconWeight = isComplete ? "bold" : "regular";

          return (
            <li
              className={
                isCurrent ? styles.current : isComplete ? styles.complete : ""
              }
              key={step.desktopLabel}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className={styles.marker} aria-hidden>
                {isComplete ? <Check size={17} weight={weight} /> : stepNumber}
              </span>
              <span className={styles.desktopLabel}>{step.desktopLabel}</span>
              <span className={styles.mobileLabel}>{step.mobileLabel}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
