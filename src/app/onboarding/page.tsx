import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen/onboarding-screen";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Choose your writing goals",
  description: "Tell Inkwell what you want to write.",
};

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  if (user.preferred_experience === "consultant")
    redirect("/consultant/onboarding");
  return <OnboardingScreen />;
}
