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

export function DashboardSidebar({
  activeHref,
  showSettings = true,
}: {
  activeHref: string;
  showSettings?: boolean;
}) {
  return (
    <Sidebar
      items={
        showSettings ? dashboardNavigation : dashboardNavigation.slice(0, 4)
      }
      activeHref={activeHref}
      user={{ name: "Nina Koskinen", initials: "NK" }}
    />
  );
}
