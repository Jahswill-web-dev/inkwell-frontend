"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowClockwise,
  ArrowLeft,
  CaretDown,
  Check,
  DotsSixVertical,
  DotsThree,
  ListBullets,
  TextT,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { ArticleProgress } from "../article-progress/article-progress";
import styles from "./outline-builder.module.css";

export type OutlineSection = {
  id: string;
  title: string;
  purpose: string;
  questions: string[];
  notes: string;
  estimatedWords: number;
};

export type ArticleOutlineState = {
  workingTitle: string;
  targetAudience: string;
  sections: OutlineSection[];
};

const defaultSections: readonly OutlineSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    purpose:
      "Hook the reader, introduce the challenge of capturing great ideas, and set expectations for what’s ahead.",
    questions: [
      "Why are great ideas so hard to write down?",
      "What will the reader gain from reading this?",
    ],
    notes: "",
    estimatedWords: 120,
  },
  {
    id: "messy-nature",
    title: "The messy nature of great ideas",
    purpose:
      "Show why worthwhile ideas often begin as incomplete, contradictory thoughts rather than polished arguments.",
    questions: [
      "Why do promising ideas feel unclear at first?",
      "What makes early thinking difficult to explain?",
    ],
    notes: "",
    estimatedWords: 280,
  },
  {
    id: "writing-creates-structure",
    title: "Writing creates structure",
    purpose:
      "Explain how writing turns loose connections into a sequence that other people can follow.",
    questions: [
      "How does writing expose gaps in an idea?",
      "Which structures help a reader follow the thinking?",
    ],
    notes: "",
    estimatedWords: 280,
  },
  {
    id: "clarity-through-iteration",
    title: "Clarity comes through iteration",
    purpose:
      "Reframe revision as the process that sharpens both the language and the underlying idea.",
    questions: [
      "Why is the first version rarely the clearest?",
      "How can each revision improve the thinking?",
    ],
    notes: "",
    estimatedWords: 260,
  },
  {
    id: "conclusion",
    title: "Conclusion",
    purpose:
      "Reinforce the central insight and leave readers with a practical next step for capturing difficult ideas.",
    questions: [
      "What should the reader remember?",
      "What can they do the next time an idea resists words?",
    ],
    notes: "",
    estimatedWords: 120,
  },
];

const defaultOutline: ArticleOutlineState = {
  workingTitle: "Why Great Ideas Are Hard to Write Down",
  targetAudience: "Knowledge workers, creators, founders",
  sections: defaultSections.map((section) => ({ ...section })),
};

const alternativeContent: Record<
  string,
  Pick<OutlineSection, "purpose" | "questions">
> = {
  introduction: {
    purpose:
      "Open with a relatable moment of creative friction and establish why turning thought into language matters.",
    questions: [
      "Why do great ideas often resist words?",
      "What makes writing them down so difficult?",
    ],
  },
  "messy-nature": {
    purpose:
      "Explore the fragments, associations, and uncertainty that make an emerging idea feel more complex than it first appears.",
    questions: [
      "What does an unfinished idea actually look like?",
      "Why can complexity be a sign of potential?",
    ],
  },
  "writing-creates-structure": {
    purpose:
      "Demonstrate how sentences force choices about order, evidence, and meaning that thinking alone can postpone.",
    questions: [
      "Which decisions does writing force us to make?",
      "How does structure improve understanding?",
    ],
  },
  "clarity-through-iteration": {
    purpose:
      "Show how drafting and revision progressively reveal the strongest version of an idea.",
    questions: [
      "What changes between a rough draft and a clear one?",
      "How should a writer approach revision?",
    ],
  },
  conclusion: {
    purpose:
      "Close by turning the friction of writing into an encouraging reason to keep shaping the idea.",
    questions: [
      "Which insight ties the article together?",
      "What small writing habit should readers try next?",
    ],
  },
};

function isOutlineSection(value: unknown): value is OutlineSection {
  if (!value || typeof value !== "object") return false;
  const section = value as Record<string, unknown>;
  return (
    typeof section.id === "string" &&
    typeof section.title === "string" &&
    typeof section.purpose === "string" &&
    Array.isArray(section.questions) &&
    section.questions.every((question) => typeof question === "string") &&
    typeof section.notes === "string" &&
    typeof section.estimatedWords === "number"
  );
}

function parseSavedOutline(value: string): ArticleOutlineState | null {
  try {
    const outline = JSON.parse(value) as Record<string, unknown>;
    if (
      typeof outline.workingTitle !== "string" ||
      typeof outline.targetAudience !== "string" ||
      !Array.isArray(outline.sections) ||
      !outline.sections.every(isOutlineSection)
    ) {
      return null;
    }
    return outline as ArticleOutlineState;
  } catch {
    return null;
  }
}

