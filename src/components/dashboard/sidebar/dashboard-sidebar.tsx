import {
  Article,
  Gear,
  House,
  Lightbulb,
  SquaresFour,
} from "@phosphor-icons/react";
import { Sidebar } from "./sidebar";
import { DEFAULT_AUTH_IDENTITY, type AuthIdentity } from "@/lib/auth/identity";

const dashboardNavigation = [
  { label: "Workspace", icon: House, href: "/dashboard" },
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
  identity = DEFAULT_AUTH_IDENTITY,
  showSettings = true,
}: {
  activeHref: string;
  identity?: AuthIdentity;
  showSettings?: boolean;
}) {
  return (
    <Sidebar
      items={
        showSettings ? dashboardNavigation : dashboardNavigation.slice(0, 4)
      }
      activeHref={activeHref}
      user={{ name: identity.username, initials: identity.initials }}
    />
  );
}
