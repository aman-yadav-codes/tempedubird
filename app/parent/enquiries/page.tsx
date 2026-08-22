"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  HelpCircle,
  GraduationCap,
  Building2,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

type StudentEnquiry = {
  id: number;
  student_name: string;
  phone: string;
  email: string;
  status: string;
  pipeline_stage: string;
  notes: string;
  preferred_program: string;
  created_at: string;
  institution_id?: number;
  institution_name?: string;
  program_id?: number;
  program_title?: string;
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  "new enquiry": { label: "Enquiry Received", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  contacted: { label: "Counselor Contacted", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  active: { label: "Active Lead", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  enrolled: { label: "Course Enrolled", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
};

export default function ParentEnquiriesPage() {
  const { accessToken } = useAuthStore();
  const searchParams = useSearchParams();
  const [enquiries, setEnquiries] = useState<StudentEnquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const childUserId = searchParams?.get("child_user_id") || null;

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const token =
        accessToken ||
        (typeof window !== "undefined"
          ? window.localStorage.getItem("accessToken") || window.localStorage.getItem("token")
          : null);

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      let url = "/api/student/enquiries";
      if (childUserId) {
        url += `?child_user_id=${childUserId}`;
      }

      const res = await fetch(url, { headers, cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setEnquiries(json.enquiries || []);
      } else {
        toast.error(json.error || "Failed to load enquiries");
      }
    } catch (err) {
      toast.error("Error loading course enquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [accessToken, childUserId]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 mb-2">
            <Users className="h-3.5 w-3.5" />
            <span>Guardian / Parent Account</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            {childUserId ? "Child's Course Enquiries" : "My Course Enquiries"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {childUserId
              ? "View all counseling requests and course inquiries submitted on behalf of your child."
              : "View all counseling requests, course inquiries, and admission questions you have submitted for your children."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={fetchEnquiries} variant="outline" size="sm" className="font-bold gap-2 text-xs h-9">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
          <Link href="/courses">
            <Button size="sm" className="font-bold gap-2 text-xs h-9 bg-primary text-primary-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Explore Courses</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Enquiries List */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading enquiries...</span>
        </div>
      ) : enquiries.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground space-y-4">
          <MessageSquare className="h-12 w-12 mx-auto opacity-30 text-primary" />
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-foreground">No Course Enquiries Found</h3>
            <p className="text-xs max-w-md mx-auto">
              No course counseling inquiries have been submitted yet. Browse our catalog and click "Enquiry" on any course to ask questions!
            </p>
          </div>
          <Link href="/courses">
            <Button className="font-bold text-xs bg-primary text-primary-foreground px-6 mt-2">
              Browse All Courses
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {enquiries.length} {enquiries.length === 1 ? "Enquiry Submitted" : "Enquiries Submitted"}
            </span>
          </div>

          <div className="grid gap-4 grid-cols-1">
            {enquiries.map((item) => {
              const statusCfg = STATUS_BADGE[item.status?.toLowerCase()] ||
                STATUS_BADGE[item.pipeline_stage?.toLowerCase()] || {
                  label: item.status || "Submitted",
                  color: "bg-primary/10 text-primary border-primary/20",
                };

              const programName = item.program_title || item.preferred_program || "Course Inquiry";

              return (
                <Card key={item.id} className="p-5 shadow-xs hover:border-primary/40 transition-all bg-card border-border">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[11px] font-bold ${statusCfg.color}`}>
                          {statusCfg.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <Clock className="h-3 w-3 text-primary shrink-0" />
                          {new Date(item.created_at || Date.now()).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-foreground leading-snug">
                        {programName}
                      </h3>

                      {item.institution_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          {item.institution_name}
                        </p>
                      )}

                      {item.student_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          <Users className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          Student: {item.student_name}
                        </p>
                      )}

                      {item.notes && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs text-foreground/90 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Submitted Question / Notes</span>
                          <p className="leading-relaxed italic">{item.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-start md:items-end justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                      <div className="text-xs text-muted-foreground space-y-1 text-left md:text-right">
                        <span className="text-[10px] uppercase font-bold block text-muted-foreground">Submitted Contact</span>
                        {item.phone && <p className="font-semibold text-foreground">{item.phone}</p>}
                        {item.email && <p className="text-muted-foreground text-[11px]">{item.email}</p>}
                      </div>

                      <Link href="/courses">
                        <Button size="sm" variant="outline" className="text-xs font-bold gap-1.5 h-8 mt-1">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span>Enquire Another Course</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
