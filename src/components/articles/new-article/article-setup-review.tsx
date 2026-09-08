import {
  contentTypeLabels,
  targetLengthLabels,
  type ArticleSetupValues,
} from "@/lib/articles/article-setup";
import { articleGoalLabels } from "@/lib/articles/article";
import styles from "./article-setup-review.module.css";

const methodLabels = {
  client: "Client interview",
  self: "Writer interview",
  notes: "Existing source material",
};

export function ArticleSetupReview({ values }: { values: ArticleSetupValues }) {
  return (
    <div className={styles.review}>
      <section>
        <p>Article</p>
        <h3>{values.workingTitle}</h3>
        <dl>
          <div>
            <dt>Client</dt>
            <dd>{values.clientName}</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>{contentTypeLabels[values.contentType]}</dd>
          </div>
          <div>
            <dt>Audience</dt>
            <dd>{values.targetAudience}</dd>
          </div>
          <div>
            <dt>Goal</dt>
            <dd>{articleGoalLabels[values.articleGoal]}</dd>
          </div>
        </dl>
      </section>
      <section>
        <p>Editorial direction</p>
        <dl>
          <div>
            <dt>Main angle</dt>
            <dd>{values.mainAngle}</dd>
          </div>
          <div>
            <dt>Key message</dt>
            <dd>{values.keyMessage}</dd>
          </div>
          <div>
            <dt>Voice</dt>
            <dd>{values.tone}</dd>
          </div>
          <div>
            <dt>Length</dt>
            <dd>{targetLengthLabels[values.targetLength]}</dd>
          </div>
        </dl>
      </section>
      <section className={styles.nextAction}>
        <p>Next action</p>
        <h3>{methodLabels[values.interviewMethod]}</h3>
        <span>
          {values.interviewMethod === "client"
            ? `Create an interview for ${values.intervieweeName}.`
            : values.interviewMethod === "self"
              ? "Start a guided interview after the article is created."
              : "Continue directly to the article brief."}
        </span>
      </section>
    </div>
  );
}
