"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  GraduationCap,
  ArrowRight,
  Loader2,
  X,
  Users,
  Briefcase,
  Sparkles,
  ShieldCheck,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";
import { toRoleRoutePath } from "@/lib/auth/role-routes";

import { useSearchParams } from "next/navigation";
import { useActiveInstitution } from "@/hooks/use-active-institution";

type AuthModalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "signin" | "signup";
  institutionId?: number | null;
};

const REGISTER_ROLES = [
  { value: "student", label: "Student (Access courses, notes & exams)" },
  { value: "guardian", label: "Guardian / Parent (Monitor student academic progress)" },
  { value: "institution_admin", label: "Professional / Organization (Manage institution, courses & administration)" },
];

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (!res.ok) {
      throw new Error(`Server error (${res.status}): Please check your connection or try again.`);
    }
    throw new Error("Invalid response received from server. Please try again.");
  }
}

export function AuthModalDialog({
  open,
  onOpenChange,
  defaultTab = "signup",
  institutionId,
}: AuthModalDialogProps) {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const searchParams = useSearchParams();
  const { activeInstitutionId, defaultEnvInstitutionId } = useActiveInstitution();
  const [isTenantInstitution, setIsTenantInstitution] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    fetch("/api/tenant/current", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!isCancelled && (data?.tenant?.institution_id || data?.appType === "institution")) {
          setIsTenantInstitution(true);
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, []);

  const urlInstIdRaw =
    searchParams?.get("institution_id") ||
    searchParams?.get("institute_id") ||
    searchParams?.get("inst_id") ||
    searchParams?.get("institution") ||
    searchParams?.get("institutionId") ||
    searchParams?.get("inst");
  const urlInstId =
    urlInstIdRaw && !isNaN(Number(urlInstIdRaw)) && Number(urlInstIdRaw) > 0
      ? Number(urlInstIdRaw)
      : null;

  const hasInstitutionId = Boolean(
    institutionId ||
      urlInstId ||
      activeInstitutionId ||
      defaultEnvInstitutionId ||
      isTenantInstitution ||
      process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID ||
      process.env.NEXT_PUBLIC_INSTITUTION_ID ||
      process.env.NEXT_PUBLIC_TENANT_INSTITUTION_ID ||
      process.env.NEXT_PUBLIC_INSTITUTION_PROFILE_ID
  );

  const [activeTab, setActiveTab] = useState<"signin" | "signup">(defaultTab);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // Sign In Form State
  const [signInIdentifier, setSignInIdentifier] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up Form State
  const [signUpFullName, setSignUpFullName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpCity, setSignUpCity] = useState("");
  const [signUpRole, setSignUpRole] = useState("student");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");

  const [existingPhoneProfile, setExistingPhoneProfile] = useState<{
    id: number;
    full_name: string;
    email: string | null;
    phone: string;
    avatar_url: string | null;
    roles: string[];
  } | null>(null);
  const [phoneChecking, setPhoneChecking] = useState(false);

  const signUpState = {
    signUpFullName,
    signUpEmail,
    signUpPhone,
    signUpCity,
    signUpRole,
  };

  const { saveStatus, handleBlur } = useProgressiveSave({
    formKey: "auth:signup",
    formState: signUpState,
    enabled: open && activeTab === "signup",
  });

  // Check phone duplication when 10 digits are typed
  useEffect(() => {
    const cleanPhone = signUpPhone.replace(/\D/g, "").slice(-10);
    if (open && activeTab === "signup" && cleanPhone.length === 10) {
      const timer = setTimeout(async () => {
        setPhoneChecking(true);
        try {
          const res = await fetch(`/api/auth/phone-lookup?phone=${cleanPhone}`);
          const data = await res.json();
          if (data.exists && data.user) {
            setExistingPhoneProfile(data.user);
          } else {
            setExistingPhoneProfile(null);
          }
        } catch {
          setExistingPhoneProfile(null);
        } finally {
          setPhoneChecking(false);
        }
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setExistingPhoneProfile(null);
    }
  }, [signUpPhone, open, activeTab]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInIdentifier.trim()) {
      toast.error("Please enter your email or phone number.");
      return;
    }
    if (!signInPassword) {
      toast.error("Please enter your password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signInIdentifier.trim(),
          password: signInPassword,
        }),
      });

      const json = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(json.error || "Failed to sign in");
      }

      setAuth(json.user, json.accessToken);
      toast.success(`Welcome back, ${json.user.full_name}!`);
      onOpenChange(false);

      const redirectPath = toRoleRoutePath("/admin", json.user);
      router.push(redirectPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (role: "student" | "guardian" | "professional" | "platform_admin") => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const json = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(json.error || "Demo sign in failed");
      }

      setAuth(json.user, json.accessToken);
      const roleLabel =
        role === "student"
          ? "Student"
          : role === "guardian"
          ? "Guardian"
          : role === "professional"
          ? "Professional"
          : "Platform Admin";
      toast.success(`Signed in with Demo ${roleLabel} Account!`);
      onOpenChange(false);

      const redirectPath = json.redirectTo || toRoleRoutePath("/admin", json.user);
      router.push(redirectPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demo sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpFullName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    const cleanPhone = signUpPhone.replace(/\D/g, "").slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }
    if (signUpPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!agreedToTerms) {
      toast.error("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setSubmitting(true);
    try {
      const payloadEmail = signUpEmail.trim() || null;
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: signUpFullName.trim(),
          email: payloadEmail,
          phone: cleanPhone,
          address: signUpCity.trim(),
          role_code: signUpRole,
          password: signUpPassword,
          confirmPassword: signUpConfirmPassword,
        }),
      });

      const json = await parseJsonResponse(res);
      if (!res.ok) {
        if (json.error === "Phone number already registered" || res.status === 409) {
          // fetch existing profile
          try {
            const lookupRes = await fetch(`/api/auth/phone-lookup?phone=${cleanPhone}`);
            const lookupData = await parseJsonResponse(lookupRes);
            if (lookupData.exists && lookupData.user) {
              setExistingPhoneProfile(lookupData.user);
            }
          } catch {
            // ignore lookup parse error
          }
        }
        throw new Error(json.error || "Registration failed");
      }

      // Auto login after registration
      const loginIdentifier = payloadEmail || cleanPhone;
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginIdentifier,
          password: signUpPassword,
        }),
      });

      const loginJson = await parseJsonResponse(loginRes);
      if (loginRes.ok && loginJson.user) {
        setAuth(loginJson.user, loginJson.accessToken);
        toast.success(`Welcome to EduBird, ${signUpFullName.trim()}!`);
        onOpenChange(false);
        const redirectPath = toRoleRoutePath("/admin", loginJson.user);
        router.push(redirectPath);
      } else {
        toast.success("Account created successfully! Please sign in.");
        setActiveTab("signin");
        setSignInIdentifier(loginIdentifier);
        setSignInPassword(signUpPassword);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl [&>button]:hidden">
        {/* Custom Header with Close Button */}
        <div className="pt-5 px-6 pb-3 text-center relative bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close modal"
            className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer z-10"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="pr-6">
            <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
              {activeTab === "signup" ? (
                <>
                  Create Your <span className="text-[#D91B1B]">EduBird</span> Account
                </>
              ) : (
                <>
                  Welcome Back to <span className="text-[#D91B1B]">EduBird</span>
                </>
              )}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {activeTab === "signup"
                ? "Join thousands of learners and start your learning journey"
                : "Sign in to access your courses, tests & dashboard"}
            </p>
          </div>
          {activeTab === "signup" && (
            <div className="mt-1.5 flex justify-center">
              <ProgressiveSaveIndicator status={saveStatus} />
            </div>
          )}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3 space-y-3">
          {activeTab === "signup" ? (
            /* Sign Up Form matching Screenshot Exact Design */
            <form onSubmit={handleSignUp} className="space-y-2.5">
              {/* Existing Phone Profile Alert & Selector */}
              {existingPhoneProfile && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {existingPhoneProfile.full_name ? existingPhoneProfile.full_name[0].toUpperCase() : "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {existingPhoneProfile.full_name}
                          </span>
                          {existingPhoneProfile.roles?.length > 0 && (
                            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-900 px-1.5 py-0.5 rounded-md">
                              {existingPhoneProfile.roles[0]}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium truncate">
                          {existingPhoneProfile.email ? `${existingPhoneProfile.email} • ` : ""}{existingPhoneProfile.phone}
                        </p>
                      </div>
                    </div>
                    <span className="bg-amber-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      Already Registered
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-900 font-medium leading-tight">
                    An account is already associated with this phone number. Select an option below:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <Button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        router.push(`/forgot-password?identifier=${encodeURIComponent(existingPhoneProfile.phone)}`);
                      }}
                      className="w-full bg-[#D91B1B] hover:bg-[#b01414] text-white text-[11px] font-bold h-8.5 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Select & Reset Password
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setActiveTab("signin");
                        setSignInIdentifier(existingPhoneProfile.phone);
                        setExistingPhoneProfile(null);
                      }}
                      className="w-full text-[11px] font-bold h-8.5 rounded-xl border-amber-500/40 text-amber-900 hover:bg-amber-100/60 gap-1.5 cursor-pointer"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      Sign In with Password
                    </Button>
                  </div>
                </div>
              )}

              {/* Row 1: Full Name & Email Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Full Name */}
                <div
                  onBlur={() => handleBlur()}
                  className="flex items-center gap-2.5 p-2 px-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#D91B1B] focus-within:ring-2 focus-within:ring-rose-500/10 transition-all shadow-2xs"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#D91B1B]">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Full Name <span className="text-[#D91B1B]">*</span>
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Riya Sharma"
                      value={signUpFullName}
                      onChange={(e) => setSignUpFullName(e.target.value)}
                      disabled={submitting}
                      className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent outline-none border-none p-0 focus:ring-0"
                    />
                  </div>
                </div>

                {/* Email Address (Optional) */}
                <div
                  onBlur={() => handleBlur()}
                  className="flex items-center gap-2.5 p-2 px-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#D91B1B] focus-within:ring-2 focus-within:ring-rose-500/10 transition-all shadow-2xs"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#D91B1B]">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                    </span>
                    <input
                      type="email"
                      placeholder="name@example.com (optional)"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      disabled={submitting}
                      className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent outline-none border-none p-0 focus:ring-0"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Phone Number & Register As */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Phone Number */}
                <div
                  onBlur={() => handleBlur()}
                  className="flex items-center gap-2.5 p-2 px-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#D91B1B] focus-within:ring-2 focus-within:ring-rose-500/10 transition-all shadow-2xs relative"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#D91B1B]">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 pr-5">
                    <span className="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Phone Number <span className="text-[#D91B1B]">*</span>
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit mobile"
                      value={signUpPhone}
                      onChange={(e) => {
                        setSignUpPhone(e.target.value);
                        if (existingPhoneProfile) setExistingPhoneProfile(null);
                      }}
                      disabled={submitting}
                      className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent outline-none border-none p-0 focus:ring-0"
                    />
                  </div>
                  {phoneChecking && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D91B1B]" />
                    </div>
                  )}
                </div>

                {/* Register As */}
                <div
                  onBlur={() => handleBlur()}
                  className="flex items-center gap-2.5 p-2 px-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#D91B1B] focus-within:ring-2 focus-within:ring-rose-500/10 transition-all shadow-2xs"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#D91B1B]">
                    <GraduationCap className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Register As <span className="text-[#D91B1B]">*</span>
                    </span>
                    <select
                      value={signUpRole}
                      onChange={(e) => setSignUpRole(e.target.value)}
                      disabled={submitting}
                      className="w-full text-xs font-semibold text-slate-900 bg-transparent outline-none border-none p-0 focus:ring-0 cursor-pointer truncate"
                    >
                      {REGISTER_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 4: Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Password */}
                <div className="flex items-center gap-2.5 p-2 px-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#D91B1B] focus-within:ring-2 focus-within:ring-rose-500/10 transition-all shadow-2xs relative">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#D91B1B]">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 pr-5">
                    <span className="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Password <span className="text-[#D91B1B]">*</span>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 6 characters"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      disabled={submitting}
                      className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent outline-none border-none p-0 focus:ring-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Confirm Password */}
                <div className="flex items-center gap-2.5 p-2 px-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#D91B1B] focus-within:ring-2 focus-within:ring-rose-500/10 transition-all shadow-2xs relative">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#D91B1B]">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 pr-5">
                    <span className="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Confirm Password <span className="text-[#D91B1B]">*</span>
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      disabled={submitting}
                      className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent outline-none border-none p-0 focus:ring-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-center gap-2 pt-0.5">
                <Checkbox
                  id="agree-terms"
                  checked={agreedToTerms}
                  onCheckedChange={(c) => setAgreedToTerms(c === true)}
                  className="data-[state=checked]:bg-[#D91B1B] data-[state=checked]:border-[#D91B1B]"
                />
                <label htmlFor="agree-terms" className="text-[11px] text-slate-600 cursor-pointer">
                  I agree to the{" "}
                  <Link href="/terms" className="font-semibold text-[#D91B1B] hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="font-semibold text-[#D91B1B] hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Action Button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#D91B1B] hover:bg-[#b01414] text-white font-bold h-10 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 text-xs mt-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>

              {/* Footer Switcher */}
              <div className="text-center pt-2 text-xs text-slate-500">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("signin")}
                  className="font-bold text-[#D91B1B] hover:underline cursor-pointer ml-1"
                >
                  Sign In
                </button>
              </div>
            </form>
          ) : (
            /* Sign In Form with matching Card Style */
            <form onSubmit={handleSignIn} className="space-y-3.5">
              {/* Identifier (Email/Phone) */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#D91B1B] focus-within:ring-2 focus-within:ring-rose-500/10 transition-all">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#D91B1B]">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Email Address or Phone Number <span className="text-[#D91B1B]">*</span>
                  </span>
                  <input
                    type="text"
                    placeholder="Enter email or 10-digit phone"
                    value={signInIdentifier}
                    onChange={(e) => setSignInIdentifier(e.target.value)}
                    disabled={submitting}
                    className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent outline-none border-none p-0 focus:ring-0"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#D91B1B] focus-within:ring-2 focus-within:ring-rose-500/10 transition-all relative">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#D91B1B]">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="flex flex-col min-w-0 flex-1 pr-6">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Password <span className="text-[#D91B1B]">*</span>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    disabled={submitting}
                    className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent outline-none border-none p-0 focus:ring-0"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end pr-1 -mt-1">
                <Link
                  href={
                    signInIdentifier.trim()
                      ? `/forgot-password?identifier=${encodeURIComponent(signInIdentifier.trim())}`
                      : "/forgot-password"
                  }
                  onClick={() => onOpenChange(false)}
                  className="text-[11px] font-bold text-[#D91B1B] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#D91B1B] hover:bg-[#b01414] text-white font-bold h-12 rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 text-sm mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to Account <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Quick Demo Sign In Section */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#D91B1B]" />
                    Demo Account Quick Login
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">1-Click Access</span>
                </div>
                <div
                  className={cn(
                    "grid gap-2",
                    hasInstitutionId ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"
                  )}
                >
                  {/* Student Demo */}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleDemoLogin("student")}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-rose-50/80 hover:border-rose-300 hover:shadow-xs transition-all cursor-pointer group text-center"
                  >
                    <div className="h-8 w-8 rounded-lg bg-rose-100 text-[#D91B1B] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-800 group-hover:text-[#D91B1B]">Student</span>
                    <span className="text-[9px] text-slate-500 font-medium leading-none mt-0.5">Learn & Test</span>
                  </button>

                  {/* Guardian Demo */}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleDemoLogin("guardian")}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-amber-50/80 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer group text-center"
                  >
                    <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-800 group-hover:text-amber-700">Guardian</span>
                    <span className="text-[9px] text-slate-500 font-medium leading-none mt-0.5">Track Student</span>
                  </button>

                  {/* Professional Demo */}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleDemoLogin("professional")}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50/80 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group text-center"
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-800 group-hover:text-blue-700">Professional</span>
                    <span className="text-[9px] text-slate-500 font-medium leading-none mt-0.5">Institute Admin</span>
                  </button>

                  {/* Platform Admin Demo */}
                  {!hasInstitutionId && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDemoLogin("platform_admin")}
                      className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-purple-50/80 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group text-center"
                    >
                      <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-800 group-hover:text-purple-700">Platform Admin</span>
                      <span className="text-[9px] text-slate-500 font-medium leading-none mt-0.5">Full System Access</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Footer Switcher */}
              <div className="text-center pt-1 text-xs text-slate-500">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("signup")}
                  className="font-bold text-[#D91B1B] hover:underline cursor-pointer ml-1"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
