"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Loader2,
  ShieldCheck,
  LockKeyhole,
  Sparkles,
  CheckCircle2,
  GraduationCap,
  Users,
  Briefcase,
} from "lucide-react";

import { loginSchema, type LoginInput } from "@/lib/validations";
import { useAuthStore } from "@/store";
import { canAccessAdminArea, getFirstAllowedAdminPath, hasAdminPagePermission } from "@/lib/auth/permissions";
import { toCanonicalAdminPath, toRoleRoutePath } from "@/lib/auth/role-routes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

function getAuthErrorMessage(reason: string | null) {
  switch (reason) {
    case "PLATFORM_SITE_REQUIRES_PLATFORM_ADMIN":
      return "This is the platform portal. Please use platform admin credentials.";
    case "INSTITUTION_SITE_REQUIRES_INSTITUTION_ACCOUNT":
      return "This site belongs to an institution. Please use institution admin credentials.";
    case "INSTITUTION_SITE_REQUIRES_KNOWN_TENANT":
      return "This institution site is not configured yet.";
    case "INSTITUTION_SITE_REQUIRES_TENANT_MEMBERSHIP":
      return "You do not belong to this institution.";
    case "DEPLOYMENT_ACCESS_DENIED":
      return "This account cannot access this deployment.";
    default:
      return null;
  }
}

