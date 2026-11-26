"use client";
import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  FileText,
  MagnifyingGlass,
  Plus,
} from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  consultantRequest as api,
  type Profile,
} from "@/lib/consultant/client";
import styles from "./consultant.module.css";

function articleStatusLabel(status: string) {
  const labels: Record<string, string> = {
    setup: "Idea saved",
    waiting_for_client: "Awaiting interview",
    interview_in_progress: "Interview in progress",
    ready_to_draft: "Ready to draft",
    drafting: "Drafting",
    in_review: "Ready to edit",
    ready_to_publish: "Ready to edit",
    published: "Published",
  };
  if (labels[status]) return labels[status];
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function articleActionLabel(status: string) {
  if (status === "in_review") return "Open article";
  if (status === "ready_to_publish") return "Open article";
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
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  useEffect(() => {
    Promise.all([
      api<Profile>("profile"),
      (async () => {
        const items: NonNullable<typeof articles> = [];
        let page;
        do {
          page = await api<{ items: NonNullable<typeof articles> }>(
            `articles?offset=${items.length}&limit=100`,
          );
          items.push(...page.items);
        } while (page.items.length === 100);
        return { items };
      })(),
    ])
      .then(([p, a]) => {
        if (!p.onboarding_complete) router.replace("/consultant/onboarding");
        else setArticles(a.items);
      })
      .catch((e) => setError(e.message));
  }, [router]);
  const visibleArticles = articles?.filter((article) => {
    const ready = ["in_review", "ready_to_publish"].includes(article.status);
    const matchesFilter =
      filter === "all" ||
      (filter === "ready" ? ready : !ready && article.status !== "published");
    return (
      matchesFilter &&
      article.title
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase())
    );
  });
  return (
    <>
      <header className={styles.dashboardHero}>
        <div className={styles.dashboardIntro}>
          <p className={styles.eyebrow}>Your ideas, in your voice</p>
          <h1 id="consultant-articles-title">My articles</h1>
          <p>Your ideas, shaped into articles in your voice.</p>
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
        <div className={styles.libraryToolbar}>
          <div
            className={styles.libraryFilters}
            role="group"
            aria-label="Filter articles"
          >
            {[
              ["all", "All articles"],
              ["progress", "In progress"],
              ["ready", "Ready to edit"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className={styles.librarySearch}>
            <MagnifyingGlass size={21} aria-hidden="true" />
            <span className={styles.visuallyHidden}>Search your articles</span>
            <input
              type="search"
              placeholder="Search your articles"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        {error && !articles ? (
          <div className={styles.articleLibraryState}>
            <p>
              Your articles could not be loaded. Refresh the page to try again.
            </p>
          </div>
        ) : !articles ? (
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
        ) : visibleArticles?.length === 0 ? (
          <div className={styles.articleLibraryState} role="status">
            <MagnifyingGlass size={28} aria-hidden="true" />
            <div>
              <strong>No matching articles</strong>
              <p>Try another search or choose a different filter.</p>
            </div>
            <button
              className={styles.resetFilters}
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className={styles.articleList}>
              {visibleArticles?.map((article) => {
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
                      <time dateTime={article.updated_at}>
                        Updated{" "}
                        {new Date(article.updated_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            ...(new Date(article.updated_at).getFullYear() !==
                            new Date().getFullYear()
                              ? { year: "numeric" as const }
                              : {}),
                          },
                        )}
                      </time>
                    </span>
                    <span className={styles.articleMeta}>
                      <span className={styles.articleStatus}>
                        {articleStatusLabel(article.status)}
                      </span>
                    </span>
                    <span className={styles.articleAction}>
                      {actionLabel}
                      <ArrowRight aria-hidden="true" size={20} weight="bold" />
                    </span>
                  </Link>
                );
              })}
            </div>
            <p className={styles.visuallyHidden} role="status">
              {visibleArticles?.length}{" "}
              {visibleArticles?.length === 1 ? "article" : "articles"} shown
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
const articleLengths = [
  ["short", "Short", "400–700 words"],
  ["standard", "Standard", "800–1,200 words"],
  ["long", "Long", "1,200–1,800 words"],
  ["extended", "Extended", "1,800–3,000 words"],
  ["in_depth", "In-depth", "3,000–5,000 words"],
] as const;

export function ConsultantNewArticle() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [length, setLength] = useState("standard");
  const [createdArticleId, setCreatedArticleId] = useState<string | null>(null);
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
      let articleId = createdArticleId;
      if (!articleId) {
        const article = await api<{ id: string }>("articles", "POST", {
          title,
          description,
          audience,
          takeaway: values.get("takeaway") ?? "",
          length,
        });
        articleId = article.id;
        setCreatedArticleId(articleId);
      }
      const interview = await api<{ id: string }>(
        `articles/${articleId}/interviews`,
        "POST",
      );
      router.push(`/consultant/interviews/${interview.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const selectedLength = articleLengths.find(([value]) => value === length)!;
  return (
    <div className={styles.newArticlePage}>
      <Link className={styles.newArticleBack} href="/consultant">
        <ArrowLeft size={20} aria-hidden="true" /> Back to my articles
      </Link>
      <header className={styles.newArticleIntro}>
        <p className={styles.eyebrow}>A new conversation</p>
        <h1>What would you like to write about?</h1>
        <p>Start with an idea. We’ll explore it together.</p>
      </header>
      <form className={styles.newArticleForm} onSubmit={submit}>
        <fieldset
          className={styles.ideaFields}
          disabled={busy || Boolean(createdArticleId)}
        >
          <legend className={styles.visuallyHidden}>Your article idea</legend>
          <div className={styles.canvasField}>
            <div className={styles.briefLabelRow}>
              <label htmlFor="consultant-article-title">Working title</label>
              <span>Required</span>
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
          <div className={`${styles.canvasField} ${styles.ideaDescription}`}>
            <div className={styles.briefLabelRow}>
              <label htmlFor="consultant-article-description">
                What is it about?
              </label>
              <span>Required</span>
            </div>
            <textarea
              id="consultant-article-description"
              name="description"
              required
              maxLength={20000}
              placeholder="Share the idea, problem, or opinion you want to explore."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <details className={styles.briefPreferences}>
            <summary>
              <span className={styles.briefPreferencesTitle}>
                <span>
                  <strong>Shape the draft</strong>
                  <span className={styles.optionalLabel}>Optional</span>
                </span>
                <small>{selectedLength[1]} length</small>
              </span>
              <CaretDown
                aria-hidden="true"
                className={styles.briefPreferencesCaret}
                size={19}
              />
            </summary>
            <div className={styles.briefPreferenceFields}>
              <div className={styles.briefField}>
                <label htmlFor="consultant-article-audience">
                  Intended reader
                </label>
                <input
                  id="consultant-article-audience"
                  placeholder="Who is this for?"
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
              <div className={styles.briefField}>
                <label htmlFor="consultant-article-length">Length</label>
                <select
                  id="consultant-article-length"
                  name="length"
                  value={length}
                  onChange={(event) => setLength(event.target.value)}
                  aria-describedby="consultant-length-help"
                >
                  {articleLengths.map(([value, label, words]) => (
                    <option key={value} value={value}>
                      {label} · {words}
                    </option>
                  ))}
                </select>
                <p id="consultant-length-help" className={styles.briefHelp}>
                  Length is a guide. Your interview gives the article its
                  substance.
                </p>
              </div>
            </div>
          </details>
        </fieldset>
        {error && (
          <p className={styles.error} role="alert">
            {createdArticleId
              ? "Your idea is saved. Please try continuing to your interview again. "
              : ""}
            {error}
          </p>
        )}
        <footer className={styles.newArticleFooter}>
          <p>Next: prepare for a guided conversation.</p>
          <button className={styles.primary} disabled={busy}>
            {busy ? "Preparing your interview…" : "Continue to interview"}
            {!busy && <ArrowRight aria-hidden="true" size={20} />}
          </button>
        </footer>
      </form>
    </div>
  );
}