type OutlineHealthProps = {
  checks: readonly { label: string; description: string; passed: boolean }[];
  isRegenerating: boolean;
  onRegenerate: () => void;
};

function OutlineHealth({
  checks,
  isRegenerating,
  onRegenerate,
}: OutlineHealthProps) {
  return (
    <div className={styles.healthContent}>
      <h2>Outline health</h2>
      <div className={styles.healthChecks}>
        {checks.map((check) => (
          <div className={styles.healthCheck} key={check.label}>
            <span
              className={check.passed ? styles.passed : styles.pending}
              aria-hidden
            >
              <Check size={17} weight="bold" />
            </span>
            <div>
              <strong>{check.label}</strong>
              <p>{check.description}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        className={styles.regenerateApproach}
        disabled={isRegenerating}
        onClick={onRegenerate}
        type="button"
      >
        <ArrowClockwise size={21} aria-hidden />
        {isRegenerating
          ? "Generating another approach…"
          : "Generate another approach"}
      </button>
    </div>
  );
}

export function OutlineBuilder() {
  const router = useRouter();
  const [outline, setOutline] = useState<ArticleOutlineState>(defaultOutline);
  const [openSectionId, setOpenSectionId] = useState("introduction");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [isRegeneratingOutline, setIsRegeneratingOutline] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [showHealth, setShowHealth] = useState(false);
  const closeHealthRef = useRef<HTMLButtonElement>(null);
  const healthTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const savedOutline = window.sessionStorage.getItem(
      "inkwell:article-outline",
    );
    const savedBrief = window.sessionStorage.getItem("inkwell:article-brief");
    const parsedOutline = savedOutline ? parseSavedOutline(savedOutline) : null;

    let nextOutline = parsedOutline;
    if (!nextOutline && savedBrief) {
      try {
        const brief = JSON.parse(savedBrief) as Record<string, unknown>;
        nextOutline = {
          ...defaultOutline,
          workingTitle:
            String(brief.workingTitle ?? "").trim() ||
            defaultOutline.workingTitle,
          targetAudience:
            String(brief.targetAudience ?? "").trim() ||
            defaultOutline.targetAudience,
          sections: defaultSections.map((section) => ({ ...section })),
        };
      } catch {
        window.sessionStorage.removeItem("inkwell:article-brief");
      }
    }

    if (nextOutline) {
      const timer = window.setTimeout(() => setOutline(nextOutline), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!showHealth) return;
    closeHealthRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowHealth(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showHealth]);

  const totalWords = outline.sections.reduce(
    (total, section) => total + section.estimatedWords,
    0,
  );

  const healthChecks = useMemo(() => {
    const firstTitle = outline.sections[0]?.title ?? "";
    const lastSection = outline.sections.at(-1);
    const hasProgression =
      outline.sections.length >= 3 && /intro/i.test(firstTitle);
    const hasBalance =
      totalWords > 0 &&
      outline.sections.every((section) => {
        const share = section.estimatedWords / totalWords;
        return share >= 0.08 && share <= 0.35;
      });
    const hasConclusion = Boolean(
      lastSection &&
      /conclusion|takeaway|close/i.test(
        `${lastSection.title} ${lastSection.purpose}`,
      ),
    );
    return [
      {
        label: "Clear progression",
        description: "Your sections flow logically from problem to solution.",
        passed: hasProgression,
      },
      {
        label: "Balanced sections",
        description: "Your word counts are well-distributed across sections.",
        passed: hasBalance,
      },
      {
        label: "Strong conclusion",
        description: "You’ve included a conclusion to reinforce key takeaways.",
        passed: hasConclusion,
      },
    ] as const;
  }, [outline.sections, totalWords]);

  const saveOutline = (message = "Outline saved.") => {
    window.sessionStorage.setItem(
      "inkwell:article-outline",
      JSON.stringify(outline),
    );
    setStatus(message);
  };

  const startDrafting = () => {
    saveOutline("Outline saved. Opening your draft.");
    router.push("/articles/new/draft");
  };

  const updateNotes = (id: string, notes: string) => {
    setOutline((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === id ? { ...section, notes } : section,
      ),
    }));
    setStatus("");
  };

  const moveSection = (id: string, direction: -1 | 1) => {
    setOutline((current) => {
      const index = current.sections.findIndex((section) => section.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.sections.length) {
        return current;
      }
      const sections = [...current.sections];
      [sections[index], sections[nextIndex]] = [
        sections[nextIndex],
        sections[index],
      ];
      return { ...current, sections };
    });
    setOpenMenuId(null);
    setStatus("Section order updated.");
  };

  const dropSection = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    setOutline((current) => {
      const sections = [...current.sections];
      const sourceIndex = sections.findIndex(
        (section) => section.id === draggedId,
      );
      const targetIndex = sections.findIndex(
        (section) => section.id === targetId,
      );
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const [moved] = sections.splice(sourceIndex, 1);
      sections.splice(targetIndex, 0, moved);
      return { ...current, sections };
    });
    setDraggedId(null);
    setStatus("Section order updated.");
  };

  const regenerateSection = (id: string) => {
    setRegeneratingId(id);
    setOpenMenuId(null);
    setStatus("");
    window.setTimeout(() => {
      setOutline((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === id && alternativeContent[id]
            ? { ...section, ...alternativeContent[id] }
            : section,
        ),
      }));
      setRegeneratingId(null);
      setStatus("Section regenerated.");
    }, 450);
  };

  const regenerateOutline = () => {
    setIsRegeneratingOutline(true);
    setStatus("");
    window.setTimeout(() => {
      setOutline((current) => ({
        ...current,
        sections: current.sections.map((section) => ({
          ...section,
          ...(alternativeContent[section.id] ?? {}),
        })),
      }));
      setIsRegeneratingOutline(false);
      setStatus("A new outline approach is ready.");
    }, 600);
  };

  const closeHealth = () => {
    setShowHealth(false);
    window.setTimeout(() => healthTriggerRef.current?.focus(), 0);
  };

  return (
    <main className={styles.page}>
      <DashboardSidebar
        activeHref="/dashboard?section=articles"
        showSettings={false}
      />

      <div className={styles.workspace}>
        <header className={styles.mobileHeader}>
          <Link href="/articles/new/brief" aria-label="Back to article brief">
            <ArrowLeft size={31} aria-hidden />
          </Link>
          <div className={styles.mobileTitle}>
            <Image
              src="/images/inkwell-icon.png"
              alt=""
              width={43}
              height={60}
              priority
            />
            <strong>Outline</strong>
          </div>
          <button type="button" onClick={() => saveOutline()}>
            Save
          </button>
        </header>

        <ArticleProgress currentStep={3} />

        <div className={styles.layout}>
          <section className={styles.mainContent}>
            <header className={styles.intro}>
              <h1>Build your article’s structure</h1>
              <div className={styles.desktopMetadata}>
                <div>
                  <span>Working title</span>
                  <strong>{outline.workingTitle}</strong>
                </div>
                <div>
                  <span>Audience</span>
                  <strong>{outline.targetAudience}</strong>
                </div>
                <div>
                  <span>Est. length</span>
                  <strong>{totalWords.toLocaleString()} words</strong>
                </div>
              </div>
              <div className={styles.mobileMetadata}>
                <span>
                  <i aria-hidden>
                    <ListBullets size={20} />
                  </i>
                  {outline.sections.length} sections
                </span>
                <span aria-hidden className={styles.divider} />
                <span>
                  <i aria-hidden>
                    <TextT size={20} />
                  </i>
                  ~{totalWords.toLocaleString()} words
                </span>
                <span aria-hidden className={styles.divider} />
                <button
                  ref={healthTriggerRef}
                  type="button"
                  onClick={() => setShowHealth(true)}
                >
                  Outline health
                </button>
              </div>
            </header>

            <div className={styles.sections} aria-label="Outline sections">
              {outline.sections.map((section, index) => {
                const isOpen = section.id === openSectionId;
                const isRegenerating = section.id === regeneratingId;
                return (
                  <article
                    className={`${styles.sectionCard} ${isOpen ? styles.openSection : ""} ${draggedId === section.id ? styles.dragging : ""}`}
                    draggable
                    key={section.id}
                    onDragStart={() => setDraggedId(section.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onDragOver={(event: DragEvent<HTMLElement>) =>
                      event.preventDefault()
                    }
                    onDrop={() => dropSection(section.id)}
                  >
                    <div className={styles.sectionHeader}>
                      <span className={styles.dragHandle} aria-hidden>
                        <DotsSixVertical size={25} weight="bold" />
                      </span>
                      <span className={styles.sectionNumber}>{index + 1}</span>
                      <h2>{section.title}</h2>
                      <div className={styles.sectionActions}>
                        <button
                          aria-label={`Regenerate ${section.title}`}
                          className={styles.desktopRegenerate}
                          disabled={isRegenerating}
                          onClick={() => regenerateSection(section.id)}
                          type="button"
                        >
                          <ArrowClockwise
                            className={isRegenerating ? styles.spinning : ""}
                            size={22}
                            aria-hidden
                          />
                        </button>
                        <div className={styles.menuWrap}>
                          <button
                            aria-expanded={openMenuId === section.id}
                            aria-haspopup="menu"
                            aria-label={`More actions for ${section.title}`}
                            className={styles.desktopMenuButton}
                            onClick={() =>
                              setOpenMenuId((current) =>
                                current === section.id ? null : section.id,
                              )
                            }
                            type="button"
                          >
                            <DotsThree size={25} weight="bold" aria-hidden />
                          </button>
                          {openMenuId === section.id ? (
                            <div className={styles.actionMenu} role="menu">
                              <button
                                disabled={index === 0}
                                onClick={() => moveSection(section.id, -1)}
                                role="menuitem"
                                type="button"
                              >
                                Move up
                              </button>
                              <button
                                disabled={index === outline.sections.length - 1}
                                onClick={() => moveSection(section.id, 1)}
                                role="menuitem"
                                type="button"
                              >
                                Move down
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <span className={styles.wordCount}>
                          ~{section.estimatedWords} words
                        </span>
                        <button
                          aria-controls={`section-content-${section.id}`}
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? "Collapse" : "Expand"} ${section.title}`}
                          className={styles.expandButton}
                          onClick={() =>
                            setOpenSectionId(isOpen ? "" : section.id)
                          }
                          type="button"
                        >
                          <CaretDown size={22} aria-hidden />
                        </button>
                      </div>
                    </div>

                    {isOpen ? (
                      <div
                        className={styles.sectionContent}
                        id={`section-content-${section.id}`}
                      >
                        <div className={styles.sectionDetails}>
                          <div>
                            <h3>
                              <span className={styles.desktopPurposeLabel}>
                                Section purpose
                              </span>
                              <span className={styles.mobilePurposeLabel}>
                                Purpose
                              </span>
                            </h3>
                            <p>{section.purpose}</p>
                          </div>
                          <div>
                            <h3>Questions to answer</h3>
                            <ul>
                              {section.questions.map((question) => (
                                <li key={question}>{question}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <label className={styles.notes}>
                          <span>
                            Notes <small>(optional)</small>
                          </span>
                          <textarea
                            maxLength={500}
                            onChange={(event) =>
                              updateNotes(section.id, event.target.value)
                            }
                            placeholder="Add any key points, examples, or context to include in this section…"
                            value={section.notes}
                          />
                        </label>

                        <div className={styles.mobileSectionMeta}>
                          <span>
                            <i aria-hidden>
                              <TextT size={18} />
                            </i>
                            Estimated words: ~{section.estimatedWords}
                          </span>
                        </div>
                        <div className={styles.mobileSectionActions}>
                          <button
                            disabled={isRegenerating}
                            onClick={() => regenerateSection(section.id)}
                            type="button"
                          >
                            <ArrowClockwise
                              className={isRegenerating ? styles.spinning : ""}
                              size={22}
                              aria-hidden
                            />
                            {isRegenerating ? "Regenerating…" : "Regenerate"}
                          </button>
                          <button
                            aria-expanded={openMenuId === section.id}
                            aria-haspopup="menu"
                            onClick={() =>
                              setOpenMenuId((current) =>
                                current === section.id ? null : section.id,
                              )
                            }
                            type="button"
                          >
                            More actions
                            <DotsThree size={23} weight="bold" aria-hidden />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <p className={styles.status} role="status" aria-live="polite">
              {status}
            </p>

            <div className={styles.mobileDraftAction}>
              <button onClick={startDrafting} type="button">
                Start drafting
              </button>
            </div>
          </section>

          <aside className={styles.healthPanel} aria-label="Outline health">
            <OutlineHealth
              checks={healthChecks}
              isRegenerating={isRegeneratingOutline}
              onRegenerate={regenerateOutline}
            />
          </aside>
        </div>

        <footer className={styles.desktopFooter}>
          <Link href="/articles/new/brief">
            <ArrowLeft size={19} aria-hidden /> Back to brief
          </Link>
          <div>
            <button type="button" onClick={() => saveOutline()}>
              Save
            </button>
            <button type="button" onClick={startDrafting}>
              Start drafting
            </button>
          </div>
        </footer>
      </div>

      {showHealth ? (
        <div className={styles.healthOverlay} onMouseDown={closeHealth}>
          <section
            aria-label="Outline health details"
            aria-modal="true"
            className={styles.healthDialog}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Close outline health"
              className={styles.closeHealth}
              onClick={closeHealth}
              ref={closeHealthRef}
              type="button"
            >
              <X size={24} aria-hidden />
            </button>
            <OutlineHealth
              checks={healthChecks}
              isRegenerating={isRegeneratingOutline}
              onRegenerate={regenerateOutline}
            />
          </section>
        </div>
      ) : null}
    </main>
  );
}
