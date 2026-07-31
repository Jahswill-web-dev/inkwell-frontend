import { ResponsiveProductImage } from "./responsive-product-image";
import styles from "./hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={`page-shell ${styles.inner}`}>
        <div className={styles.copy}>
          <h1 id="hero-title">
            Turn your idea into a publish-ready article—
            <span>without losing your voice.</span>
          </h1>
          <p>
            Plan every section, write alongside AI, and finish thoughtful
            articles faster.
          </p>
          <div className={styles.actions}>
            <a className="button button--primary" href="/signup">
              Start writing free
            </a>
            <a className="button button--secondary" href="#how-it-works">
              See how it works
            </a>
          </div>
          <small>No credit card required.</small>
        </div>

        <div className={styles.productPreview}>
          <ResponsiveProductImage
            desktopSrc="/images/product/desktop/draft-editor.png"
            mobileSrc="/images/product/mobile/draft-editor.png"
            alt="Inkwell editor helping a writer develop an article section by section"
            priority
          />
        </div>
      </div>
    </section>
  );
}
