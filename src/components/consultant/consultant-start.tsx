"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  consultantRequest as api,
  type Profile,
} from "@/lib/consultant/client";
import styles from "./consultant.module.css";
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
      <p className={styles.eyebrow}>Your ideas, in your voice</p>
      <h1>What’s on your mind?</h1>
      <p>
        Talk through your ideas. Get a structured article that sounds like you.
      </p>
      <Link className={styles.primary} href="/consultant/new">
        New article
      </Link>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <section className={styles.card}>
        <h2>My articles</h2>
        {!articles ? (
          <p role="status">Loading your articles…</p>
        ) : articles.length === 0 ? (
          <p>Your first article starts with a conversation.</p>
        ) : (
          articles.map((a) => (
            <div className={styles.row} key={a.id}>
              <div>
                <h3>{a.title}</h3>
                <p className={styles.muted}>
                  {a.status.replaceAll("_", " ")} · Updated{" "}
                  {new Date(a.updated_at).toLocaleDateString()}
                </p>
              </div>
              <Link
                className={styles.secondary}
                href={`/consultant/articles/${a.id}`}
              >
                {a.status === "in_review"
                  ? "Open draft"
                  : a.status === "interview_in_progress"
                    ? "Resume interview"
                    : a.status === "setup"
                      ? "Start interview"
                      : "View progress"}
              </Link>
            </div>
          ))
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
        Your interviews help Inkwell learn how you explain ideas. You can review
        and change your voice profile at any time.
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
  const [audience, setAudience] = useState("");
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
    <>
      <p className={styles.eyebrow}>A new conversation</p>
      <h1>What would you like to write about?</h1>
      <p>Start with an idea. We’ll help you find the words.</p>
      <form className={`${styles.form} ${styles.card}`} onSubmit={submit}>
        <label>
          Working title
          <input
            name="title"
            required
            maxLength={200}
            placeholder="Why better tools won’t fix broken handoffs"
          />
        </label>
        <label>
          What is it about?
          <textarea
            required
            name="description"
            maxLength={20000}
            placeholder="Describe the idea, problem, or opinion you want to explore."
          />
        </label>
        <details>
          <summary>More options</summary>
          <div className={styles.form}>
            <label>
              Intended reader
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                maxLength={500}
              />
            </label>
            <label>
              What should the reader understand or do afterward?
              <input name="takeaway" maxLength={500} />
            </label>
            <label>
              Length
              <select name="length" defaultValue="standard">
                <option value="short">Short · 400–700 words</option>
                <option value="standard">Standard · 800–1,200 words</option>
                <option value="long">Long · 1,200–1,800 words</option>
              </select>
            </label>
            <p className={styles.muted}>
              We’ll use only what your interview supports, even if that means a
              shorter draft.
            </p>
          </div>
        </details>
        <button className={styles.primary} disabled={busy}>
          {busy ? "Saving your idea…" : "Start my interview"}
        </button>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </>
  );
}
