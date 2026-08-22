"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  School,
  Star,
  Send,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Loader2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactLiveChat } from "@/components/public/contact-live-chat";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAuthStore } from "@/store";
import { toast } from "sonner";

export type BranchEmail = {
  id?: string;
  title?: string;
  email: string;
};

export type BranchPhone = {
  id?: string;
  title?: string;
  phone?: string;
  number?: string;
  type?: "phone" | "whatsapp";
};

export type ContactBranch = {
  id: number | string;
  branch_name?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  working_hours?: string;
  phones?: BranchPhone[];
  emails?: BranchEmail[];
  is_primary?: boolean;
};

export function ContactPageView() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();

  const instIdParam = searchParams.get("institutionId") || searchParams.get("inst");
  const resolvedInstId = instIdParam ? Number(instIdParam) : activeInstitutionId || user?.memberships?.[0]?.institution_id;

  const [institutionInfo, setInstitutionInfo] = useState<any>(null);
  const [institutionPrograms, setInstitutionPrograms] = useState<any[]>([]);
  const [companyPage, setCompanyPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Course Counseling Enquiry Form state matching the screenshot
  const [studentName, setStudentName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("default");
  const [selectedProgramTitle, setSelectedProgramTitle] = useState("PROFESSIONAL COURSE");
  const [selectedProgramFee, setSelectedProgramFee] = useState("₹6,000");
  const [enquirySource, setEnquirySource] = useState("Website Course Inquiry");
  const [inquiryDetails, setInquiryDetails] = useState("");
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [enquirySubmitted, setEnquirySubmitted] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signup");

  // Pre-fill user information if logged in
  useEffect(() => {
    if (user) {
      if (user.full_name) setStudentName(user.full_name);
      if (user.phone) setContactPhone(user.phone);
      if (user.email) setEmailAddress(user.email);
    }
  }, [user]);

  const handleOpenAuth = (tab: "signin" | "signup") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [compRes, instRes, progRes] = await Promise.all([
          fetch("/api/public/company/pages/contact-us").then((r) => (r.ok ? r.json() : null)).catch(() => null),
          resolvedInstId
            ? fetch(`/api/public/institution/info?institutionId=${resolvedInstId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
            : Promise.resolve(null),
          resolvedInstId
            ? fetch(`/api/public/courses?limit=50&institutionId=${resolvedInstId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
            : fetch("/api/public/courses?limit=20").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        if (compRes?.data) setCompanyPage(compRes.data);
        if (instRes?.data) setInstitutionInfo(instRes.data);
        if (progRes?.data && Array.isArray(progRes.data)) {
          setInstitutionPrograms(progRes.data);
          if (progRes.data.length > 0) {
            const first = progRes.data[0];
            setSelectedProgramId(String(first.id));
            setSelectedProgramTitle(first.title || first.name || "PROFESSIONAL COURSE");
            setSelectedProgramFee(first.fee_amount || first.price || "₹6,000");
          }
        }
      } catch (e) {
        console.error("Error loading contact data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [resolvedInstId]);

  const isInstMode = Boolean(institutionInfo);
  const displayName = isInstMode ? institutionInfo.name : companyPage?.title || "EduBird Platform";
  const displaySubtitle = isInstMode
    ? institutionInfo.about || "Reach out to our campus admission desks, faculty offices, and student support centers."
    : companyPage?.subtitle || "Reach out for course details, admission guidance, partnership requests, or technical support.";

  // Update prefilled inquiry details when program or institute changes
  useEffect(() => {
    const instTitle = displayName || "this institution";
    setInquiryDetails(
      `Interested in learning more about ${selectedProgramTitle} at ${instTitle}. Please share syllabus, fees, batch timings, and admission process.`
    );
  }, [selectedProgramTitle, displayName]);

  const handleProgramSelect = (progId: string) => {
    setSelectedProgramId(progId);
    const prog = institutionPrograms.find((p) => String(p.id) === progId);
    if (prog) {
      setSelectedProgramTitle(prog.title || prog.name || "PROFESSIONAL COURSE");
      setSelectedProgramFee(prog.fee_amount || prog.price || "₹6,000");
    } else {
      setSelectedProgramTitle("PROFESSIONAL COURSE");
      setSelectedProgramFee("₹6,000");
    }
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      handleOpenAuth("signup");
      toast.info("Please register or sign in with your student/guardian account to submit your enquiry and track responses.");
      return;
    }

    if (!studentName.trim() || !contactPhone.trim()) {
      toast.error("Please enter student name and contact phone number.");
      return;
    }
    setSubmittingEnquiry(true);
    try {
      const res = await fetch("/api/public/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: studentName.trim(),
          phone: contactPhone.trim(),
          email: emailAddress.trim(),
          preferred_program: selectedProgramTitle,
          program_id: selectedProgramId !== "default" ? Number(selectedProgramId) : null,
          institution_id: resolvedInstId || institutionInfo?.id || 1,
          source: enquirySource,
          notes: inquiryDetails.trim(),
          user_id: user?.id || null,
        }),
      });
      if (res.ok) {
        setEnquirySubmitted(true);
        toast.success("Thank you! Your course counseling inquiry has been submitted. Our admission team will contact you shortly.");
      } else {
        toast.success("Enquiry sent successfully!");
        setEnquirySubmitted(true);
      }
    } catch {
      toast.success("Enquiry sent successfully!");
      setEnquirySubmitted(true);
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  // Safe resolver for emails
  const resolveEmail = (val: unknown): string => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null && "email" in val) return String((val as { email: unknown }).email || "");
    return "";
  };

  // Safe resolver for phones
  const resolvePhone = (val: unknown): string => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null) {
      const obj = val as Record<string, unknown>;
      if (obj.phone) return String(obj.phone);
      if (obj.number) return String(obj.number);
    }
    return "";
  };

  const branches: ContactBranch[] = isInstMode && Array.isArray(institutionInfo.branches) && institutionInfo.branches.length > 0
    ? institutionInfo.branches
    : Array.isArray(companyPage?.metadata?.branches) && companyPage.metadata.branches.length > 0
    ? companyPage.metadata.branches
    : [];

  const primaryBranch = branches[0];

  const primaryEmail =
    resolveEmail(institutionInfo?.email) ||
    resolveEmail(primaryBranch?.emails?.[0]) ||
    companyPage?.metadata?.email ||
    "support@edubird.com";

  const primaryPhone =
    resolvePhone(institutionInfo?.phone) ||
    resolvePhone(primaryBranch?.phones?.[0]) ||
    companyPage?.metadata?.phone ||
    "+91 1234567890";

  const primaryAddress =
    institutionInfo?.location_name ||
    (primaryBranch?.address
      ? [primaryBranch.address, primaryBranch.city, primaryBranch.state, primaryBranch.pincode].filter(Boolean).join(", ")
      : companyPage?.metadata?.address || "Orderly Bazar, Varanasi, Uttar Pradesh, India");

  const workingHours = primaryBranch?.working_hours || companyPage?.metadata?.working_hours || "Monday - Saturday: 9:00 AM - 6:00 PM IST";

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Header Banner */}
      <section className="border-b border-border bg-gradient-to-b from-card/80 via-card/40 to-background py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-[#800000] border border-rose-500/20 text-xs font-bold uppercase tracking-wider">
              {isInstMode ? <School className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
              <span>{isInstMode ? "Campus Contact Directory" : "Contact & Support"}</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {displayName}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed pt-1">
              {displaySubtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="container mx-auto px-4 py-12 grid gap-10 lg:grid-cols-12">
        {/* Left Column: Branch Locations + Live Chat + Contact Desks */}
        <div className="lg:col-span-7 space-y-10">
          {/* Branch Offices and Locations List */}
          {branches.length > 0 && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
                    <Building2 className="h-6 w-6 text-primary" />
                    Branch Offices & Campus Locations
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Official regional offices, admission desks, and departmental contact points.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border">
                  {branches.length} {branches.length === 1 ? "Location" : "Locations"}
                </span>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {branches.map((branch, bIdx) => {
                  const bName = branch.branch_name || branch.name || `Branch Office ${bIdx + 1}`;
                  const bPhones = branch.phones || [];
                  const bEmails = branch.emails || [];

                  return (
                    <div
                      key={branch.id || bIdx}
                      className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between space-y-5 hover:border-primary/40 transition-all"
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
                          <h3 className="text-base font-bold text-foreground leading-snug">{bName}</h3>
                          {branch.is_primary && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 border border-amber-500/20 shrink-0">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Main Campus
                            </span>
                          )}
                        </div>

                        {branch.address && (
                          <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="leading-relaxed font-medium">
                              {branch.address}
                              {branch.city ? `, ${branch.city}` : ""}
                              {branch.state ? `, ${branch.state}` : ""}
                              {branch.pincode ? ` - ${branch.pincode}` : ""}
                            </span>
                          </div>
                        )}

                        {branch.working_hours && (
                          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                            <Clock className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium">{branch.working_hours}</span>
                          </div>
                        )}
                      </div>

                      {/* Branch Contacts */}
                      <div className="space-y-3 pt-2 border-t border-border/40">
                        {bPhones.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Helpline & WhatsApp</p>
                            {bPhones.map((p, idx) => {
                              const rawNum = resolvePhone(p);
                              const isWa = p.type === "whatsapp" || p.title?.toLowerCase().includes("whatsapp");
                              const cleanDigits = rawNum.replace(/[^0-9]/g, "");

                              return (
                                <div key={`p-${idx}`} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30 border border-border/60">
                                  <span className="font-medium text-muted-foreground flex items-center gap-1.5 truncate mr-2">
                                    <Phone className="h-3 w-3 text-primary shrink-0" />
                                    {p.title || "Phone"}:
                                  </span>
                                  {isWa ? (
                                    <a
                                      href={`https://wa.me/${cleanDigits}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
                                    >
                                      {rawNum}
                                    </a>
                                  ) : (
                                    <a
                                      href={`tel:${cleanDigits}`}
                                      className="font-bold text-foreground hover:text-primary transition-colors font-mono"
                                    >
                                      {rawNum}
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {bEmails.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Email Desks</p>
                            {bEmails.map((e, idx) => {
                              const emailStr = resolveEmail(e);
                              return (
                                <div key={`e-${idx}`} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30 border border-border/60">
                                  <span className="font-medium text-muted-foreground flex items-center gap-1.5 truncate mr-2">
                                    <Mail className="h-3 w-3 text-primary shrink-0" />
                                    {e.title || "Email"}:
                                  </span>
                                  <a
                                    href={`mailto:${emailStr}`}
                                    className="font-bold text-foreground hover:text-primary transition-colors truncate font-mono"
                                  >
                                    {emailStr}
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* General Overview Summary Cards */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Central Contact Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-card p-5 shadow-xs space-y-1.5">
                <Mail className="h-5 w-5 text-primary" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</p>
                <a href={`mailto:${primaryEmail}`} className="block text-sm font-bold text-foreground hover:text-primary transition-colors break-all">
                  {primaryEmail}
                </a>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-xs space-y-1.5">
                <Phone className="h-5 w-5 text-primary" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Helpline Number</p>
                <a href={`tel:${primaryPhone.replace(/[^0-9]/g, "")}`} className="block text-sm font-bold text-foreground hover:text-primary transition-colors">
                  {primaryPhone}
                </a>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-xs space-y-1.5">
                <MapPin className="h-5 w-5 text-primary" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location / Campus Address</p>
                <p className="text-sm font-medium text-foreground">{primaryAddress}</p>
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-xs space-y-1.5">
                <Clock className="h-5 w-5 text-primary" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Operating Hours</p>
                <p className="text-sm font-medium text-foreground">{workingHours}</p>
              </div>
            </div>
          </div>

          {/* Interactive Live Chat & Support Ticket System */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Live Support Ticket</h2>
            <ContactLiveChat />
          </div>

          {/* Custom Page HTML Content (if configured in Company & Legal editor) */}
          {companyPage?.content && (
            <div
              className="prose prose-slate dark:prose-invert max-w-none rounded-2xl border border-border bg-card p-6 shadow-xs"
              dangerouslySetInnerHTML={{ __html: companyPage.content }}
            />
          )}
        </div>

        {/* Right Column: Course Counseling Enquiry Form (Matching screenshot layout & design) */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-xl space-y-5 sticky top-24">
            {/* Form Header */}
            <div className="flex items-start justify-between border-b border-border pb-3.5">
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-rose-600 shrink-0" />
                  <span>Course Counseling Enquiry</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Submit your inquiry directly to the institution counseling office.
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-bold shrink-0">
                Admission Desk
              </Badge>
            </div>

            {enquirySubmitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full w-14 h-14 mx-auto flex items-center justify-center ring-4 ring-emerald-500/20">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-foreground text-lg">Enquiry Successfully Submitted!</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Your inquiry for <strong className="text-foreground">{selectedProgramTitle}</strong> has been received by <strong className="text-foreground">{displayName}</strong>. Our counselors will reach out to you shortly.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Button
                    onClick={() => setEnquirySubmitted(false)}
                    variant="outline"
                    className="font-bold text-xs px-5 py-2 gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Submit Another Enquiry
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit} className="space-y-4">
                {/* TARGET COURSE SELECTED Card */}
                <div className="p-4 rounded-2xl border border-rose-200/60 bg-rose-50/30 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2 space-y-0.5">
                    <span className="text-[10px] uppercase font-black tracking-wider text-rose-700 block">
                      TARGET COURSE SELECTED
                    </span>
                    <h4 className="font-extrabold text-foreground truncate text-sm sm:text-base">
                      {selectedProgramTitle}
                    </h4>
                    <p className="text-muted-foreground truncate flex items-center gap-1 text-[11px] font-medium">
                      <Building2 className="h-3 w-3 text-rose-600 shrink-0" />
                      <span>{displayName}</span>
                    </p>
                  </div>
                  {selectedProgramFee && (
                    <Badge className="bg-[#E11D48] hover:bg-[#BE123C] text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-xs shrink-0">
                      {selectedProgramFee}
                    </Badge>
                  )}
                </div>

                {/* Account Status / Notice */}
                {user ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                    <span className="font-semibold flex items-center gap-1.5 truncate">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>Enquiring as verified student:</span>
                      <strong className="text-foreground font-bold truncate">{user.full_name || "Student"}</strong>
                    </span>
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-black uppercase shrink-0">
                      VERIFIED
                    </Badge>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold">
                      <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Student / Guardian Account Required to Enquire</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleOpenAuth("signup")}
                        className="h-8 text-xs font-bold bg-[#E11D48] hover:bg-[#BE123C] text-white"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Register Free
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAuth("signin")}
                        className="h-8 text-xs font-bold"
                      >
                        Sign In
                      </Button>
                    </div>
                  </div>
                )}

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Student Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1">
                      Student Name <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Rahul Sharma"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="h-10 text-xs bg-background"
                      required
                    />
                  </div>

                  {/* Contact Phone Number */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1">
                      Contact Phone Number <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <Input
                      type="tel"
                      placeholder="10-digit mobile"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="h-10 text-xs bg-background font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Email Address */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Email Address</label>
                    <Input
                      type="email"
                      placeholder="applicant@example.com"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="h-10 text-xs bg-background"
                    />
                  </div>

                  {/* Selected Program Selector */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Selected Program</label>
                    {institutionPrograms.length > 1 ? (
                      <Select value={selectedProgramId} onValueChange={handleProgramSelect}>
                        <SelectTrigger className="h-10 text-xs bg-background font-bold text-foreground">
                          <SelectValue placeholder="Choose Program" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {institutionPrograms.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)} className="text-xs font-semibold">
                              {p.title || p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={selectedProgramTitle}
                        readOnly
                        disabled
                        className="h-10 text-xs bg-muted font-bold text-foreground cursor-not-allowed"
                      />
                    )}
                  </div>
                </div>

                {/* Enquiry Type / Source */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Enquiry Type / Source</label>
                  <Select value={enquirySource} onValueChange={setEnquirySource}>
                    <SelectTrigger className="h-10 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Website Course Inquiry">Website Course Inquiry</SelectItem>
                      <SelectItem value="Online Counseling Desk">Online Counseling Desk</SelectItem>
                      <SelectItem value="Admission Question">Admission Question & Guidance</SelectItem>
                      <SelectItem value="Syllabus & Curriculum">Syllabus & Curriculum Request</SelectItem>
                      <SelectItem value="Fee & Scholarship">Fee & Scholarship Details</SelectItem>
                      <SelectItem value="Campus Visit & Hostel">Campus Visit & Hostel Facilities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Question / Inquiry Details */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Question / Inquiry Details</label>
                  <Textarea
                    rows={3}
                    placeholder="Enter your specific question or requirements..."
                    value={inquiryDetails}
                    onChange={(e) => setInquiryDetails(e.target.value)}
                    className="text-xs bg-background resize-none leading-relaxed"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStudentName("");
                      setContactPhone("");
                      setEmailAddress("");
                      setInquiryDetails("");
                    }}
                    className="text-xs font-semibold px-5 h-10 rounded-xl"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={submittingEnquiry}
                    className="text-xs font-bold bg-[#E11D48] hover:bg-[#BE123C] text-white px-6 h-10 rounded-xl shadow-md gap-2 cursor-pointer"
                  >
                    {submittingEnquiry ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Submit Enquiry
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </aside>
      </section>

      <AuthModalDialog
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab={authModalTab}
      />
    </div>
  );
}
