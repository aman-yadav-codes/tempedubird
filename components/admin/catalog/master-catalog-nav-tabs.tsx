"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  Briefcase,
  FileText,
  BookOpen,
  UserCog,
  MapPin,
  LibraryBig,
  IdCard,
  CalendarDays,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toRoleRoutePath } from "@/lib/auth/role-routes";
import { useAuthStore } from "@/store";

export const MASTER_CATALOG_TABS = [
  {
    title: "Master Products",
    url: "/admin/catalog/products",
    icon: Package,
  },
  {
    title: "Master Services",
    url: "/admin/catalog/services",
    icon: Briefcase,
  },
  {
    title: "Blog",
    url: "/admin/content/blog",
    icon: FileText,
  },
  {
    title: "Skills",
    url: "/admin/master-data/skills",
    icon: BookOpen,
  },
  {
    title: "Designations",
    url: "/admin/master-data/designations",
    icon: UserCog,
  },
  {
    title: "Locations",
    url: "/admin/master-data/locations",
    icon: MapPin,
  },
  {
    title: "Card Categories",
    url: "/admin/master-data/card-categories",
    icon: LibraryBig,
  },
  {
    title: "Card Templates",
    url: "/admin/master-data/card-templates",
    icon: IdCard,
  },
  {
    title: "Default Calendar",
    url: "/admin/master-data/default-calendar",
    icon: CalendarDays,
  },
  {
    title: "Languages",
    url: "/admin/institutions/languages",
    icon: Languages,
  },
  {
    title: "Academic & Business Sessions",
    url: "/admin/institutions/academic-years",
    icon: CalendarDays,
  },
];

export function MasterCatalogNavTabs() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <div className="w-full border-b border-border/80 bg-background/95 backdrop-blur-xs pb-px">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {MASTER_CATALOG_TABS.map((tab) => {
          const roleUrl = toRoleRoutePath(tab.url, user);
          const isActive = pathname === tab.url || pathname === roleUrl || pathname?.startsWith(tab.url + "/");
          const Icon = tab.icon;

          return (
            <Link
              key={tab.url}
              href={roleUrl}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{tab.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

