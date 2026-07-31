import { productFeatures } from "./content";
import { ProductFeature } from "./product-feature";
import { pageShellClass } from "./ui-classes";

export function ProductFeatures() {
  return (
    <section
      id="features"
      className="scroll-mt-6"
      aria-label="Inkwell writing features"
    >
      <div className={pageShellClass}>
        {productFeatures.map((feature) => (
          <ProductFeature key={feature.id} feature={feature} />
        ))}
      </div>
    </section>
  );
}
