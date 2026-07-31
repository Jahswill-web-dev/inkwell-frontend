import {
  CheckCircle,
  Export,
  FileText,
  Lightbulb,
  ListBullets,
  PencilSimple,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { workflowStages, type WorkflowStage } from "./content";
import styles from "./writing-workflow.module.css";

function StageIcon({ id }: Pick<WorkflowStage, "id">): ReactNode {
  const props = { size: 21, weight: "regular" as const, "aria-hidden": true };

  switch (id) {
    case "idea":
      return <Lightbulb {...props} />;
    case "brief":
      return <FileText {...props} />;
    case "outline":
      return <ListBullets {...props} />;
    case "write":
      return <PencilSimple {...props} />;
    case "review":
      return <CheckCircle {...props} />;
    case "export":
      return <Export {...props} />;
  }
}

export function WritingWorkflow() {
  return (
    <section
      id="how-it-works"
      className={styles.workflow}
      aria-labelledby="workflow-title"
    >
      <div className="page-shell">
        <h2 id="workflow-title">One workspace. Every stage of writing.</h2>
        <ol className={styles.stages}>
          {workflowStages.map((stage) => (
            <li
              key={stage.id}
              className={stage.id === "write" ? styles.active : undefined}
            >
              <span className={styles.icon}>
                <StageIcon id={stage.id} />
              </span>
              {stage.label}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
