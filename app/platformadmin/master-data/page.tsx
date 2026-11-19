"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Car,
  Building2,
  UtensilsCrossed,
  BedDouble,
  GraduationCap,
  HeartPulse,
  CalendarDays,
  Boxes,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FolderTree,
  Activity,
  SlidersHorizontal,
  RefreshCw,
  Search,
  ChevronRight,
  Database,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const VERTICAL_METADATA: Record<string, {
  icon: any;
  gradient: string;
  badgeColor: string;
  path: string;
  highlights: string[];
}> = {
  vehicles: {
    icon: Car,
    gradient: "from-blue-600 via-indigo-600 to-blue-700",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300",
    path: "/platformadmin/master-data/vehicles",
    highlights: ["Types → Categories → Subcategories", "Brand → Model → Variant", "Fuel & Transmission Masters"],
  },
  properties: {
    icon: Building2,
    gradient: "from-emerald-600 via-teal-600 to-emerald-700",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300",
    path: "/platformadmin/master-data/properties",
    highlights: ["Category → Subcategory → Property Type", "Ownership & Furnishing", "Amenities & Land Types"],
  },
  restaurants: {
    icon: UtensilsCrossed,
    gradient: "from-amber-600 via-orange-600 to-amber-700",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300",
    path: "/platformadmin/master-data/restaurants",
    highlights: ["Menu Category → Subcategory → Dishes", "Cuisines & Dietary Classifications", "Ingredients & Allergen Tags"],
  },
  hotels: {
    icon: BedDouble,
    gradient: "from-purple-600 via-violet-600 to-purple-700",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300",
    path: "/platformadmin/master-data/hotels",
    highlights: ["Room Category → Subcategory → Room Types", "Bed Types & In-room Amenities", "View Types & Meal Plans (EP/CP/MAP/AP)"],
  },
  education: {
    icon: GraduationCap,
    gradient: "from-cyan-600 via-blue-600 to-cyan-700",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300",
    path: "/platformadmin/master-data/education",
    highlights: ["Student Category → Subcategories", "Education Levels & Degree Courses", "Departments & Examination Modes"],
  },
  healthcare: {
    icon: HeartPulse,
    gradient: "from-rose-600 via-red-600 to-rose-700",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300",
    path: "/platformadmin/master-data/healthcare",
    highlights: ["Patient Categories (OPD/IPD/Emergency)", "Medical Departments & Specialties", "Consultation, Visit & Care Types"],
  },
  events: {
    icon: CalendarDays,
    gradient: "from-fuchsia-600 via-pink-600 to-fuchsia-700",
    badgeColor: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300",
    path: "/platformadmin/master-data/events",
    highlights: ["Corporate, Entertainment, Social & Sports", "Event Formats (In-Person/Virtual/Hybrid)", "Amenities & Multi-Tier Tickets"],
  },
};

export default function MasterDataHubPage() {
  const [verticals, setVerticals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchVerticals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platformadmin/masters/verticals");
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setVerticals(json.data);
      }
    } catch (err) {
      console.error("Failed to load master verticals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchVerticals();
  }, []);

  const totalRecords = verticals.reduce((acc, v) => acc + (v.total_records || 0), 0);
  const totalActive = verticals.reduce((acc, v) => acc + (v.active_records || 0), 0);
  const totalInactive = totalRecords - totalActive;
  const totalMasterTypes = verticals.reduce((acc, v) => acc + (v.total_master_types || 0), 0);

  const filteredVerticals = verticals.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.name?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q) || v.code?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* 1. Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-10 text-white shadow-2xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 backdrop-blur-md">
              <Database className="w-3.5 h-3.5" />
              <span>Centralized Multi-Vertical Master Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Master Data Management
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Standardize, organize, and control cross-vertical master configurations. When records are updated here, they automatically become accessible in vehicle dealers, properties, restaurants, hotels, clinics, schools, and event modules.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchVerticals}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh Engine
            </Button>
          </div>
        </div>

        {/* Ambient Glows */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Platform KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Business Verticals</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                {verticals.length || 7}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Fully integrated verticals</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Boxes className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Master Types</p>
              <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                {totalMasterTypes || 70}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">10 specialized configs each</p>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <FolderTree className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Master Records</p>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {totalRecords}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                {totalActive} active & available
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom Attributes</p>
              <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                Dynamic
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Schema-less custom fields</p>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Business Verticals</h2>
          <p className="text-xs text-slate-500">
            Select a vertical below to manage its master types, hierarchy, records, and custom attributes.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search vertical masters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>
      </div>

      {/* 4. The 7 Business Vertical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVerticals.map((vert) => {
          const meta = VERTICAL_METADATA[vert.code] || {
            icon: Boxes,
            gradient: "from-slate-700 to-slate-900",
            badgeColor: "bg-slate-100 text-slate-700",
            path: `/platformadmin/master-data/${vert.code}`,
            highlights: ["Hierarchical records", "Dynamic attributes"],
          };
          const CardIcon = meta.icon;

          return (
            <Card
              key={vert.id}
              className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div>
                {/* Header Banner */}
                <div className={`p-5 bg-gradient-to-r ${meta.gradient} text-white flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-md text-white border border-white/20 shadow-inner">
                      <CardIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">{vert.name}</h3>
                      <p className="text-xs text-white/80 font-mono">vertical: {vert.code}</p>
                    </div>
                  </div>
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs font-bold">
                    {vert.total_records || 0} Records
                  </Badge>
                </div>

                {/* Description & Stats */}
                <CardContent className="p-5 space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[36px]">
                    {vert.description}
                  </p>

                  {/* Highlights list */}
                  <div className="space-y-1.5 pt-1">
                    {meta.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-medium">{h}</span>
                      </div>
                    ))}
                  </div>

                  {/* Metric Chips */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Active</p>
                      <p className="text-sm font-bold text-emerald-600">{vert.active_records || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Categories</p>
                      <p className="text-sm font-bold text-indigo-600">{vert.categories_count || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Subcategories</p>
                      <p className="text-sm font-bold text-purple-600">{vert.subcategories_count || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Action Button */}
              <div className="p-5 pt-0">
                <Link href={meta.path}>
                  <Button className="w-full justify-between bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-xs font-semibold group-hover:bg-rose-600 group-hover:text-white transition-colors duration-200">
                    <span>Manage {vert.name.split(" ")[0]} Masters</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
