import type { Metadata } from "next";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { requireUser } from "@/lib/auth/session";
import { toAuthIdentity } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Continue writing and start your next Inkwell article.",
};

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  return <DashboardHome user={toAuthIdentity(user)} />;
}
