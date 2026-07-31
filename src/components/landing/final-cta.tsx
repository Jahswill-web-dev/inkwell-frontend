import { pageShellClass, primaryButtonClass } from "./ui-classes";

export function FinalCta() {
  return (
    <section
      className="border-t-[3px] border-ink-crimson pt-[62px] pb-[58px] text-center max-[720px]:py-[52px] max-[720px]:pb-12"
      aria-labelledby="final-cta-title"
    >
      <div className={pageShellClass}>
        <h2
          id="final-cta-title"
          className="mx-auto mt-0 mb-6 max-w-[820px] font-display text-[clamp(2.5rem,4.2vw,4.35rem)] leading-[1.02] font-medium tracking-[-0.02em] max-[720px]:text-[2.65rem]"
        >
          Your next article is closer than you think.
        </h2>
        <a
          className={`${primaryButtonClass} min-w-[250px] max-[720px]:w-full max-[720px]:max-w-[320px]`}
          href="/signup"
        >
          Start your first article
        </a>
        <small className="mt-2.5 block text-xs text-[#737b8e]">
          No credit card required.
        </small>
      </div>
    </section>
  );
}
