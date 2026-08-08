import { Check } from "@phosphor-icons/react";
import type { WritingGoal } from "../writing-goals";
import styles from "./writing-goal-selector.module.css";

type WritingGoalOptionProps = {
  goal: WritingGoal;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function WritingGoalOption({
  checked,
  goal,
  onChange,
}: WritingGoalOptionProps) {
  const DesktopIcon = goal.desktopIcon;
  const MobileIcon = goal.mobileIcon ?? goal.desktopIcon;
  const descriptionId = `${goal.id}-description`;

  return (
    <label className={styles.option}>
      <input
        className={styles.input}
        type="checkbox"
        name="writing-goals"
        value={goal.id}
        checked={checked}
        aria-describedby={descriptionId}
        onChange={(event) => onChange(event.target.checked)}
      />
      <DesktopIcon
        className={`${styles.icon} ${styles.desktopIcon}`}
        size={49}
        weight="regular"
        aria-hidden
      />
      <MobileIcon
        className={`${styles.icon} ${styles.mobileIcon}`}
        size={38}
        weight="regular"
        aria-hidden
      />
      <span className={styles.copy}>
        <span className={styles.name}>{goal.label}</span>
        <span className={styles.description} id={descriptionId}>
          {goal.description}
        </span>
      </span>
      <span className={styles.indicator} aria-hidden="true">
        {checked ? <Check size={22} weight="bold" /> : null}
      </span>
    </label>
  );
}
