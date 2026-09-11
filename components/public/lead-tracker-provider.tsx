"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
    ArrowRight,
    Building2,
    Clock,
    Mail,
    MessageSquareText,
    Phone,
    ShieldCheck,
    TrendingUp,
    User,
    UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { readJsonResponse } from "@/lib/api/read-json-response";
import { usePageSeo } from "@/hooks/use-page-seo";
import { useAuthStore } from "@/store";

const TOKEN_KEY = "visitor_tracking_token";
const UTM_KEY = "visitor_tracking_utm";

type TrackerTrigger = "enroll" | "contact" | "demo" | "callback" | "enquiry";

type TrackerSettings = {
    tracking_enabled: boolean;
    tracker_update_interval_minutes: number;
};

const fieldIconClass = "size-5 text-primary";

function currentUrl() {
    return window.location.pathname + window.location.search;
}

function getStoredUtm() {
    try {
        return JSON.parse(localStorage.getItem(UTM_KEY) || "{}");
    } catch {
        return {};
    }
}

function rememberUtm() {
    if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get("ref") || urlParams.get("referral") || urlParams.get("affiliate") || urlParams.get("code");
        if (refParam) {
            try {
                localStorage.setItem("edubird_referral_code", refParam.trim());
            } catch {}
        }
    }
    if (!localStorage.getItem("visitor_first_page_url")) {
        localStorage.setItem("visitor_first_page_url", currentUrl());
    }

    const params = new URLSearchParams(window.location.search);
    const utm = {
        utmSource: params.get("utm_source"),
        utmMedium: params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
        utmTerm: params.get("utm_term"),
        utmContent: params.get("utm_content"),
    };

    if (Object.values(utm).some(Boolean)) {
        localStorage.setItem(UTM_KEY, JSON.stringify(utm));
    }
}

