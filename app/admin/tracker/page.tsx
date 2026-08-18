"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Eye, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";

type VisitorSession = {
    tracking_token: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    current_page_url: string | null;
    created_at: string;
    last_seen_at: string;
    activity_count: number;
};

type VisitorActivity = {
    id: number;
    page_url: string;
    page_title: string | null;
    trigger_type: string | null;
    visited_at: string;
};

function formatDate(value: string) {
    return new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

async function readApiJson(res: Response) {
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(text.includes("<!DOCTYPE") ? "Your admin session expired. Please sign in again." : "Unexpected server response");
    }
    return res.json();
}

export default function TrackerPage() {
    const { isReady } = useAdminGuard();
    const { accessToken } = useAuthStore();
    const [sessions, setSessions] = useState<VisitorSession[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<VisitorSession | null>(null);
    const [activities, setActivities] = useState<VisitorActivity[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchSessions = useCallback(async () => {
        if (!isReady || !accessToken) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/tracker/sessions?search=${encodeURIComponent(search)}&page=1&limit=30`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const json = await readApiJson(res);
            if (!res.ok) throw new Error(json.error || "Failed to load tracker history");
            setSessions(json.data || []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to load tracker history");
        } finally {
            setLoading(false);
        }
    }, [accessToken, isReady, search]);

    useEffect(() => {
        const timeout = window.setTimeout(fetchSessions, 250);
        return () => window.clearTimeout(timeout);
    }, [fetchSessions]);

    async function openDetails(session: VisitorSession) {
        if (!accessToken) return;
        setSelected(session);
        setDetailLoading(true);
        try {
            const res = await fetch(`/api/admin/tracker/sessions/${session.tracking_token}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const json = await readApiJson(res);
            if (!res.ok) throw new Error(json.error || "Failed to load journey");
            setActivities(json.data.activities || []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to load journey");
        } finally {
            setDetailLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Tracker History</h1>
                    <p className="text-muted-foreground">View captured leads and their public page journey.</p>
                </div>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="pl-9" />
                </div>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading tracker history...
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">No tracked leads found.</div>
                ) : (
                    <div className="divide-y">
                        {sessions.map((session) => (
                            <div key={session.tracking_token} className="grid gap-3 p-4 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
                                <div className="min-w-0">
                                    <p className="font-semibold">{session.full_name || "Unnamed lead"}</p>
                                    <p className="truncate text-sm text-muted-foreground">{session.email || session.phone || session.tracking_token}</p>
                                </div>
                                <div className="min-w-0 text-sm text-muted-foreground">
                                    <p className="truncate">{session.current_page_url || "No current page"}</p>
                                    <p className="mt-1 flex items-center gap-1 text-xs">
                                        <Clock className="size-3" />
                                        Last seen {formatDate(session.last_seen_at)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">{session.activity_count} events</Badge>
                                    <Button size="sm" variant="outline" onClick={() => openDetails(session)}>
                                        <Eye className="mr-2 size-4" />
                                        View
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
                <SheetContent className="overflow-y-auto sm:max-w-2xl">
                    <SheetHeader>
                        <SheetTitle>{selected?.full_name || "Lead Journey"}</SheetTitle>
                        <SheetDescription>{selected?.tracking_token}</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-3">
                        {detailLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                Loading journey...
                            </div>
                        ) : activities.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No activity recorded.</p>
                        ) : (
                            activities.map((activity) => (
                                <div key={activity.id} className="rounded-md border p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <Badge variant="outline">{activity.trigger_type || "activity"}</Badge>
                                        <span className="text-xs text-muted-foreground">{formatDate(activity.visited_at)}</span>
                                    </div>
                                    <p className="mt-2 truncate text-sm font-medium">{activity.page_title || activity.page_url}</p>
                                    <p className="mt-1 break-all text-xs text-muted-foreground">{activity.page_url}</p>
                                </div>
                            ))
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
