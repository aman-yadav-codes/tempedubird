"use client";

import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  IdCard,
  LibraryBig,
  MapPin,
  StickyNote,
  UserCog,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store";
import { toRoleRoutePath } from "@/lib/auth/role-routes";

const MASTER_DATA_MODULES = [
  {
    title: "Skills & Proficiencies",
    url: "/admin/master-data/skills",
    icon: BookOpen,
    description: "Manage global and subject-specific skill tags for staff and curriculum.",
    badge: "Core",
    color: "from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  },
  {
    title: "Designations & Roles",
    url: "/admin/master-data/designations",
    icon: UserCog,
    description: "Define staff job titles, hierarchy levels, and organization designations.",
    badge: "Staff",
    color: "from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  },
  {
    title: "Locations & Cities",
    url: "/admin/master-data/locations",
    icon: MapPin,
    description: "Manage geographical branches, cities, states, and pin coordinates.",
    badge: "Geo",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Card Categories",
    url: "/admin/master-data/card-categories",
    icon: LibraryBig,
    description: "Classify ID cards, certificate badges, and member card types.",
    badge: "Identity",
    color: "from-rose-500/10 to-red-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  },
  {
    title: "Card Templates",
    url: "/admin/master-data/card-templates",
    icon: IdCard,
    description: "Design and manage student & staff identity card print layouts.",
    badge: "Print",
    color: "from-cyan-500/10 to-blue-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400",
  },
  {
    title: "Default Academic Calendar",
    url: "/admin/master-data/default-calendar",
    icon: CalendarDays,
    description: "Set nationwide holidays, standard term dates, and global events.",
    badge: "Schedule",
    color: "from-sky-500/10 to-blue-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400",
  },
  {
    title: "Institute Calendar",
    url: "/admin/master-data/institute-calendar",
    icon: CalendarDays,
    description: "Campus-specific holiday schedules, event days, and working hours.",
    badge: "Campus",
    color: "from-fuchsia-500/10 to-pink-500/10 border-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    title: "Timetable Setup",
    url: "/admin/master-data/timetable-setup",
    icon: CalendarDays,
    description: "Configure periods, bell schedules, lunch breaks, and time slots.",
    badge: "Classroom",
    color: "from-indigo-500/10 to-violet-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
  },
  {
    title: "Attendance Setup",
    url: "/admin/master-data/attendance-setup",
    icon: ClipboardCheck,
    description: "Attendance rules, shift timing thresholds, and leaves policy.",
    badge: "Operations",
    color: "from-rose-500/10 to-orange-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  },
];

export default function MasterDataPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Briefcase className="size-4" />
            System Architecture
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">
            Master Data Hub
          </h1>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
            Configure system-wide parameters, curriculum standards, calendars, identity cards, and operational definitions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-8 gap-1.5 px-3 font-semibold text-xs border-primary/30 bg-primary/5 text-primary">
            <Sparkles className="size-3.5 text-primary" />
            {MASTER_DATA_MODULES.length} Master Modules Active
          </Badge>
        </div>
      </div>

      {/* Grid of Master Modules */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MASTER_DATA_MODULES.map((module) => {
          const Icon = module.icon;
          const href = toRoleRoutePath(module.url, user);

          return (
            <Link key={module.url} href={href} className="group block focus:outline-hidden">
              <Card className="h-full border border-border/80 bg-card hover:bg-muted/30 transition-all duration-200 hover:shadow-md hover:border-primary/40 flex flex-col justify-between overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${module.color}`}>
                      <Icon className="size-5" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {module.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold group-hover:text-primary transition-colors flex items-center justify-between">
                    {module.title}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2 mt-1">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="flex items-center text-xs font-semibold text-primary gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Manage Module</span>
                    <ArrowRight className="size-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
