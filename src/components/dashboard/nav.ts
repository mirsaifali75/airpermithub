import { Bell, BookmarkCheck, Calculator, CalendarClock, FileStack, FolderKanban, LayoutDashboard, Settings, User } from "lucide-react";

export const dashboardNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Projects", href: "/dashboard#projects", icon: FolderKanban },
  { label: "Saved Resources", href: "/resources", icon: BookmarkCheck },
  { label: "Compliance Calendar", href: "/compliance", icon: CalendarClock },
  { label: "Calculations", href: "/dashboard#calculations", icon: Calculator },
  { label: "Permit Applications", href: "/permits?tab=applications", icon: FileStack },
  { label: "Job Alerts", href: "/jobs", icon: Bell },
  { label: "Profile", href: "/sign-in", icon: User },
  { label: "Settings", href: "/sign-in", icon: Settings },
];
