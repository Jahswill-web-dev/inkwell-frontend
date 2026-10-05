"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  ChatCenteredText,
  CheckCircle,
  FileMagnifyingGlass,
  Quotes,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  getInterviewInvitation,
  getInterviewTranscript,
  InterviewInvitationRequestError,
  type InterviewTranscript,
} from "@/lib/articles/client-interview-api";
import type { ArticleWorkspaceViewModel } from "@/lib/articles/article-workspace";
import styles from "./interview-notes.module.css";

type NotesState =
  | { type: "loading" }
  | { type: "no-interview" }
  | { type: "incomplete"; participantName: string }
  | {
      type: "ready";
      participantName: string;
      transcript: InterviewTranscript;
      interviewComplete: boolean;
    }
  | { type: "error"; message: string };

type StoredTranscriptTurn = InterviewTranscript["turns"][number];

function speakerLabel(speaker: StoredTranscriptTurn["speaker"]) {
  return speaker === "participant" ? "Client" : "Inkwell";
}

function NotesList({
  items,
  onSource,
}: {
  items: Array<{ text: string; source_item_ids: string[] }>;
  onSource: (itemId: string) => void;
}) {
  if (!items.length)
    return <p className={styles.emptyList}>Nothing flagged.</p>;

  return (
    <ul className={styles.notesList}>
      {items.map((item) => (
        <li key={item.text}>
          <span>{item.text}</span>
          {item.source_item_ids.length ? (
            <div>
              {item.source_item_ids.map((itemId, index) => (
                <button
                  key={itemId}
                  onClick={() => onSource(itemId)}
                  type="button"
                >
                  {index ? `Source ${index + 1}` : "View source"}
                </button>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function TranscriptPanel({
  turns,
  selectedItemId,
}: {
  turns: StoredTranscriptTurn[];
  selectedItemId: string | null;
}) {
  const [query, setQuery] = useState("");
  const visibleTurns = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return turns;
    return turns.filter((turn) =>
      turn.text.toLocaleLowerCase().includes(normalized),
    );
  }, [query, turns]);

  useEffect(() => {
    if (!selectedItemId) return;
    document
      .getElementById(`transcript-turn-${selectedItemId}`)
      ?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [selectedItemId]);

  return (
    <section
      className={styles.transcriptPanel}
      aria-labelledby="transcript-title"
    >
      <header>
        <div>
          <p>Conversation record</p>
          <h2 id="transcript-title">Transcript</h2>
        </div>
        <span>{turns.length} turns</span>
      </header>
      <label className={styles.search}>
        <FileMagnifyingGlass aria-hidden size={17} />
        <span className="sr-only">Search transcript</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search transcript"
          value={query}
        />
      </label>
      <div className={styles.turns} aria-live="polite">
        {visibleTurns.length ? (
          visibleTurns.map((turn) => (
            <article
              aria-current={
                selectedItemId === turn.item_id ? "true" : undefined
              }
              data-speaker={turn.speaker}
              id={`transcript-turn-${turn.item_id}`}
              key={turn.item_id}
            >
              <strong>{speakerLabel(turn.speaker)}</strong>
              <p>{turn.text}</p>
            </article>
          ))
        ) : (
          <p className={styles.noMatches}>No matching transcript turns.</p>
        )}
      </div>
    </section>
  );
}

function NotesWorkspace({
  participantName,
  transcript,
  interviewComplete,
  onRefresh,
  refreshing,
}: {
  participantName: string;
  transcript: InterviewTranscript;
  interviewComplete: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const insights = transcript.insights;

  function openSource(itemId: string) {
    setSelectedItemId(itemId);
  }

  return (
    <div className={styles.page}>
      <section className={styles.intro} aria-labelledby="interview-notes-title">
        <div>
          <p>Client interview</p>
          <h2 id="interview-notes-title">Interview notes</h2>
          <span>
            Structured notes are linked to the conversation, so you can review
            the evidence behind every detail.
          </span>
        </div>
        <div className={styles.meta}>
          <span>{participantName}</span>
          <button disabled={refreshing} onClick={onRefresh} type="button">
            <ArrowClockwise aria-hidden size={16} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </section>

      <div className={styles.workspace}>
        <TranscriptPanel
          selectedItemId={selectedItemId}
          turns={transcript.turns}
        />
        <aside className={styles.notesPanel} aria-labelledby="notes-title">
          <header>
            <div>
              <p>Structured notes</p>
              <h2 id="notes-title">What matters for the article</h2>
            </div>
            <ChatCenteredText aria-hidden size={22} />
          </header>

          {transcript.insight_status === "pending" ? (
            <section className={styles.pending} aria-live="polite">
              <ArrowClockwise aria-hidden size={24} />
              <h3>
                {interviewComplete
                  ? "Preparing structured notes…"
                  : "Interview not finished"}
              </h3>
              <p>
                {interviewComplete
                  ? "The transcript is saved. Refresh in a moment to see the summary."
                  : "The conversation so far is saved. Structured notes will be prepared after the interview ends."}
              </p>
            </section>
          ) : transcript.insight_status === "failed" || !insights ? (
            <section className={styles.failure} role="alert">
              <WarningCircle aria-hidden size={24} />
              <h3>Notes are not ready yet</h3>
              <p>
                {transcript.generation_error ??
                  "The transcript is available, but structured notes could not be prepared."}
              </p>
            </section>
          ) : (
            <>
              <section className={styles.summary}>
                <h3>Summary</h3>
                <p>{insights.summary}</p>
              </section>
              <section className={styles.noteSection}>
                <h3>
                  <CheckCircle aria-hidden size={18} /> Key insights
                </h3>
                <NotesList
                  items={insights.key_insights}
                  onSource={openSource}
                />
              </section>
              <section className={styles.noteSection}>
                <h3>
                  <WarningCircle aria-hidden size={18} /> Claims to verify
                </h3>
                <NotesList
                  items={insights.claims_to_verify}
                  onSource={openSource}
                />
              </section>
              <section className={styles.noteSection}>
                <h3>
                  <Quotes aria-hidden size={18} /> Examples and evidence
                </h3>
                <NotesList
                  items={insights.examples_and_evidence}
                  onSource={openSource}
                />
              </section>
              <section className={styles.noteSection}>
                <h3>Open questions</h3>
                {insights.open_questions.length ? (
                  <ul className={styles.openQuestions}>
                    {insights.open_questions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.emptyList}>No open questions.</p>
                )}
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export function InterviewNotes({
  workspace,
}: {
  workspace: ArticleWorkspaceViewModel;
}) {
  const [state, setState] = useState<NotesState>({ type: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    getInterviewInvitation(workspace.article.id)
      .then(async (invitation) => {
        if (!invitation) return { type: "no-interview" } as const;
        if (!invitation.id) {
          throw new Error("The completed interview could not be identified.");
        }
        try {
          const transcript = await getInterviewTranscript(
            workspace.article.id,
            invitation.id,
          );
          if (!transcript.turns.length) {
            return {
              type: "incomplete",
              participantName: invitation.participantName,
            } as const;
          }
          return {
            type: "ready",
            participantName: invitation.participantName,
            transcript,
            interviewComplete: invitation.progressState === "completed",
          } as const;
        } catch (error) {
          if (
            invitation.progressState !== "completed" &&
            error instanceof InterviewInvitationRequestError &&
            error.status === 404
          ) {
            return {
              type: "incomplete",
              participantName: invitation.participantName,
            } as const;
          }
          throw error;
        }
      })
      .then((nextState) => {
        if (active) setState(nextState);
      })
      .catch((error) => {
        if (active) {
          setState({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Interview notes could not be loaded.",
          });
        }
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey, workspace.article.id]);

  if (state.type === "loading") {
    return (
      <section className={styles.status} aria-busy="true">
        Loading interview notes…
      </section>
    );
  }
  if (state.type === "no-interview") {
    return (
      <section className={styles.status}>
        <h2>No client interview yet</h2>
        <p>
          Create and complete a client interview to see its transcript and notes
          here.
        </p>
      </section>
    );
  }
  if (state.type === "incomplete") {
    return (
      <section className={styles.status}>
        <h2>{state.participantName}&apos;s interview is still in progress</h2>
        <p>
          Saved conversation turns will appear here as they become available.
        </p>
      </section>
    );
  }
  if (state.type === "error") {
    return (
      <section className={styles.status} role="alert">
        <h2>We couldn’t load the interview notes</h2>
        <p>{state.message}</p>
        <button onClick={() => setRefreshKey((key) => key + 1)} type="button">
          Try again
        </button>
      </section>
    );
  }
  return (
    <NotesWorkspace
      participantName={state.participantName}
      transcript={state.transcript}
      interviewComplete={state.interviewComplete}
      onRefresh={() => {
        setRefreshing(true);
        setRefreshKey((key) => key + 1);
      }}
      refreshing={refreshing}
    />
  );
}
