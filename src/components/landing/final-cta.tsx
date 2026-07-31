import styles from "./final-cta.module.css";

export function FinalCta() {
  return (
    <section className={styles.section} aria-labelledby="final-cta-title">
      <div className="page-shell">
        <h2 id="final-cta-title">
          Your next article is closer than you think.
        </h2>
        <a className="button button--primary" href="/signup">
          Start your first article
        </a>
        <small>No credit card required.</small>
      </div>
    </section>
  );
}
