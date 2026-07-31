import { getImageProps } from "next/image";

type ResponsiveProductImageProps = {
  desktopSrc: string;
  mobileSrc: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
};

export function ResponsiveProductImage({
  desktopSrc,
  mobileSrc,
  alt,
  priority = false,
  sizes = "(max-width: 720px) calc(100vw - 32px), 1100px",
}: ResponsiveProductImageProps) {
  const sharedProps = {
    alt,
    loading: priority ? ("eager" as const) : ("lazy" as const),
    fetchPriority: priority ? ("high" as const) : ("auto" as const),
  };
  const { props: desktopImage } = getImageProps({
    ...sharedProps,
    src: desktopSrc,
    width: 1487,
    height: 1058,
    sizes,
  });
  const { props: mobileImage } = getImageProps({
    ...sharedProps,
    src: mobileSrc,
    width: 852,
    height: 1846,
    sizes: "calc(100vw - 32px)",
  });

  return (
    <picture className="block w-full overflow-hidden rounded-lg border border-ink-navy/10 bg-white shadow-product max-[720px]:rounded-[7px] max-[720px]:shadow-[0_18px_42px_rgba(7,25,79,0.12)]">
      <source media="(max-width: 720px)" srcSet={mobileImage.srcSet} />
      <img {...desktopImage} alt={alt} className="block h-auto w-full" />
    </picture>
  );
}
