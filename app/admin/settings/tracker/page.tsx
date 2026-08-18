"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";

export default function TrackerSettingsPage() {
    const { isReady } = useAdminGuard();
    const { accessToken } = useAuthStore();
    const [enabled, setEnabled] = useState(true);
    const [interval, setIntervalValue] = useState("60");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isReady || !accessToken) return;
        fetch("/api/admin/tracker/settings", {
            headers: { Authorization: `Bearer ${accessToken}` },
        })
            .then((res) => res.json())
            .then((json) => {
                setEnabled(json.data?.tracking_enabled ?? true);
                setIntervalValue(String(json.data?.tracker_update_interval_minutes ?? 60));
            })
            .catch(() => toast.error("Failed to load tracker settings"))
            .finally(() => setLoading(false));
    }, [accessToken, isReady]);

    async function save() {
        if (!accessToken) return;
        setSaving(true);
        try {
            const res = await fetch("/api/admin/tracker/settings", {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tracking_enabled: enabled,
                    tracker_update_interval_minutes: Number(interval),
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to save settings");
            toast.success("Tracker settings updated");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save settings");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Tracker Settings</h1>
                <p className="text-muted-foreground">Control public visitor tracking and session heartbeat timing.</p>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading settings...
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="flex items-center gap-3 rounded-md border p-4">
                            <Checkbox id="tracking-enabled" checked={enabled} onCheckedChange={(checked) => setEnabled(checked === true)} />
                            <Label htmlFor="tracking-enabled" className="cursor-pointer">Enable visitor tracking</Label>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="tracker-interval">Update interval in minutes</Label>
                            <Input
                                id="tracker-interval"
                                type="number"
                                min={1}
                                value={interval}
                                onChange={(event) => setIntervalValue(event.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <Button onClick={save} disabled={saving || loading}>
                    {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
