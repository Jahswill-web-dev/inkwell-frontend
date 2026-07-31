import { ResponsiveProductImage } from "./responsive-product-image";
import {
  pageShellClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./ui-classes";

export function Hero() {
  return (
    <section
      className="pt-[58px] max-[720px]:pt-8"
      aria-labelledby="hero-title"
    >
      <div className={`${pageShellClass} text-center`}>
        <div className="mx-auto max-w-[860px]">
          <h1
            id="hero-title"
            className="m-0 font-display text-[clamp(3.5rem,6.2vw,5.75rem)] leading-[0.98] font-medium tracking-[-0.025em] text-ink-navy max-[720px]:text-[clamp(2.55rem,11vw,3.6rem)] max-[720px]:leading-[1.03]"
          >
            Turn your idea into a publish-ready article—
            <span className="block">without losing your voice.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[610px] text-[1.05rem] text-ink-muted max-[720px]:mt-[18px] max-[720px]:max-w-[340px] max-[720px]:text-[0.98rem]">
            Plan every section, write alongside AI, and finish thoughtful
            articles faster.
          </p>
          <div className="mt-[30px] flex justify-center gap-4 max-[720px]:mt-6 max-[720px]:grid max-[720px]:gap-2.5">
            <a
              className={`${primaryButtonClass} min-w-[210px] max-[720px]:w-full max-[720px]:min-w-0`}
              href="/signup"
            >
              Start writing free
            </a>
            <a
              className={`${secondaryButtonClass} min-w-[210px] max-[720px]:w-full max-[720px]:min-w-0`}
              href="#how-it-works"
            >
              See how it works
            </a>
          </div>
          <small className="mt-3 block text-[0.77rem] text-[#737b8e]">
            No credit card required.
          </small>
        </div>

        <div className="relative mx-auto mt-14 max-w-[1140px] px-[18px] pb-[26px] before:absolute before:inset-[22px_0_0] before:-z-10 before:-rotate-[1.1deg] before:rounded-lg before:border before:border-ink-navy/7 before:bg-[#f5f0e9] before:content-[''] max-[720px]:mt-[34px] max-[720px]:p-0 max-[720px]:before:hidden">
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
