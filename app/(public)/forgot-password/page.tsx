"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  KeyRound,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  User,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store";
import { toRoleRoutePath } from "@/lib/auth/role-routes";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  const initialIdentifier = searchParams.get("identifier") || searchParams.get("phone") || searchParams.get("email") || "";

  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [existingUser, setExistingUser] = useState<{
    id: number;
    full_name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    roles: string[];
  } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // Auto look up profile if identifier is 10 digits
  useEffect(() => {
    const clean = identifier.replace(/\D/g, "").slice(-10);
    if (clean.length === 10) {
      setLookingUp(true);
      fetch(`/api/auth/phone-lookup?phone=${clean}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.exists && data.user) {
            setExistingUser(data.user);
          } else {
            setExistingUser(null);
          }
        })
        .catch(() => setExistingUser(null))
        .finally(() => setLookingUp(false));
    } else {
      setExistingUser(null);
    }
  }, [identifier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim()) {
      toast.error("Please enter your registered phone number or email.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to reset password");
      }

      setSuccess(true);
      toast.success("Password reset successfully! Signing you in...");

      // Automatically sign in
      try {
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: identifier.trim(),
            password: newPassword,
          }),
        });
        const loginJson = await loginRes.json();
        if (loginRes.ok && loginJson.user) {
          setAuth(loginJson.user, loginJson.accessToken);
          const redirectPath = toRoleRoutePath("/admin", loginJson.user);
          setTimeout(() => router.push(redirectPath), 1000);
        }
      } catch {
        // user can sign in manually
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <Image
              src="/icons/edubird.webp"
              alt="EduBird"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <span className="font-black text-2xl tracking-tight text-slate-900">
              Edu<span className="text-[#D91B1B]">Bird</span>
            </span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Reset Your Password
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Recover your account using your registered phone number or email address.
          </p>
        </div>

        {/* Card Form */}
        <Card className="p-6 sm:p-8 bg-white border border-slate-100 shadow-xl rounded-3xl space-y-6">
          {success ? (
            <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Password Changed!</h3>
                <p className="text-xs text-slate-500">
                  Your new password has been saved. You can now access your EduBird dashboard.
                </p>
              </div>
              <Link href="/">
                <Button className="w-full bg-[#D91B1B] hover:bg-[#b01414] text-white font-bold h-11 rounded-xl shadow-md text-xs mt-2">
                  Go to Dashboard / Home <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Linked Profile Banner if Found */}
              {existingUser && (
                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-[#D91B1B] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {existingUser.full_name ? existingUser.full_name[0].toUpperCase() : "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {existingUser.full_name}
                        </span>
                        {existingUser.roles?.length > 0 && (
                          <Badge variant="secondary" className="text-[9px] font-bold bg-white text-[#D91B1B] px-1.5 py-0">
                            {existingUser.roles[0]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {existingUser.email || existingUser.phone}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[9px] font-bold shrink-0">
                    Profile Verified
                  </Badge>
                </div>
              )}

              {/* Registered Identifier */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">
                  Phone Number or Email Address
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Enter 10-digit mobile or email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={submitting}
                    className="pl-9 text-xs font-semibold h-11 rounded-xl border-slate-200 focus-visible:ring-[#D91B1B]"
                  />
                  {lookingUp && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin text-[#D91B1B]" />
                    </div>
                  )}
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">
                  New Password
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={submitting}
                    className="pl-9 pr-10 text-xs font-semibold h-11 rounded-xl border-slate-200 focus-visible:ring-[#D91B1B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
                    className="pl-9 pr-10 text-xs font-semibold h-11 rounded-xl border-slate-200 focus-visible:ring-[#D91B1B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#D91B1B] hover:bg-[#b01414] text-white font-bold h-11 rounded-xl shadow-md text-xs mt-3 gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    Set New Password & Sign In <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Back to Home / Sign In */}
              <div className="text-center pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#D91B1B] transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In / Home
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#D91B1B]" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
