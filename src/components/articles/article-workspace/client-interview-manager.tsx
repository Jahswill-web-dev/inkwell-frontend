"use client";

import { useMemo, useState } from "react";
import {
  ArrowClockwise,
  Check,
  Copy,
  Eye,
  LinkSimple,
  LockKey,
  PaperPlaneTilt,
  Prohibit,
  X,
} from "@phosphor-icons/react";
import {
  createInterviewInvitation,
  interviewInvitationInputSchema,
  interviewInvitationLabel,
  interviewInvitationUrl,
  interviewProgressPercent,
  isInterviewInvitationExpired,
  revokeInterviewInvitation,
  type InterviewInvitation,
} from "@/lib/articles/client-interview-invitation";
import {
  loadInterviewInvitation,
  saveInterviewInvitation,
} from "@/lib/articles/client-interview-storage";
import type { ArticleWorkspaceViewModel } from "@/lib/articles/article-workspace";
import styles from "./client-interview-manager.module.css";

type FormErrors = Partial<
  Record<"participantName" | "participantEmail" | "expiresOn", string>
>;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function progressDescription(invitation: InterviewInvitation) {
  if (invitation.status === "revoked") {
    return "This link can no longer be used. The participant was not notified.";
  }
  if (isInterviewInvitationExpired(invitation)) {
    return "This link has expired. Regenerate it to invite the participant again.";
  }
  if (invitation.progressState === "completed") {
    return "The interview is complete and its source material is ready for review.";
  }
  if (invitation.progressState === "in_progress") {
    return `${invitation.questionsAnswered} questions answered. Inkwell is still collecting the missing context.`;
  }
  if (invitation.progressState === "opened") {
    return "The participant opened the interview but has not answered a question yet.";
  }
  return "The participant has not opened this interview yet.";
}

function PreviewDialog({
  workspace,
  participantName,
  onClose,
}: {
  workspace: ArticleWorkspaceViewModel;
  participantName: string;
  onClose: () => void;
}) {
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="interview-preview-title"
        aria-modal="true"
        className={styles.preview}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="Close interview preview"
          className={styles.closeButton}
          onClick={onClose}
          type="button"
        >
          <X size={18} aria-hidden />
        </button>
        <span className={styles.previewMark}>I</span>
        <p>{workspace.clientName}</p>
        <h2 id="interview-preview-title">
          Share your expertise for “{workspace.article.working_title}”
        </h2>
        <span>
          Hi {participantName}. Inkwell will ask one focused question at a time.
          This usually takes 5–10 minutes, and you can pause and return later.
        </span>
        <button disabled type="button">
          Begin interview
        </button>
        <small>
          This is a writer preview. The interactive guest experience arrives in
          Milestone 5.
        </small>
      </section>
    </div>
  );
}

