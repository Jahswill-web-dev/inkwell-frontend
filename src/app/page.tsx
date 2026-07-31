import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navigation } from "@/components/landing/navigation";
import { ProductFeatures } from "@/components/landing/product-features";
import { WritingWorkflow } from "@/components/landing/writing-workflow";

export default function HomePage() {
  return (
    <main id="home">
      <Navigation />
      <Hero />
      <WritingWorkflow />
      <ProductFeatures />
      <FinalCta />
      <Footer />
    </main>
  );
}
