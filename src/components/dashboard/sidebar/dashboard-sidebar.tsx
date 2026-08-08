import {
  Article,
  Gear,
  House,
  Lightbulb,
  SquaresFour,
} from "@phosphor-icons/react";
import { Sidebar } from "./sidebar";

const dashboardNavigation = [
  { label: "Home", icon: House, href: "/dashboard" },
  { label: "Articles", icon: Article, href: "/dashboard?section=articles" },
  { label: "Ideas", icon: Lightbulb, href: "/dashboard?section=ideas" },
  {
    label: "Templates",
    icon: SquaresFour,
    href: "/dashboard?section=templates",
  },
  { label: "Settings", icon: Gear, href: "/dashboard?section=settings" },
] as const;

export function DashboardSidebar({ activeHref }: { activeHref: string }) {
  return (
    <Sidebar
      items={dashboardNavigation}
      activeHref={activeHref}
      user={{ name: "Nina Koskinen", initials: "NK" }}
    />
  );
}
