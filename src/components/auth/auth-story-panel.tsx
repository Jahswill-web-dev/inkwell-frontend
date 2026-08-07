import Image from "next/image";
import Link from "next/link";
import styles from "./auth.module.css";

export function AuthStoryPanel() {
  return (
    <section className={styles.storyPanel} aria-labelledby="auth-promise">
      <Link className={styles.brandLink} href="/" aria-label="Inkwell home">
        <Image
          className={styles.brandLogo}
          src="/images/inkwell.png"
          alt="Inkwell"
          width={874}
          height={512}
          priority
        />
      </Link>

      <div className={styles.storyContent}>
        <h1 id="auth-promise" className={styles.promiseTitle}>
          <span className={styles.promiseLine}>Turn your ideas into</span>
          <span className={styles.promiseLine}>
            articles worth reading<span className={styles.titlePeriod}>.</span>
          </span>
        </h1>

        <p className={styles.desktopPromiseCopy}>
          Plan, write, and improve your articles
          <br />
          without losing your voice.
        </p>
        <p className={styles.mobilePromiseCopy}>
          Inkwell helps you go from a spark of insight
          <br />
          to a polished piece—faster and easier.
        </p>

        <article className={styles.editorialExcerpt} aria-label="About writing">
          <p className={styles.pullQuote}>
            Great ideas are elusive because they live in the realm of
            possibility, not precision. They arrive as splinters, fragments, and
            flashes—not as fully formed arguments.
          </p>

          <p>
            But writing asks for something different. It demands structure. It
            asks us to slow down, to arrange our thoughts in a way that others
            can follow. And that’s where friction begins.
          </p>

          <div className={styles.articleSection}>
            <h2>1. The messy nature of great ideas</h2>
            <p>
              Ideas rarely show up polished. They’re raw, ambiguous, and often
              contradictory. You might feel the shape of something but not yet
              the language to hold it. The chaos is part of the process.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
