import {
  ChatCircleDots,
  CheckCircle,
  Compass,
  FileText,
  PencilSimple,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { workflowStages, type WorkflowStage } from "./content";
import { pageShellClass } from "./ui-classes";

function StageIcon({ id }: Pick<WorkflowStage, "id">): ReactNode {
  const props = { size: 21, weight: "regular" as const, "aria-hidden": true };

  switch (id) {
    case "foundation":
      return <FileText {...props} />;
    case "direction":
      return <Compass {...props} />;
    case "interview":
      return <ChatCircleDots {...props} />;
    case "review":
      return <CheckCircle {...props} />;
    case "write":
      return <PencilSimple {...props} />;
  }
}

export function WritingWorkflow() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-6 border-b border-ink-line pt-[58px] pb-[62px] max-[720px]:py-12"
      aria-labelledby="workflow-title"
    >
      <div className={pageShellClass}>
        <h2
          id="workflow-title"
          className="m-0 text-center font-display text-[clamp(2rem,3.2vw,3.2rem)] leading-[1.08] font-medium max-[720px]:mx-auto max-[720px]:max-w-[330px]"
        >
          A better client interview. A better article.
        </h2>
        <p className="mx-auto mt-4 max-w-[570px] text-center text-[0.98rem] leading-[1.6] text-ink-muted max-[720px]:text-[0.92rem]">
          Give every article the editorial direction and client expertise it
          needs before your writers begin.
        </p>
        <ol className="mt-[34px] grid list-none grid-cols-5 p-0 max-[900px]:grid-cols-3 max-[900px]:gap-y-7 max-[720px]:mt-7 max-[720px]:grid-cols-1 max-[720px]:gap-5">
          {workflowStages.map((stage) => (
            <li
              key={stage.id}
              className={`relative flex flex-col items-center px-2 text-center after:absolute after:top-[11px] after:-right-[5%] after:h-px after:w-[10%] after:bg-ink-muted after:content-[''] last:after:hidden max-[900px]:after:hidden max-[720px]:flex-row max-[720px]:items-start max-[720px]:gap-3 max-[720px]:px-0 max-[720px]:text-left ${stage.id === "interview" ? "text-ink-crimson" : ""}`}
            >
              <span className="inline-flex shrink-0">
                <StageIcon id={stage.id} />
              </span>
              <span>
                <strong className="block font-display text-[clamp(0.94rem,1.3vw,1.08rem)] font-medium">
                  {stage.label}
                </strong>
                <span className="mt-1 block text-[0.77rem] leading-[1.45] text-ink-muted max-[720px]:mt-0 max-[720px]:max-w-[250px]">
                  {stage.description}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
