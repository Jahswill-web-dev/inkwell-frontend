"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingActions } from "../onboarding-actions/onboarding-actions";
import { OnboardingHeader } from "../onboarding-header/onboarding-header";
import { DEFAULT_WRITING_GOALS, type WritingGoalId } from "../writing-goals";
import { WritingGoalSelector } from "../writing-goal-selector/writing-goal-selector";
import styles from "./onboarding-screen.module.css";

export function OnboardingScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<WritingGoalId>>(
    () => new Set(DEFAULT_WRITING_GOALS),
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelection = (goalId: WritingGoalId, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(goalId);
      else next.delete(goalId);
      return next;
    });
    setError("");
  };

  const handleContinue = () => {
    if (selected.size === 0) {
      setError("Choose at least one writing goal to continue.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    window.setTimeout(() => {
      router.push("/dashboard");
    }, 500);
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <main className={styles.page}>
      <OnboardingHeader onSkip={handleSkip} />

      <div className={styles.body}>
        <section className={styles.content} aria-labelledby="onboarding-title">
          <header className={styles.intro}>
            <h1 id="onboarding-title">What do you want to write?</h1>
            <p>
              <span className={styles.desktopSubtitle}>
                Choose everything that fits. You can change this later.
              </span>
              <span className={styles.mobileSubtitle}>
                Choose all that apply. You can change this later.
              </span>
            </p>
          </header>

          <WritingGoalSelector selected={selected} onChange={handleSelection} />

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </section>
      </div>

      <OnboardingActions
        isSubmitting={isSubmitting}
        onContinue={handleContinue}
      />
    </main>
  );
}
