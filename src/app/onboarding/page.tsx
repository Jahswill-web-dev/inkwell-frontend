import type { Metadata } from "next";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen/onboarding-screen";

export const metadata: Metadata = {
  title: "Choose your writing goals",
  description: "Tell Inkwell what you want to write.",
};

export default function OnboardingPage() {
  return <OnboardingScreen />;
}