export function ClientInterviewManager({
  workspace,
}: {
  workspace: ArticleWorkspaceViewModel;
}) {
  const defaultParticipant = workspace.participants[0]?.name ?? "";
  const [invitation, setInvitation] = useState(() =>
    loadInterviewInvitation(workspace.article.id),
  );
  const [participantName, setParticipantName] = useState(
    invitation?.participantName ?? defaultParticipant,
  );
  const [participantEmail, setParticipantEmail] = useState(
    invitation?.participantEmail ?? "",
  );
  const [expiresOn, setExpiresOn] = useState(
    invitation?.expiresAt?.slice(0, 10) ?? "",
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [copyMessage, setCopyMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const invitationUrl = useMemo(() => {
    if (!invitation) return "";
    const origin =
      typeof window === "undefined"
        ? "https://app.useinkwell.com"
        : window.location.origin;
    return interviewInvitationUrl(invitation, origin);
  }, [invitation]);

  function persist(nextInvitation: InterviewInvitation) {
    saveInterviewInvitation(nextInvitation);
    setInvitation(nextInvitation);
  }

  function createInvitation() {
    const result = interviewInvitationInputSchema.safeParse({
      participantName,
      participantEmail,
      expiresOn,
    });
    if (!result.success) {
      const nextErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormErrors;
        if (!nextErrors[field]) nextErrors[field] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    persist(
      createInterviewInvitation(workspace.article.id, result.data, {
        generation: (invitation?.generation ?? 0) + 1,
        articleTitle: workspace.article.working_title,
        clientName: workspace.clientName,
        writerName: workspace.assignee,
      }),
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopyMessage("Link copied");
    } catch {
      setCopyMessage("Could not copy the link");
    }
  }

  function revokeLink() {
    if (!invitation) return;
    persist(revokeInterviewInvitation(invitation));
    setCopyMessage("");
  }

  function regenerateLink() {
    if (!invitation) return;
    const reusableExpiration =
      invitation.expiresAt && !isInterviewInvitationExpired(invitation)
        ? invitation.expiresAt.slice(0, 10)
        : "";
    persist(
      createInterviewInvitation(
        workspace.article.id,
        {
          participantName: invitation.participantName,
          participantEmail: invitation.participantEmail,
          expiresOn: reusableExpiration,
        },
        {
          generation: invitation.generation + 1,
          articleTitle: workspace.article.working_title,
          clientName: workspace.clientName,
          writerName: workspace.assignee,
        },
      ),
    );
    setExpiresOn(reusableExpiration);
  }

  const linkIsInactive =
    invitation &&
    (invitation.status === "revoked" ||
      isInterviewInvitationExpired(invitation));

  return (
    <div className={styles.layout}>
      <section className={styles.intro} aria-labelledby="interviews-heading">
        <div>
          <p>Source collection</p>
          <h2 id="interviews-heading">Client interview</h2>
          <span>
            Invite one client expert to answer focused questions. You’ll see
            concise progress here while their answers remain private.
          </span>
        </div>
        <div className={styles.privacyNote}>
          <LockKey size={20} aria-hidden />
          <span>
            The guest link only exposes the interview welcome and questions—not
            your workspace, brief, or draft.
          </span>
        </div>
      </section>

      {!invitation ? (
        <section className={styles.card} aria-labelledby="create-link-heading">
          <header>
            <div className={styles.iconBox}>
              <LinkSimple size={21} aria-hidden />
            </div>
            <div>
              <p>New invitation</p>
              <h3 id="create-link-heading">Create a private interview link</h3>
            </div>
          </header>
          <div className={styles.formGrid}>
            <label>
              <span>Participant name</span>
              <input
                aria-describedby={
                  errors.participantName ? "participant-name-error" : undefined
                }
                aria-invalid={Boolean(errors.participantName)}
                onChange={(event) => setParticipantName(event.target.value)}
                placeholder="e.g. Avery Chen"
                value={participantName}
              />
              {errors.participantName ? (
                <small id="participant-name-error">
                  {errors.participantName}
                </small>
              ) : null}
            </label>
            <label>
              <span>Participant email</span>
              <input
                aria-describedby={
                  errors.participantEmail
                    ? "participant-email-error"
                    : undefined
                }
                aria-invalid={Boolean(errors.participantEmail)}
                onChange={(event) => setParticipantEmail(event.target.value)}
                placeholder="avery@client.com"
                type="email"
                value={participantEmail}
              />
              {errors.participantEmail ? (
                <small id="participant-email-error">
                  {errors.participantEmail}
                </small>
              ) : null}
            </label>
            <label>
              <span>
                Expiration date <em>Optional</em>
              </span>
              <input
                aria-describedby={
                  errors.expiresOn ? "expiration-error" : undefined
                }
                aria-invalid={Boolean(errors.expiresOn)}
                onChange={(event) => setExpiresOn(event.target.value)}
                type="date"
                value={expiresOn}
              />
              {errors.expiresOn ? (
                <small id="expiration-error">{errors.expiresOn}</small>
              ) : null}
            </label>
          </div>
          <div className={styles.formActions}>
            <button
              className={styles.primaryButton}
              onClick={createInvitation}
              type="button"
            >
              Create interview link
            </button>
            <span>No email is sent during this frontend milestone.</span>
          </div>
        </section>
      ) : (
        <section className={styles.card} aria-labelledby="invitation-heading">
          <header className={styles.invitationHeader}>
            <div>
              <p>Client expert</p>
              <h3 id="invitation-heading">{invitation.participantName}</h3>
              <span>{invitation.participantEmail}</span>
            </div>
            <strong
              data-state={
                linkIsInactive ? "inactive" : invitation.progressState
              }
            >
              {interviewInvitationLabel(invitation)}
            </strong>
          </header>

          <div className={styles.progressSummary}>
            <div>
              <span>Interview progress</span>
              <b>{interviewProgressPercent(invitation)}%</b>
            </div>
            <div
              aria-label={`${interviewProgressPercent(invitation)}% complete`}
              className={styles.progressTrack}
            >
              <span
                style={{ width: `${interviewProgressPercent(invitation)}%` }}
              />
            </div>
            <p>{progressDescription(invitation)}</p>
          </div>

          <dl className={styles.invitationFacts}>
            <div>
              <dt>Created</dt>
              <dd>{formatDate(invitation.createdAt)}</dd>
            </div>
            <div>
              <dt>Opened</dt>
              <dd>
                {invitation.openedAt
                  ? formatDate(invitation.openedAt)
                  : "Not yet"}
              </dd>
            </div>
            <div>
              <dt>Expires</dt>
              <dd>
                {invitation.expiresAt
                  ? formatDate(invitation.expiresAt)
                  : "No expiration"}
              </dd>
            </div>
          </dl>

          {!linkIsInactive ? (
            <>
              <label className={styles.linkField}>
                <span>Client interview link</span>
                <input readOnly value={invitationUrl} />
              </label>
              <div className={styles.actionRow}>
                <button
                  className={styles.primaryButton}
                  onClick={copyLink}
                  type="button"
                >
                  {copyMessage === "Link copied" ? (
                    <Check size={17} aria-hidden />
                  ) : (
                    <Copy size={17} aria-hidden />
                  )}
                  Copy link
                </button>
                <button onClick={() => setPreviewOpen(true)} type="button">
                  <Eye size={17} aria-hidden /> Preview experience
                </button>
                <button
                  disabled
                  title="Email reminders are planned for a later milestone"
                  type="button"
                >
                  <PaperPlaneTilt size={17} aria-hidden /> Send reminder
                </button>
                <button
                  className={styles.dangerButton}
                  onClick={revokeLink}
                  type="button"
                >
                  <Prohibit size={17} aria-hidden /> Revoke link
                </button>
              </div>
              <p aria-live="polite" className={styles.copyMessage}>
                {copyMessage}
              </p>
            </>
          ) : (
            <div className={styles.inactiveActions}>
              <button
                className={styles.primaryButton}
                onClick={regenerateLink}
                type="button"
              >
                <ArrowClockwise size={17} aria-hidden /> Regenerate link
              </button>
              <span>A new token will replace the inactive link.</span>
            </div>
          )}
        </section>
      )}

      <aside className={styles.mockNote}>
        <strong>Frontend milestone</strong>
        <span>
          Invitation state is stored in this browser session. Secure tokens,
          delivery, and live guest activity will connect to the backend later.
        </span>
      </aside>

      {previewOpen && invitation ? (
        <PreviewDialog
          onClose={() => setPreviewOpen(false)}
          participantName={invitation.participantName}
          workspace={workspace}
        />
      ) : null}
    </div>
  );
}
