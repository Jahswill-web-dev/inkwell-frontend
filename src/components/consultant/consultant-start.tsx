"use client";
import { ArrowRight, CaretDown, FileText, Plus } from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  consultantRequest as api,
  type Profile,
} from "@/lib/consultant/client";
import styles from "./consultant.module.css";

function articleStatusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function articleSummary(status: string) {
  const summaries: Record<string, string> = {
    setup: "Add the context Inkwell needs to begin your interview.",
    waiting_for_client:
      "Waiting for the interview responses that shape this article.",
    interview_in_progress:
      "Continue the conversation that will shape this article.",
    ready_to_draft: "Your interview is complete and ready to become a draft.",
    drafting: "Inkwell is turning your interview into a structured draft.",
    in_review: "Review and refine your draft before exporting it.",
    ready_to_publish: "Your article is ready for a final check.",
    published: "Your article is complete and ready to revisit anytime.",
  };
  return summaries[status] ?? "Continue working on your article.";
}

function articleActionLabel(status: string) {
  if (status === "in_review") return "Continue editing";
  if (status === "interview_in_progress") return "Resume interview";
  if (status === "setup") return "Start interview";
  if (status === "published") return "View article";
  return "View progress";
}

export function ConsultantDashboard() {
  const router = useRouter();
  const [articles, setArticles] = useState<
    { id: string; title: string; status: string; updated_at: string }[] | null
  >(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api<Profile>("profile"),
      api<{ items: NonNullable<typeof articles> }>("articles"),
    ])
      .then(([p, a]) => {
        if (!p.onboarding_complete) router.replace("/consultant/onboarding");
        else setArticles(a.items);
      })
      .catch((e) => setError(e.message));
  }, [router]);
  return (
    <>
      <header className={styles.dashboardHero}>
        <div className={styles.dashboardIntro}>
          <p className={styles.eyebrow}>Your ideas, in your voice</p>
          <h1>What’s on your mind?</h1>
          <p>
            Talk through your ideas. Get a structured article that sounds like
            you.
          </p>
        </div>
        <Link
          className={`${styles.primary} ${styles.newArticleButton}`}
          href="/consultant/new"
        >
          <Plus aria-hidden="true" size={20} weight="bold" />
          New article
        </Link>
      </header>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <section
        aria-labelledby="consultant-articles-title"
        className={styles.articleLibrary}
      >
        <header className={styles.articleLibraryHeader}>
          <h2 id="consultant-articles-title">My articles</h2>
          {articles && (
            <span>
              {articles.length} {articles.length === 1 ? "article" : "articles"}
            </span>
          )}
        </header>
        {!articles ? (
          <div className={styles.articleLibraryState}>
            <p role="status">Loading your articles…</p>
          </div>
        ) : articles.length === 0 ? (
          <div className={styles.articleLibraryState}>
            <FileText aria-hidden="true" size={28} />
            <div>
              <strong>Your first article starts with a conversation.</strong>
              <p>Share an idea and Inkwell will help you shape the draft.</p>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.articleList}>
              {articles.map((article) => {
                const actionLabel = articleActionLabel(article.status);
                return (
                  <Link
                    aria-label={`${actionLabel}: ${article.title}`}
                    className={styles.articleRow}
                    href={`/consultant/articles/${article.id}`}
                    key={article.id}
                  >
                    <span className={styles.articleIcon} aria-hidden="true">
                      <FileText size={25} />
                    </span>
                    <span className={styles.articleIdentity}>
                      <strong>{article.title}</strong>
                      <span>{articleSummary(article.status)}</span>
                    </span>
                    <span className={styles.articleMeta}>
                      <span className={styles.articleStatus}>
                        <span aria-hidden="true" />
                        {articleStatusLabel(article.status)}
                      </span>
                      <time dateTime={article.updated_at}>
                        Updated{" "}
                        {new Date(article.updated_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </time>
                    </span>
                    <span className={styles.articleAction}>
                      {actionLabel}
                      <ArrowRight aria-hidden="true" size={20} weight="bold" />
                    </span>
                  </Link>
                );
              })}
            </div>
            <p className={styles.articleLibraryHint}>
              Open any article to continue where you left off.
            </p>
          </>
        )}
      </section>
    </>
  );
}
export function ConsultantProfileForm({
  settings = false,
}: {
  settings?: boolean;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api<Profile>("profile")
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      await api("profile", "PUT", {
        display_name: profile.display_name,
        specialty: profile.specialty,
        audience: profile.audience,
      });
      if (settings) setSaved(true);
      else router.push("/consultant/new");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className={styles.eyebrow}>
        {settings ? "Your profile" : "Welcome to Inkwell"}
      </p>
      <h1>Tell us a little about your work.</h1>
      <p>
        Your interview gives Inkwell the ideas, examples, and wording it needs
        to create an article that sounds like you.
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {profile && (
        <form className={`${styles.form} ${styles.card}`} onSubmit={submit}>
          <label>
            Display name
            <input
              required
              maxLength={120}
              value={profile.display_name}
              onChange={(e) =>
                setProfile({ ...profile, display_name: e.target.value })
              }
            />
          </label>
          <label>
            Consulting specialty <span className={styles.muted}>Optional</span>
            <input
              maxLength={500}
              value={profile.specialty}
              onChange={(e) =>
                setProfile({ ...profile, specialty: e.target.value })
              }
              placeholder="For example, operations and growth"
            />
          </label>
          <label>
            Who do you usually help?{" "}
            <span className={styles.muted}>Optional</span>
            <input
              maxLength={500}
              value={profile.audience}
              onChange={(e) =>
                setProfile({ ...profile, audience: e.target.value })
              }
              placeholder="For example, founders of growing service businesses"
            />
          </label>
          <button className={styles.primary} disabled={busy}>
            {busy
              ? "Saving…"
              : settings
                ? "Save profile"
                : "Create my first article"}
          </button>
          {saved && <p role="status">Profile saved.</p>}
        </form>
      )}
    </>
  );
}
export function ConsultantNewArticle() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [length, setLength] = useState("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Profile>("profile")
      .then((p) => setAudience(p.audience))
      .catch((e) => setError(e.message));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const a = await api<{ id: string }>("articles", "POST", {
        title: values.get("title"),
        description: values.get("description"),
        audience,
        takeaway: values.get("takeaway") ?? "",
        length: values.get("length") ?? "standard",
      });
      router.push(`/consultant/articles/${a.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.newArticlePage}>
      <header className={styles.newArticleIntro}>
        <p className={styles.eyebrow}>A new conversation</p>
        <h1>What would you like to write about?</h1>
        <p>Start with an idea. We’ll help you find the words.</p>
      </header>
      <form className={styles.newArticleForm} onSubmit={submit}>
        <section className={styles.newArticleSurface}>
          <div className={styles.briefSection}>
            <header className={styles.briefSectionHeader}>
              <span className={styles.briefSectionNumber} aria-hidden="true">
                1
              </span>
              <h2>Your idea</h2>
              <span className={styles.briefSectionTag}>Required</span>
            </header>
            <div className={styles.briefFields}>
              <div className={styles.briefField}>
                <div className={styles.briefLabelRow}>
                  <label htmlFor="consultant-article-title">
                    Working title
                  </label>
                  <span aria-hidden="true">{title.length}/200</span>
                </div>
                <input
                  id="consultant-article-title"
                  name="title"
                  required
                  maxLength={200}
                  placeholder="Why better tools won’t fix broken handoffs"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className={styles.briefField}>
                <div className={styles.briefLabelRow}>
                  <label htmlFor="consultant-article-description">
                    What is it about?
                  </label>
                  <span aria-hidden="true">
                    {description.length.toLocaleString()}/20,000
                  </span>
                </div>
                <textarea
                  id="consultant-article-description"
                  required
                  name="description"
                  maxLength={20000}
                  placeholder="Describe the idea, problem, or opinion you want to explore."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </div>
          </div>

          <details className={styles.briefPreferences} open>
            <summary>
              <span className={styles.briefSectionNumber} aria-hidden="true">
                2
              </span>
              <span className={styles.briefPreferencesTitle}>
                <strong>Shape the draft</strong>
                <span className={styles.briefSectionTag}>Optional</span>
              </span>
              <CaretDown
                aria-hidden="true"
                className={styles.briefPreferencesCaret}
                size={18}
                weight="bold"
              />
            </summary>
            <div className={styles.briefPreferenceFields}>
              <div className={styles.briefField}>
                <label htmlFor="consultant-article-audience">
                  Intended reader
                </label>
                <input
                  id="consultant-article-audience"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  maxLength={500}
                />
              </div>
              <div className={styles.briefField}>
                <label htmlFor="consultant-article-takeaway">
                  Reader takeaway
                </label>
                <textarea
                  id="consultant-article-takeaway"
                  name="takeaway"
                  maxLength={500}
                  placeholder="What should they understand or do afterward?"
                />
              </div>
              <fieldset className={styles.lengthChoices}>
                <legend>Length</legend>
                <div>
                  {(
                    [
                      ["short", "Short", "400–700 words"],
                      ["standard", "Standard", "800–1,200 words"],
                      ["long", "Long", "1,200–1,800 words"],
                    ] as const
                  ).map(([value, label, words]) => (
                    <label
                      className={
                        length === value
                          ? `${styles.lengthChoice} ${styles.lengthChoiceSelected}`
                          : styles.lengthChoice
                      }
                      key={value}
                    >
                      <span>
                        <strong>{label}</strong>
                        <small>{words}</small>
                      </span>
                      <input
                        checked={length === value}
                        name="length"
                        onChange={() => setLength(value)}
                        type="radio"
                        value={value}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className={styles.briefHelp}>
                We’ll use only what your interview supports, even if that means
                a shorter draft.
              </p>
            </div>
          </details>

          {error && (
            <p
              className={`${styles.error} ${styles.newArticleError}`}
              role="alert"
            >
              {error}
            </p>
          )}
          <footer className={styles.newArticleFooter}>
            <p>Next: a guided interview about your idea.</p>
            <button className={styles.primary} disabled={busy}>
              {busy ? "Saving your idea…" : "Start my interview"}
              {!busy && (
                <ArrowRight aria-hidden="true" size={19} weight="bold" />
              )}
            </button>
          </footer>
        </section>
      </form>
    </div>
  );
}
