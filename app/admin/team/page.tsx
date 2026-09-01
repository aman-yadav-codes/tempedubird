"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/navigation";
import {
  Users,
  Search,
  Building2,
  Trash2,
  RefreshCw,
  Loader2,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  UserCheck,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  Table as TableIcon,
  Crown,
  UserMinus,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";

export type TeamMember = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role_title: string;
  department: string;
  access_level: "super_admin" | "admin" | "manager" | "coordinator" | "staff";
  status: "active" | "on_leave" | "inactive";
  joined_date: string | null;
  profile_image: string | null;
  notes: string | null;
  institution_id: number | null;
  created_at: string;
  updated_at?: string;
  is_user_linked?: boolean;
};

const DEPARTMENTS = [
  "Administration",
  "Operations & Logistics",
  "Finance & Accounts",
  "IT & Systems Support",
  "Academics & Curriculum",
  "Student Affairs & Admissions",
  "Facilities & Maintenance",
  "Human Resources",
];

const ACCESS_LEVELS = [
  { id: "super_admin", label: "Super Admin", badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300" },
  { id: "admin", label: "Administrator", badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300" },
  { id: "manager", label: "Operations Manager", badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300" },
  { id: "coordinator", label: "Branch Coordinator", badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300" },
  { id: "staff", label: "Staff Member", badgeColor: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-300" },
];

export default function TeamManagementPage() {
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || user?.is_super_admin);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Summary Stats
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    departmentsCount: 0,
    leadershipCount: 0,
  });

  const [removingId, setRemovingId] = useState<number | null>(null);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeInstitution?.id) params.set("institution_id", String(activeInstitution.id));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (deptFilter && deptFilter !== "all") params.set("department", deptFilter);
      if (accessFilter && accessFilter !== "all") params.set("access_level", accessFilter);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/team?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load team members");

      setMembers(data.members || []);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch team members");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, deptFilter, accessFilter, statusFilter, accessToken, activeInstitution]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleRemoveFromTeam = async (id: number, memberName: string) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/users/team-status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ userId: id, showInTeam: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove from team");

      toast.success(`${memberName} removed from Team`);
      setRemovingId(null);
      fetchTeam();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  const distinctDepartments = useMemo(() => {
    const set = new Set<string>(DEPARTMENTS);
    members.forEach((m) => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set);
  }, [members]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <Users className="w-7 h-7 text-primary" />
              Internal Admin Team
            </h1>
            {activeInstitution ? (
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 font-medium">
                {activeInstitution.name}
              </Badge>
            ) : isPlatformAdmin ? (
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30 font-medium">
                Platform Internal Team
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Featured internal administrative leaders and department heads selected from the All Staff section.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTeam}
            disabled={loading}
            className="rounded-xl h-10 px-3.5"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            asChild
            className="rounded-xl h-10 px-4 font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <a href="/admin/staff">
              <Users className="w-4 h-4" />
              Manage in All Staff
            </a>
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border bg-card shadow-sm p-4 hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Team</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{stats.totalMembers}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Featured personnel</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm p-4 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Members</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.activeMembers}</h3>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Currently on duty</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm p-4 hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Departments</p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.departmentsCount}</h3>
              <p className="text-[11px] text-blue-600/80 mt-0.5">Operational divisions</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm p-4 hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leadership &amp; Admins</p>
              <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{stats.leadershipCount}</h3>
              <p className="text-[11px] text-purple-600/80 mt-0.5">Admin access level</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Crown className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Bar & Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by name, role, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl text-xs bg-background"
            />
          </div>

          {/* Department Filter */}
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              <SelectItem value="all" className="text-xs">All Departments</SelectItem>
              {distinctDepartments.map((dept) => (
                <SelectItem key={dept} value={dept} className="text-xs">
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Access Level Filter */}
          <Select value={accessFilter} onValueChange={setAccessFilter}>
            <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
              <SelectValue placeholder="All Access Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Access Levels</SelectItem>
              {ACCESS_LEVELS.map((acc) => (
                <SelectItem key={acc.id} value={acc.id} className="text-xs">
                  {acc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="active" className="text-xs">Active / On Duty</SelectItem>
              <SelectItem value="on_leave" className="text-xs">On Leave</SelectItem>
              <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 border rounded-xl p-1 bg-muted/40 shrink-0 self-end md:self-auto">
          <Button
            type="button"
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="h-8 px-2.5 rounded-lg text-xs"
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-1" />
            Cards
          </Button>
          <Button
            type="button"
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-8 px-2.5 rounded-lg text-xs"
          >
            <TableIcon className="w-3.5 h-3.5 mr-1" />
            Table
          </Button>
        </div>
      </div>

      {/* Main Members Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-semibold">Loading team member records...</p>
        </div>
      ) : members.length === 0 ? (
        <Card className="rounded-2xl border border-dashed p-12 text-center flex flex-col items-center justify-center space-y-3 text-muted-foreground">
          <Users className="w-12 h-12 text-muted-foreground/30" />
          <h3 className="font-bold text-base text-foreground">No Team Members Found</h3>
          <p className="text-xs max-w-md">
            {searchQuery || deptFilter !== "all" || statusFilter !== "all" || accessFilter !== "all"
              ? "No team members match your selected filters. Try clearing search criteria."
              : "No employees are currently marked to show in the Internal Team. Go to the All Staff section and select 'Show in Team' in any staff member's action menu to feature them here."}
          </p>
          <Button asChild className="mt-2 text-xs font-semibold gap-1.5 rounded-xl">
            <a href="/admin/staff">
              <Users className="w-4 h-4" /> Go to All Staff Section
            </a>
          </Button>
        </Card>
      ) : viewMode === "cards" ? (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => {
            const accessObj = ACCESS_LEVELS.find((a) => a.id === m.access_level) || ACCESS_LEVELS[4];

            return (
              <Card
                key={m.id}
                className="rounded-2xl border bg-card hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-4 space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-base uppercase shrink-0">
                      {m.profile_image ? (
                        <img
                          src={m.profile_image}
                          alt={m.name}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        m.name?.charAt(0) || "U"
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <Badge variant="secondary" className="text-[10px] font-medium bg-muted text-muted-foreground truncate">
                          {m.department}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold shrink-0 ${accessObj.badgeColor}`}
                        >
                          {accessObj.label}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {m.name}
                      </h4>
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-primary/70 shrink-0" />
                        <span className="truncate">{m.role_title}</span>
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/40">
                    {m.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">{m.email}</span>
                      </div>
                    )}
                    {m.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                        <span>{m.phone}</span>
                      </div>
                    )}
                    {m.joined_date && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                        <span>Joined: {new Date(m.joined_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    )}
                  </div>

                  {m.notes && (
                    <p className="text-[11px] text-muted-foreground/80 line-clamp-2 italic">
                      &ldquo;{m.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="p-3 bg-muted/20 border-t flex items-center justify-between gap-2">
                  <div>
                    {m.status === "active" ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </Badge>
                    ) : m.status === "on_leave" ? (
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold">
                        On Leave
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/20 font-semibold flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Inactive
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {removingId === m.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveFromTeam(m.id, m.name)}
                          className="h-8 px-2 rounded-lg text-xs"
                        >
                          Confirm
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRemovingId(null)}
                          className="h-8 px-2 rounded-lg text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemovingId(m.id)}
                        className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 text-rose-600 hover:bg-rose-500/10"
                      >
                        <UserMinus className="w-3.5 h-3.5" /> Remove from Team
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="border rounded-2xl bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Member Name / Role</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Access Level</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {members.map((m) => {
                  const accessObj = ACCESS_LEVELS.find((a) => a.id === m.access_level) || ACCESS_LEVELS[4];

                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs uppercase shrink-0">
                            {m.name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{m.name}</div>
                            <div className="text-[10px] text-muted-foreground font-medium">{m.role_title}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <Badge variant="secondary" className="text-[10px]">
                          {m.department}
                        </Badge>
                      </td>

                      <td className="py-3 px-3">
                        <Badge variant="outline" className={`text-[10px] ${accessObj.badgeColor}`}>
                          {accessObj.label}
                        </Badge>
                      </td>

                      <td className="py-3 px-3 text-muted-foreground">
                        <div>{m.email || "--"}</div>
                        <div className="text-[10px]">{m.phone || ""}</div>
                      </td>

                      <td className="py-3 px-3">
                        {m.status === "active" ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
                            Active
                          </Badge>
                        ) : m.status === "on_leave" ? (
                          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold">
                            On Leave
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/20 font-semibold">
                            Inactive
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-3 text-muted-foreground">
                        {m.joined_date ? new Date(m.joined_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "--"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFromTeam(m.id, m.name)}
                          className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-500/10 font-medium"
                        >
                          <UserMinus className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
