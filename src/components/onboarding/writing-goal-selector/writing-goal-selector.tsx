import { WRITING_GOALS, type WritingGoalId } from "../writing-goals";
import { WritingGoalOption } from "./writing-goal-option";
import styles from "./writing-goal-selector.module.css";

type WritingGoalSelectorProps = {
  selected: ReadonlySet<WritingGoalId>;
  onChange: (goalId: WritingGoalId, checked: boolean) => void;
};

export function WritingGoalSelector({
  onChange,
  selected,
}: WritingGoalSelectorProps) {
  return (
    <fieldset className={styles.selector}>
      <legend className={styles.legend}>Select your writing goals</legend>
      {WRITING_GOALS.map((goal) => (
        <WritingGoalOption
          key={goal.id}
          goal={goal}
          checked={selected.has(goal.id)}
          onChange={(checked) => onChange(goal.id, checked)}
        />
      ))}
    </fieldset>
  );
}
