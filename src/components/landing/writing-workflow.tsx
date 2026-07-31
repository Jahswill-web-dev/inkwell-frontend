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
import { pageShellClass } from "./ui-classes";

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
      className="scroll-mt-6 border-b border-ink-line pt-[52px] pb-[58px] max-[720px]:py-12"
      aria-labelledby="workflow-title"
    >
      <div className={pageShellClass}>
        <h2
          id="workflow-title"
          className="m-0 text-center font-display text-[clamp(2rem,3.2vw,3.2rem)] leading-[1.08] font-medium max-[720px]:mx-auto max-[720px]:max-w-[330px]"
        >
          One workspace. Every stage of writing.
        </h2>
        <ol className="mt-[34px] grid list-none grid-cols-6 p-0 max-[720px]:mt-7 max-[720px]:grid-cols-3 max-[720px]:gap-x-2 max-[720px]:gap-y-5">
          {workflowStages.map((stage) => (
            <li
              key={stage.id}
              className={`relative flex items-center justify-center gap-[9px] font-display text-[1.08rem] after:absolute after:top-1/2 after:-right-[5px] after:h-px after:w-2.5 after:bg-ink-muted after:content-[''] last:after:hidden max-[720px]:flex-col max-[720px]:gap-1 max-[720px]:text-[0.98rem] max-[720px]:after:hidden ${stage.id === "write" ? "text-ink-crimson" : ""}`}
            >
              <span className="inline-flex">
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
