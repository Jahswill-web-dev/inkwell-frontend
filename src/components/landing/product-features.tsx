import { productFeatures } from "./content";
import { ProductFeature } from "./product-feature";
import styles from "./product-features.module.css";

export function ProductFeatures() {
  return (
    <section
      id="features"
      className={styles.section}
      aria-label="Inkwell writing features"
    >
      <div className="page-shell">
        {productFeatures.map((feature) => (
          <ProductFeature key={feature.id} feature={feature} />
        ))}
      </div>
    </section>
  );
}
