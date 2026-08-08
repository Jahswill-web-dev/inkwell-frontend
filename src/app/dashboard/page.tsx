import type { Metadata } from "next";
import { DashboardHome } from "@/components/dashboard/dashboard-home";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Continue writing and start your next Inkwell article.",
};

export default function DashboardPage() {
  return <DashboardHome />;
}
