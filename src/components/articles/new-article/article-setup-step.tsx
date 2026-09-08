import { articleGoalLabels, articleGoals } from "@/lib/articles/article";
import {
  contentTypeLabels,
  contentTypes,
  targetLengthLabels,
  targetLengths,
  type ArticleSetupErrors,
  type ArticleSetupField,
  type ArticleSetupValues,
} from "@/lib/articles/article-setup";
import styles from "./article-setup-step.module.css";

type StepProps = {
  values: ArticleSetupValues;
  errors: ArticleSetupErrors;
  update: <K extends ArticleSetupField>(
    field: K,
    value: ArticleSetupValues[K],
  ) => void;
};

type FieldProps = {
  children: React.ReactNode;
  error?: string;
  hint?: string;
  label: string;
};

function Field({ children, error, hint, label }: FieldProps) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {error ? <small className={styles.error}>{error}</small> : null}
      {!error && hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function ClientArticleStep({ values, errors, update }: StepProps) {
  return (
    <div className={styles.grid}>
      <Field
        label="Client *"
        error={errors.clientName}
        hint="Use the company or brand name."
      >
        <input
          autoFocus
          aria-invalid={Boolean(errors.clientName)}
          value={values.clientName}
          onChange={(event) => update("clientName", event.target.value)}
          placeholder="Northstar Labs"
        />
      </Field>
      <Field label="Working title or topic *" error={errors.workingTitle}>
        <input
          aria-invalid={Boolean(errors.workingTitle)}
          maxLength={200}
          value={values.workingTitle}
          onChange={(event) => update("workingTitle", event.target.value)}
          placeholder="Why expert-led content earns trust"
        />
      </Field>
      <Field label="Content type *" error={errors.contentType}>
        <select
          value={values.contentType}
          onChange={(event) =>
            update(
              "contentType",
              event.target.value as ArticleSetupValues["contentType"],
            )
          }
        >
          {contentTypes.map((type) => (
            <option key={type} value={type}>
              {contentTypeLabels[type]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Target audience *" error={errors.targetAudience}>
        <input
          aria-invalid={Boolean(errors.targetAudience)}
          maxLength={500}
          value={values.targetAudience}
          onChange={(event) => update("targetAudience", event.target.value)}
          placeholder="Heads of content at B2B SaaS companies"
        />
      </Field>
      <Field label="Article goal *" error={errors.articleGoal}>
        <select
          value={values.articleGoal}
          onChange={(event) =>
            update(
              "articleGoal",
              event.target.value as ArticleSetupValues["articleGoal"],
            )
          }
        >
          {articleGoals.map((goal) => (
            <option key={goal} value={goal}>
              {articleGoalLabels[goal]}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

export function EditorialDirectionStep({ values, errors, update }: StepProps) {
  return (
    <div className={styles.grid}>
      <Field
        label="Main angle or hypothesis *"
        error={errors.mainAngle}
        hint="What point of view should shape the piece?"
      >
        <textarea
          autoFocus
          aria-invalid={Boolean(errors.mainAngle)}
          maxLength={1_000}
          rows={4}
          value={values.mainAngle}
          onChange={(event) => update("mainAngle", event.target.value)}
        />
      </Field>
      <Field
        label="Key message *"
        error={errors.keyMessage}
        hint="The one idea readers should remember."
      >
        <textarea
          aria-invalid={Boolean(errors.keyMessage)}
          maxLength={1_000}
          rows={4}
          value={values.keyMessage}
          onChange={(event) => update("keyMessage", event.target.value)}
        />
      </Field>
      <Field label="Call to action" error={errors.callToAction}>
        <input
          maxLength={500}
          value={values.callToAction}
          onChange={(event) => update("callToAction", event.target.value)}
          placeholder="Book a strategy call"
        />
      </Field>
      <Field label="Tone or brand voice *" error={errors.tone}>
        <input
          aria-invalid={Boolean(errors.tone)}
          maxLength={500}
          value={values.tone}
          onChange={(event) => update("tone", event.target.value)}
        />
      </Field>
      <Field label="Target length *" error={errors.targetLength}>
        <select
          value={values.targetLength}
          onChange={(event) =>
            update(
              "targetLength",
              event.target.value as ArticleSetupValues["targetLength"],
            )
          }
        >
          {targetLengths.map((length) => (
            <option key={length} value={length}>
              {targetLengthLabels[length]}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Primary SEO keyword"
        error={errors.seoKeyword}
        hint="Optional when search is not the goal."
      >
        <input
          maxLength={200}
          value={values.seoKeyword}
          onChange={(event) => update("seoKeyword", event.target.value)}
        />
      </Field>
    </div>
  );
}

const methods = [
  {
    value: "client" as const,
    title: "Interview the client",
    description:
      "Prepare a shareable interview for a client or subject-matter expert.",
  },
  {
    value: "self" as const,
    title: "Interview me",
    description:
      "Answer the interview yourself and turn your expertise into source material.",
  },
  {
    value: "notes" as const,
    title: "Use existing notes",
    description:
      "Skip the interview and continue with research, transcripts, or notes you already have.",
  },
];

export function InterviewSetupStep({ values, errors, update }: StepProps) {
  return (
    <div className={styles.interviewStep}>
      <fieldset className={styles.methods}>
        <legend>How should Inkwell collect the expertise?</legend>
        {methods.map((method) => (
          <label
            className={styles.method}
            data-selected={values.interviewMethod === method.value}
            key={method.value}
          >
            <input
              type="radio"
              name="interview-method"
              checked={values.interviewMethod === method.value}
              onChange={() => update("interviewMethod", method.value)}
            />
            <span>
              <strong>{method.title}</strong>
              <small>{method.description}</small>
            </span>
          </label>
        ))}
      </fieldset>

      {values.interviewMethod === "client" ? (
        <Field label="Client or expert name *" error={errors.intervieweeName}>
          <input
            autoFocus
            aria-invalid={Boolean(errors.intervieweeName)}
            maxLength={120}
            value={values.intervieweeName}
            onChange={(event) => update("intervieweeName", event.target.value)}
            placeholder="Avery Chen"
          />
        </Field>
      ) : null}

      {values.interviewMethod === "notes" ? (
        <Field label="Source notes *" error={errors.existingNotes}>
          <textarea
            autoFocus
            aria-invalid={Boolean(errors.existingNotes)}
            maxLength={20_000}
            rows={8}
            value={values.existingNotes}
            onChange={(event) => update("existingNotes", event.target.value)}
            placeholder="Paste research, transcripts, quotes, or rough notes…"
          />
        </Field>
      ) : (
        <Field
          label="Interview focus"
          error={errors.interviewInstructions}
          hint="Optional guidance for the interviewer."
        >
          <textarea
            maxLength={1_000}
            rows={5}
            value={values.interviewInstructions}
            onChange={(event) =>
              update("interviewInstructions", event.target.value)
            }
            placeholder="Focus on the customer transformation and ask for measurable examples."
          />
        </Field>
      )}
    </div>
  );
}