export default function AdminLoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setAuth, isAuthenticated, user } = useAuthStore();

  const [isPending, setIsPending] = useState(false);
  const hasAdminAreaAccess = canAccessAdminArea(user);
  const shouldRedirect = isAuthenticated;
  const loginPath = pathname === "/institution/login" ? "/institution/login" : "/admin/login";
  const getRedirectPath = useCallback((nextUser: typeof user) => {
    if (!canAccessAdminArea(nextUser)) {
      return toRoleRoutePath("/admin", nextUser);
    }

    const from = searchParams.get("from");
    const canonicalFrom = from ? toCanonicalAdminPath(from) : null;
    if (canonicalFrom && (canonicalFrom === "/admin/account" || hasAdminPagePermission(nextUser, canonicalFrom))) {
      return toRoleRoutePath(canonicalFrom, nextUser);
    }
    return toRoleRoutePath(getFirstAllowedAdminPath(nextUser) || "/admin/account", nextUser);
  }, [searchParams]);

  useEffect(() => {
    if (shouldRedirect) {
      router.replace(getRedirectPath(user));
    }
  }, [getRedirectPath, router, shouldRedirect, user]);

  useEffect(() => {
    const message = getAuthErrorMessage(searchParams.get("auth_error"));
    if (!message) return;

    toast.error(message);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("auth_error");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${loginPath}?${nextQuery}` : loginPath);
  }, [loginPath, router, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  if (shouldRedirect) return null;

  async function onSubmit(data: LoginInput) {
    setIsPending(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        if (
          json?.error_code === "ACCOUNT_SUSPENDED" ||
          json?.error_code === "INSTITUTION_SUSPENDED"
        ) {
          router.replace(
            `/account-suspended?reason=${json.error_code === "INSTITUTION_SUSPENDED" ? "institution" : "account"
            }`
          );
          return;
        }

        const msg =
          json?.issues?.email?.[0] ||
          json?.issues?.password?.[0] ||
          json?.error ||
          "Login failed";

        toast.error(msg);
        return;
      }

      const { user, accessToken } = json;

      setAuth(user, accessToken);

      toast.success(
        canAccessAdminArea(user)
          ? `Welcome back, ${user.full_name}`
          : `Signed in as ${user.full_name}`
      );

      router.replace(getRedirectPath(user));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDemoLogin(role: "student" | "guardian" | "professional" | "platform_admin") {
    setIsPending(true);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Demo login failed");
      }

      setAuth(json.user, json.accessToken);
      const roleLabel = role === "student" ? "Student" : role === "guardian" ? "Guardian" : role === "professional" ? "Professional" : "Platform Admin";
      toast.success(`Signed in as Demo ${roleLabel}`);

      router.replace(getRedirectPath(json.user));
    } catch {
      toast.error("Demo sign in failed");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white grid lg:grid-cols-2">
      {/* Left Side */}
      <div className="hidden lg:flex relative overflow-hidden border-r border-zinc-900 bg-gradient-to-br from-black via-zinc-950 to-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.15),transparent_40%)]" />

        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Logo - Clickable */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-6 group cursor-pointer">
              <Image
                src="/icons/edubird.webp"
                alt="EduBird"
                width={96}
                height={96}
                className="h-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />

              <Separator orientation="vertical" className="h-[96px] bg-red-500 w-0.5" />

              <div>
                <h1 className="text-5xl font-bold tracking-tight transition-colors duration-300 group-hover:text-red-400">
                  EduBird
                </h1>

                <p className="text-zinc-400 text-lg mt-1">
                  Smart Learning Management Dashboard
                </p>
              </div>
            </Link>

            <div className="max-w-xl pt-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-sm text-red-300">
                <Sparkles className="h-4 w-4" />
                Modern Education Administration
              </div>

              <h2 className="mt-8 text-4xl font-semibold leading-tight">
                Manage students, courses, analytics and administration
                from one powerful dashboard.
              </h2>

              <p className="mt-6 text-lg leading-8 text-zinc-400">
                Secure, scalable and designed for modern educational
                institutions with a fast and intuitive admin experience.
              </p>
            </div>
          </div>

          {/* Bottom Footer with Verification Badge */}
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <ShieldCheck className="h-4 w-4 text-red-400" />
            <span className="flex items-center gap-1.5">
              Trusted by institutions, secured by EduBird
              <CheckCircle2 className="h-4 w-4 text-red-500 inline-block" />
            </span>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md border border-zinc-900 bg-zinc-950/80 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-8">
            {/* Mobile Logo - Clickable */}
            <Link href="/" className="flex lg:hidden items-center justify-center gap-3 mb-8 group cursor-pointer">
              <Image
                src="/icons/edubird.webp"
                alt="EduBird"
                width={52}
                height={52}
                className="h-auto transition-transform duration-300 group-hover:scale-105"
              />

              <div>
                <h1 className="text-2xl font-bold transition-colors duration-300 group-hover:text-red-400">EduBird</h1>
                <p className="text-xs text-zinc-400">
                  Admin Dashboard
                </p>
              </div>
            </Link>

            {/* Header */}
            <div className="space-y-2 text-center mb-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
                <LockKeyhole className="h-6 w-6 text-red-400" />
              </div>

              <h2 className="text-3xl font-bold tracking-tight mt-4">
                Admin Login
              </h2>

              <p className="text-zinc-400 text-sm">
                {hasAdminAreaAccess
                  ? "Sign in to access the EduBird administration panel"
                  : "Sign in to continue to EduBird"}
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
            >
              {/* Email */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-zinc-300"
                >
                  Email Address
                </Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="admin@edubird.com"
                  autoComplete="email"
                  disabled={isPending}
                  {...register("email")}
                  className={`h-12 bg-black border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 ${errors.email
                      ? "border-red-500"
                      : ""
                    }`}
                />

                {errors.email && (
                  <p className="text-xs text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-zinc-300"
                >
                  Password
                </Label>

                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isPending}
                  {...register("password")}
                  className={`h-12 bg-black border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 ${errors.password
                      ? "border-red-500"
                      : ""
                    }`}
                />

                {errors.password && (
                  <p className="text-xs text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-12 mt-2 bg-red-500 hover:bg-red-600 text-white font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Access Dashboard"
                )}
              </Button>
            </form>

            {/* Demo Quick Access */}
            <div className="mt-6 pt-5 border-t border-zinc-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-red-500" />
                  Try Demo Accounts
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">1-Click Sign In</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDemoLogin("student")}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-red-500/40 transition-all cursor-pointer group text-center"
                >
                  <GraduationCap className="h-4 w-4 text-red-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">Student</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5">Learner</span>
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDemoLogin("guardian")}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-amber-500/40 transition-all cursor-pointer group text-center"
                >
                  <Users className="h-4 w-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">Guardian</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5">Parent</span>
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDemoLogin("professional")}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-blue-500/40 transition-all cursor-pointer group text-center"
                >
                  <Briefcase className="h-4 w-4 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">Professional</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5">Institute</span>
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDemoLogin("platform_admin")}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-purple-500/40 transition-all cursor-pointer group text-center"
                >
                  <ShieldCheck className="h-4 w-4 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">Super Admin</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5">Full System</span>
                </button>
              </div>
            </div>

            <Separator className="my-6 bg-zinc-900" />

            {/* Footer */}
            <div className="text-center text-xs text-zinc-500 leading-6">
              Protected administrative access for authorized EduBird
              staff only.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
