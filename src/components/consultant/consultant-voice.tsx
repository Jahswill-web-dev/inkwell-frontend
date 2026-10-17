"use client";
import { useEffect, useState } from "react";
import {
  consultantRequest as api,
  type Profile,
  type Voice,
} from "@/lib/consultant/client";
import styles from "./consultant.module.css";
const blank: Voice = {
  vocabulary: [],
  explanation_patterns: "",
  analogies: "",
  formality: "",
  rhythm: "",
  perspective: "",
  avoid: [],
  excerpts: [],
};
export function ConsultantVoice({ compact = false }: { compact?: boolean }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [voice, setVoice] = useState<Voice>(blank);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Profile>("profile")
      .then((p) => {
        setProfile(p);
        setVoice({ ...blank, ...p.voice });
      })
      .catch((e) => setError(e.message));
  }, []);
  async function act(action: "save" | "approve" | "dismiss" | "reset") {
    setBusy(true);
    setError("");
    try {
      await api("voice", "PUT", {
        action,
        ...(action === "save" ? { voice } : {}),
      });
      const p = await api<Profile>("profile");
      setProfile(p);
      setVoice({ ...blank, ...p.voice });
      setNotice(
        action === "dismiss"
          ? "Suggestion dismissed."
          : "Voice preferences saved.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (compact && !profile?.suggested_voice) return null;
  return (
    <section className={compact ? styles.card : ""}>
      {!compact && (
        <>
          <p className={styles.eyebrow}>Your editorial identity</p>
          <h1>My voice</h1>
          <p>
            Your interview is always the source. These preferences help your
            writing stay recognisably yours across articles.
          </p>
        </>
      )}
      {profile?.suggested_voice && (
        <div className={styles.card}>
          <h2>A voice profile from your interview</h2>
          <p>{profile.suggested_voice.explanation_patterns}</p>
          <p>{profile.suggested_voice.formality}</p>
          <p>
            <strong>Characteristic phrases:</strong>{" "}
            {profile.suggested_voice.vocabulary.join(" · ")}
          </p>
          {profile.suggested_voice.excerpts.map((quote, index) => (
            <blockquote key={index}>{quote}</blockquote>
          ))}
          <div className={styles.actions}>
            <button
              disabled={busy}
              className={styles.primary}
              onClick={() => void act("approve")}
            >
              Save this voice
            </button>
            <button
              disabled={busy}
              className={styles.secondary}
              onClick={() => {
                setVoice({ ...blank, ...profile.suggested_voice! });
                setNotice(
                  "Suggestion loaded below. Edit it, then save your preferences.",
                );
              }}
            >
              Edit suggestion
            </button>
            <button
              disabled={busy}
              className={styles.secondary}
              onClick={() => void act("dismiss")}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <details open={!compact || notice.startsWith("Suggestion")}>
        <summary>Edit voice preferences</summary>
        <form
          className={`${styles.form} ${styles.card}`}
          onSubmit={(e) => {
            e.preventDefault();
            void act("save");
          }}
        >
          <label>
            Words and phrases (one per line)
            <textarea
              value={voice.vocabulary.join("\n")}
              onChange={(e) =>
                setVoice({ ...voice, vocabulary: e.target.value.split("\n") })
              }
            />
          </label>
          {(
            [
              ["explanation_patterns", "How I explain ideas"],
              ["analogies", "Analogies and examples"],
              ["formality", "Directness and formality"],
              ["rhythm", "Sentence and paragraph rhythm"],
              ["perspective", "Perspective"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <textarea
                value={voice[key]}
                maxLength={key === "explanation_patterns" ? 2000 : 1000}
                onChange={(e) => setVoice({ ...voice, [key]: e.target.value })}
              />
            </label>
          ))}
          <label>
            Words and styles to avoid (one per line)
            <textarea
              value={voice.avoid.join("\n")}
              onChange={(e) =>
                setVoice({ ...voice, avoid: e.target.value.split("\n") })
              }
            />
          </label>
          <div className={styles.actions}>
            <button className={styles.primary} disabled={busy}>
              Save preferences
            </button>
            <button
              className={styles.secondary}
              disabled={busy}
              type="button"
              onClick={() => void act("reset")}
            >
              Reset voice
            </button>
          </div>
        </form>
      </details>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
