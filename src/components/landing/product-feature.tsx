import type { ProductFeatureContent } from "./content";
import { ResponsiveProductImage } from "./responsive-product-image";

type ProductFeatureProps = {
  feature: ProductFeatureContent;
};

const signalToneClasses = {
  amber: "marker:text-ink-orange",
  crimson: "marker:text-ink-crimson",
  green: "marker:text-ink-green",
} as const;

export function ProductFeature({ feature }: ProductFeatureProps) {
  const columnsClass = feature.reverse
    ? "grid-cols-[minmax(260px,0.68fr)_minmax(0,1.62fr)]"
    : "grid-cols-[minmax(0,1.62fr)_minmax(260px,0.68fr)]";

  return (
    <article
      className={`grid items-center gap-[70px] border-b border-ink-line py-[52px] max-[900px]:gap-9 max-[720px]:grid-cols-1 max-[720px]:gap-7 max-[720px]:py-[54px] ${columnsClass}`}
      aria-labelledby={`${feature.id}-title`}
    >
      <div
        className={`min-w-0 max-[720px]:order-none ${feature.reverse ? "order-2" : ""}`}
      >
        <ResponsiveProductImage
          desktopSrc={feature.desktopImage}
          mobileSrc={feature.mobileImage}
          alt={feature.imageAlt}
          sizes="(max-width: 720px) calc(100vw - 32px), 720px"
        />
      </div>

      <div className="max-[720px]:order-first">
        <p className="mb-3 text-[0.72rem] font-extrabold tracking-[0.12em] text-ink-crimson uppercase">
          {feature.eyebrow}
        </p>
        <h2
          id={`${feature.id}-title`}
          className="m-0 max-w-[420px] font-display text-[clamp(2.65rem,4.5vw,4.7rem)] leading-[0.98] font-medium tracking-[-0.02em] max-[720px]:max-w-[340px] max-[720px]:text-[clamp(2.45rem,11vw,3.25rem)] max-[720px]:leading-[1.02]"
        >
          {feature.title}
        </h2>
        {feature.paragraphs.map((paragraph) => (
          <p
            className="mt-5 max-w-[390px] text-base leading-[1.65] text-ink-muted max-[720px]:mt-4 max-[720px]:max-w-[350px]"
            key={paragraph}
          >
            {paragraph}
          </p>
        ))}

        {feature.signals ? (
          <ul className="mt-6 grid list-disc gap-[11px] pl-[22px] font-bold text-ink-navy">
            {feature.signals.map((signal) => (
              <li className={signalToneClasses[signal.tone]} key={signal.label}>
                {signal.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
