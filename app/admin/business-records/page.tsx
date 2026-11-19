"use client";

import Link from "next/link";
import {
  Car,
  Building2,
  UtensilsCrossed,
  BedDouble,
  GraduationCap,
  HeartPulse,
  CalendarDays,
  ArrowRight,
  Sparkles,
  Layers,
  Database,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const VERTICALS = [
  {
    code: "vehicles",
    title: "Vehicle Management",
    description: "Manage car & bike inventory, brands, models, variants, transmission, and pricing.",
    icon: Car,
    href: "/admin/business-records/vehicles",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    stats: "Inventory & Listings",
  },
  {
    code: "properties",
    title: "Property Management",
    description: "Manage residential, commercial, and land listings with amenities, areas, and floor plans.",
    icon: Building2,
    href: "/admin/business-records/properties",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    stats: "Units & Commercial",
  },
  {
    code: "restaurants",
    title: "Restaurant & Food Management",
    description: "Manage menu categories, dishes, custom variations (Half/Full), dietary types, and allergens.",
    icon: UtensilsCrossed,
    href: "/admin/business-records/restaurants",
    color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    stats: "Menu & Portions",
  },
  {
    code: "hotels",
    title: "Hotel Management",
    description: "Manage room categories, room types, bed arrangements, amenities, and nightly tariffs.",
    icon: BedDouble,
    href: "/admin/business-records/hotels",
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    stats: "Rooms & Stays",
  },
  {
    code: "events",
    title: "Event Management",
    description: "Publish conferences, workshops, venues, schedules, speakers, and ticket tiers.",
    icon: CalendarDays,
    href: "/admin/business-records/events",
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    stats: "Events & Tickets",
  },
  {
    code: "education",
    title: "Student & Education Management",
    description: "Register and track students, grades, sections, academic courses, and guardian records.",
    icon: GraduationCap,
    href: "/admin/business-records/education",
    color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    stats: "Student Profiles",
  },
  {
    code: "healthcare",
    title: "Patient & Healthcare Management",
    description: "Confidential patient directory, medical departments, doctor assignments, and visit logs.",
    icon: HeartPulse,
    href: "/admin/business-records/healthcare",
    color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    stats: "Confidential EHR",
  },
];

export default function BusinessRecordsHubPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      {/* Hero Card */}
      <div className="bg-gradient-to-r from-card to-muted/40 p-6 md:p-8 rounded-3xl border shadow-sm relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <Badge variant="outline" className="gap-1.5 px-3 py-1 bg-background">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Dynamic Business Records Engine
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Business Records & Operations Hub
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Create and manage your business listings, inventory, and records powered by centralized
            global master data. All forms, dependent cascading dropdowns, and dynamic attributes are
            governed by verified platform master catalogs.
          </p>
        </div>

        <div className="absolute -right-8 -bottom-8 opacity-5 hidden lg:block pointer-events-none">
          <Database className="w-80 h-80" />
        </div>
      </div>

      {/* Grid of 7 Business Verticals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {VERTICALS.map((v) => {
          const Icon = v.icon;
          return (
            <Card
              key={v.code}
              className="group border hover:border-primary/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl border ${v.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {v.stats}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold mt-4 group-hover:text-primary transition-colors">
                  {v.title}
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed line-clamp-2 mt-1">
                  {v.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0">
                <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Master Data Active
                  </span>
                  <Link href={v.href}>
                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-primary hover:text-primary font-semibold">
                      Manage <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
