import type { ProductFeatureContent } from "./content";
import { ResponsiveProductImage } from "./responsive-product-image";
import styles from "./product-feature.module.css";

type ProductFeatureProps = {
  feature: ProductFeatureContent;
};

export function ProductFeature({ feature }: ProductFeatureProps) {
  return (
    <article
      className={`${styles.feature} ${feature.reverse ? styles.reverse : ""}`}
      aria-labelledby={`${feature.id}-title`}
    >
      <div className={styles.visual}>
        <ResponsiveProductImage
          desktopSrc={feature.desktopImage}
          mobileSrc={feature.mobileImage}
          alt={feature.imageAlt}
          sizes="(max-width: 720px) calc(100vw - 32px), 720px"
        />
      </div>

      <div className={styles.copy}>
        <p className="eyebrow">{feature.eyebrow}</p>
        <h2 id={`${feature.id}-title`}>{feature.title}</h2>
        {feature.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        {feature.signals ? (
          <ul className={styles.signals}>
            {feature.signals.map((signal) => (
              <li key={signal.label} data-tone={signal.tone}>
                {signal.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
