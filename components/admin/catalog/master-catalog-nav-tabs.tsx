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
  return null;
}

