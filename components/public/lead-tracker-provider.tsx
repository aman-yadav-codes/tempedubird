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

import { usePageSeo } from "@/hooks/use-page-seo";

export function LeadTrackerProvider({ children }: { children: React.ReactNode }) {
    usePageSeo();
    const pathname = usePathname();
    const [settings, setSettings] = useState<TrackerSettings | null>(null);
    const [open, setOpen] = useState(false);
    const [triggerType, setTriggerType] = useState<TrackerTrigger>("enquiry");
    const [submitting, setSubmitting] = useState(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const lastTrackedUrlRef = useRef("");

    const track = useCallback(async (type: string, updateOnly = false) => {
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
    }, [settings?.tracking_enabled]);

    useEffect(() => {
        rememberUtm();
        fetch("/api/tracker/settings")
            .then((res) => readJsonResponse<{ data?: TrackerSettings }>(res))
            .then((json) => setSettings(json.data || null))
            .catch(() => setSettings({ tracking_enabled: true, tracker_update_interval_minutes: 60 }));
    }, []);

    useEffect(() => {
        if (!settings?.tracking_enabled) return;
        const url = currentUrl();
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token || lastTrackedUrlRef.current === url) return;
        lastTrackedUrlRef.current = url;
        track("page_view");
    }, [pathname, settings?.tracking_enabled, track]);

    useEffect(() => {
        if (!settings?.tracking_enabled) return;
        const minutes = Math.max(1, settings.tracker_update_interval_minutes || 60);
        const interval = window.setInterval(() => {
            track("page_view", true);
        }, minutes * 60 * 1000);
        return () => window.clearInterval(interval);
    }, [settings, track]);

    useEffect(() => {
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
    }, [track]);

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
                                                <p className="text-lg font-bold text-white xl:text-xl">50,000+ students guided</p>
                                                <p className="text-sm text-white/65">Simple, trusted support for course selection and enrollment.</p>
                                            </div>
                                        </div>


                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex min-h-0 items-start justify-center overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-8">
                            <div className="w-full max-w-md space-y-5 pb-2 lg:space-y-6 lg:pb-4">
                                <DialogHeader className="items-center text-center">
                                    <div className="grid size-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10 sm:size-16">
                                        <MessageSquareText className="size-7 text-primary sm:size-8" />
                                    </div>
                                    <DialogTitle className="text-2xl font-bold leading-tight sm:text-3xl">
                                        Request <span className="text-primary">Course Guidance</span>
                                    </DialogTitle>
                                    <DialogDescription className="max-w-sm text-base leading-7">
                                        Fill in your details and our team will get back to you shortly.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 lg:space-y-4.5">
                                    <div className="space-y-2">
                                        <Label htmlFor="lead-full-name">Full Name</Label>
                                        <div className="relative">
                                            <User className={cn(fieldIconClass, "absolute left-4 top-1/2 -translate-y-1/2")} />
                                            <Input
                                                id="lead-full-name"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Enter your full name"
                                                className="h-12 rounded-xl pl-12 text-base lg:h-14"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lead-email">Email Address</Label>
                                        <div className="relative">
                                            <Mail className={cn(fieldIconClass, "absolute left-4 top-1/2 -translate-y-1/2")} />
                                            <Input
                                                id="lead-email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="Enter your email address"
                                                type="email"
                                                className="h-12 rounded-xl pl-12 text-base lg:h-14"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lead-phone">Phone Number</Label>
                                        <div className="relative">
                                            <Phone className={cn(fieldIconClass, "absolute left-4 top-1/2 -translate-y-1/2")} />
                                            <Input
                                                id="lead-phone"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="Enter your phone number"
                                                className="h-12 rounded-xl pl-12 text-base lg:h-14"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                        <ShieldCheck className="size-4" />
                                        Your information is secure and will not be shared
                                    </div>

                                    <Button
                                        className="h-12 w-full rounded-xl text-base font-bold shadow-lg shadow-primary/20 lg:h-14"
                                        onClick={submitLead}
                                        disabled={submitting}
                                    >
                                        {submitting ? "Submitting..." : "Get Free Consultation"}
                                        <ArrowRight className="ml-2 size-5" />
                                    </Button>

                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="size-4" />
                                        Usually responds within <span className="font-semibold text-primary">24 hours</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