export function LeadTrackerProvider({ children }: { children: React.ReactNode }) {
    usePageSeo();
    const pathname = usePathname();
    const { user, isAuthenticated } = useAuthStore();
    const [settings, setSettings] = useState<TrackerSettings | null>(null);
    const [open, setOpen] = useState(false);
    const [triggerType, setTriggerType] = useState<TrackerTrigger>("enquiry");
    const [submitting, setSubmitting] = useState(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const lastTrackedUrlRef = useRef("");

    const isAdmin = Boolean(
        isAuthenticated &&
        user &&
        (user.role_codes?.includes("platform_admin") ||
         user.role_codes?.includes("institution_admin") ||
         user.is_super_admin)
    );

    const track = useCallback(async (type: string, updateOnly = false) => {
        if (isAdmin) return;
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token || settings?.tracking_enabled === false) return;

        const pageUrl = currentUrl();
        await fetch("/api/tracker/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                trackingToken: token,
                pageUrl,
                pageTitle: document.title,
                triggerType: type,
                updateOnly,
            }),
        }).catch(() => undefined);
    }, [isAdmin, settings?.tracking_enabled]);

    useEffect(() => {
        if (isAdmin) return;
        rememberUtm();
        fetch("/api/tracker/settings")
            .then((res) => readJsonResponse<{ data?: TrackerSettings }>(res))
            .then((json) => setSettings(json.data || null))
            .catch(() => setSettings({ tracking_enabled: true, tracker_update_interval_minutes: 60 }));
    }, [isAdmin]);

    useEffect(() => {
        if (isAdmin || !settings?.tracking_enabled) return;
        const url = currentUrl();
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token || lastTrackedUrlRef.current === url) return;
        lastTrackedUrlRef.current = url;
        track("page_view");
    }, [isAdmin, pathname, settings?.tracking_enabled, track]);

    useEffect(() => {
        if (isAdmin || !settings?.tracking_enabled) return;
        const minutes = Math.max(1, settings.tracker_update_interval_minutes || 60);
        const interval = window.setInterval(() => {
            track("page_view", true);
        }, minutes * 60 * 1000);
        return () => window.clearInterval(interval);
    }, [isAdmin, settings, track]);

    useEffect(() => {
        if (isAdmin) return;
        const onClick = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            const dialogTrigger = target?.closest<HTMLElement>("[data-tracker-trigger]");
            if (dialogTrigger) {
                setTriggerType((dialogTrigger.dataset.trackerTrigger as TrackerTrigger) || "enquiry");
                setOpen(true);
                return;
            }

            const cta = target?.closest<HTMLElement>("[data-track-cta]");
            const ctaType = cta?.dataset.trackCta;
            if (ctaType) {
                track(ctaType);
            }
        };

        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, [isAdmin, track]);

    async function submitLead() {
        setSubmitting(true);
        try {
            const body = {
                fullName,
                email,
                phone,
                firstPageUrl: localStorage.getItem("visitor_first_page_url") || currentUrl(),
                currentPageUrl: currentUrl(),
                ...getStoredUtm(),
            };
            localStorage.setItem("visitor_first_page_url", body.firstPageUrl);

            const res = await fetch("/api/tracker/lead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const json = await readJsonResponse<{ error?: string; trackingToken?: string }>(res);
            if (!res.ok) throw new Error(json.error || "Failed to submit enquiry");

            if (json.trackingToken) {
                localStorage.setItem(TOKEN_KEY, json.trackingToken);
                await track(triggerType);
            }

            toast.success("Thanks, we will contact you shortly.");
            setOpen(false);
            setFullName("");
            setEmail("");
            setPhone("");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to submit enquiry");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            {children}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    showCloseButton
                    className="overflow-hidden border-border/70 bg-background/95 p-0 shadow-2xl sm:max-w-5xl md:h-[min(720px,calc(100dvh-2rem))] md:max-h-[calc(100dvh-2rem)] lg:max-w-6xl"
                >
                    <div className="grid h-full min-h-0 rounded-xl lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                        <div className="relative hidden overflow-hidden border-r border-primary/25 bg-gradient-to-br from-black via-black to-primary/20 lg:block">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,0,0,0.18),transparent_55%)]" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,0,0,0.12),transparent_50%)]" />
                            <div className="relative flex h-full min-h-0 items-center p-5 xl:p-7">
                                <div className="w-full space-y-5 xl:space-y-6">
                                    <div className="space-y-3 xl:space-y-4">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary-foreground">
                                            <ShieldCheck className="size-4 text-primary" />
                                            Trusted by 150+ Institutes
                                        </div>
                                        <div className="space-y-3 xl:space-y-4">
                                            <h2 className="max-w-md text-3xl font-bold leading-tight text-white xl:text-[2.15rem]">
                                                Take the Next Step in Your <span className="text-primary">Learning Journey</span>
                                            </h2>
                                            <p className="max-w-md text-base leading-7 text-white/70">
                                                Our education experts will help you find the perfect course and guide you at every step.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-sm xl:p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/10 xl:size-16">
                                                <Building2 className="size-7 text-primary xl:size-8" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">Find the Best Institute</p>
                                                <p className="text-xs text-white/70">Compare programs, facilities & ratings</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-sm text-white/80">
                                        <Clock className="size-4 text-primary" />
                                        <span>Quick response within 2 business hours</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex min-h-0 flex-col justify-between p-4 sm:p-5 lg:p-6">
                            <DialogHeader className="space-y-1 text-left">
                                <DialogTitle className="text-xl font-bold sm:text-2xl">
                                    Talk to an Admission Counselor
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                                    Share your contact details to get personalized recommendations and fee structure.
                                </DialogDescription>
                            </DialogHeader>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    void submitLead();
                                }}
                                className="space-y-3 py-2"
                            >
                                <div className="space-y-1.5">
                                    <Label htmlFor="lead-name">Your Name</Label>
                                    <div className="relative">
                                        <User className={cn(fieldIconClass, "absolute left-3 top-2.5")} />
                                        <Input
                                            id="lead-name"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Enter your full name"
                                            className="pl-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="lead-email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className={cn(fieldIconClass, "absolute left-3 top-2.5")} />
                                        <Input
                                            id="lead-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your.email@example.com"
                                            className="pl-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="lead-phone">Phone Number</Label>
                                    <div className="relative">
                                        <Phone className={cn(fieldIconClass, "absolute left-3 top-2.5")} />
                                        <Input
                                            id="lead-phone"
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="Enter 10-digit mobile number"
                                            className="pl-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button type="submit" disabled={submitting} className="w-full">
                                    {submitting ? "Submitting..." : "Get Free Counseling"}
                                    <ArrowRight className="ml-2 size-4" />
                                </Button>
                            </form>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
