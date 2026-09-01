"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Search,
  Mail,
  Phone,
  Building2,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  Crown,
  Sparkles,
  Loader2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { useActiveInstitution } from "@/hooks/use-active-institution";

export type PublicTeamMember = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role_title: string;
  department: string;
  access_level: "super_admin" | "admin" | "manager" | "coordinator" | "staff";
  status: string;
  joined_date: string | null;
  profile_image: string | null;
  notes: string | null;
  institution_id: number | null;
};

const ACCESS_BADGES: Record<string, { label: string; color: string; icon: any }> = {
  super_admin: { label: "Executive Leadership", color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/40", icon: Crown },
  admin: { label: "Administration Head", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300/40", icon: ShieldCheck },
  manager: { label: "Department Manager", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40", icon: Briefcase },
  coordinator: { label: "Coordinator", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/40", icon: Sparkles },
  staff: { label: "Faculty & Staff", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/40", icon: GraduationCap },
};

export function TeamPageView() {
  const { activeInstitution, activeInstitutionId } = useActiveInstitution();
  const [members, setMembers] = useState<PublicTeamMember[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  const fetchTeamMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeInstitutionId) {
        params.set("institution_id", String(activeInstitutionId));
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (selectedDept !== "all") {
        params.set("department", selectedDept);
      }

      const res = await fetch(`/api/public/team?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setMembers(data.members || []);
        if (Array.isArray(data.departments)) {
          setDepartments(data.departments);
        }
      }
    } catch (err) {
      console.error("Failed to load team members:", err);
    } finally {
      setLoading(false);
    }
  }, [activeInstitutionId, search, selectedDept]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const distinctDepartmentList = useMemo(() => {
    const set = new Set<string>(departments);
    members.forEach((m) => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set);
  }, [departments, members]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (selectedDept !== "all" && m.department?.toLowerCase() !== selectedDept.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      return (
        m.name?.toLowerCase().includes(q) ||
        m.role_title?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q) ||
        (m.notes && m.notes.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q))
      );
    });
  }, [members, search, selectedDept]);

  const institutionTitle = activeInstitution?.name || "Our Institution";

  return (
    <div className="min-h-screen bg-background pb-16 pt-6">
      <div className="container mx-auto px-4 space-y-8 max-w-7xl">
        {/* Breadcrumbs */}
        <SeoBreadcrumbs items={[{ label: "Our Team & Leadership" }]} />

        {/* Hero Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-primary/10 via-primary/5 to-muted/20 border border-primary/20 p-6 sm:p-10">
          <div className="max-w-3xl space-y-3">
            <Badge className="bg-primary text-primary-foreground font-bold px-3 py-1 text-xs gap-1.5 shadow-xs">
              <Users className="w-3.5 h-3.5" />
              <span>Leadership &amp; Faculty Team</span>
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight">
              Meet Our Dedicated Team
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Discover the experienced administrators, visionary department heads, and esteemed educators steering{" "}
              <strong className="text-foreground font-semibold">{institutionTitle}</strong> toward academic excellence and student success.
            </p>
          </div>

          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Search & Department Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search team member by name, designation, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 text-xs sm:text-sm rounded-2xl bg-card border-border/80 shadow-2xs"
              />
            </div>
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch("")}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                Clear Search
              </Button>
            )}
          </div>

          {/* Department Quick Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedDept("all")}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                selectedDept === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                  : "bg-card text-muted-foreground hover:text-foreground border-border hover:bg-muted/40"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Departments</span>
              <span className="ml-1 text-[10px] opacity-80 font-mono">({members.length})</span>
            </button>

            {distinctDepartmentList.map((dept) => {
              const isSelected = selectedDept === dept;
              const count = members.filter((m) => m.department?.toLowerCase() === dept.toLowerCase()).length;
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-card text-muted-foreground hover:text-foreground border-border hover:bg-muted/40"
                  }`}
                >
                  <span>{dept}</span>
                  {count > 0 && <span className="text-[10px] opacity-80 font-mono">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Team Members Grid */}
        {loading ? (
          <div className="py-24 text-center rounded-3xl border bg-card/60">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Loading team directory...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card className="p-12 text-center rounded-3xl border bg-muted/10 space-y-3">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h3 className="text-lg font-bold text-foreground">No Team Members Found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {search || selectedDept !== "all"
                ? "No team members matched your active search and department filters."
                : "Our team directory is currently being updated. Please check back soon or explore our faculty teachers directory."}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button asChild variant="outline" size="sm" className="rounded-xl font-semibold">
                <Link href="/teachers">View Faculty &amp; Teachers →</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredMembers.map((member) => {
              const accessInfo = ACCESS_BADGES[member.access_level] || ACCESS_BADGES.staff;
              const AccessIcon = accessInfo.icon;

              return (
                <Card
                  key={member.id}
                  className="rounded-3xl border border-border/80 hover:border-primary/50 transition-all duration-200 shadow-2xs hover:shadow-lg flex flex-col justify-between overflow-hidden group bg-card"
                >
                  <CardHeader className="p-5 pb-3 text-center flex flex-col items-center space-y-3">
                    {/* Avatar */}
                    <div className="relative w-20 h-20 rounded-2xl bg-linear-to-tr from-primary/20 via-primary/10 to-muted flex items-center justify-center font-bold text-2xl text-primary overflow-hidden border-2 border-primary/20 shadow-xs group-hover:scale-105 transition-transform duration-200">
                      {member.profile_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.profile_image}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        member.name?.charAt(0).toUpperCase() || "U"
                      )}
                    </div>

                    {/* Name & Role */}
                    <div className="space-y-1 w-full">
                      <div className="flex items-center justify-center gap-1.5">
                        <CardTitle className="text-base font-bold text-foreground truncate max-w-[200px]">
                          {member.name}
                        </CardTitle>
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 fill-primary/10" />
                      </div>
                      <p className="text-xs font-semibold text-primary/90 line-clamp-1">
                        {member.role_title}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
                      <Badge variant="outline" className={`text-[10px] font-semibold gap-1 ${accessInfo.color}`}>
                        <AccessIcon className="w-3 h-3" />
                        <span>{accessInfo.label}</span>
                      </Badge>
                      {member.department && (
                        <Badge variant="secondary" className="text-[10px] font-medium bg-muted text-muted-foreground">
                          {member.department}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 text-center space-y-3">
                    {member.notes ? (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {member.notes}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        Dedicated team member at {institutionTitle}.
                      </p>
                    )}

                    {member.joined_date && (
                      <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground/80 pt-1">
                        <Calendar className="w-3 h-3" />
                        <span>Joined: {new Date(member.joined_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-4 bg-muted/20 border-t border-border/50 flex items-center justify-center gap-2">
                    {member.email && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1 text-xs font-semibold rounded-xl gap-1.5 hover:text-primary hover:border-primary/40 shadow-2xs"
                      >
                        <a href={`mailto:${member.email}`}>
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email</span>
                        </a>
                      </Button>
                    )}

                    {member.phone && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1 text-xs font-semibold rounded-xl gap-1.5 hover:text-primary hover:border-primary/40 shadow-2xs"
                      >
                        <a href={`tel:${member.phone}`}>
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      </Button>
                    )}

                    {!member.email && !member.phone && (
                      <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Verified Team Profile
                      </span>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
