"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function EditLanguagePage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch(`/api/admin/institutions/languages/${id}`);
                const json = await res.json();
                if (res.ok && mounted) {
                    setName(json.data.name || "");
                    setSlug(json.data.slug || "");
                } else {
                    toast.error(json.error ?? "Failed to load");
                }
            } catch {
                toast.error("Network error");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [id]);

    const handleUpdate = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/institutions/languages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug }) });
            const json = await res.json();
            if (res.ok) {
                toast.success("Updated");
                router.push('/admin/institutions/languages');
            } else {
                toast.error(json.error ?? "Failed");
            }
        } catch {
            toast.error("Network error");
        } finally { setSubmitting(false); }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-xl">
            <h2 className="text-xl font-semibold mb-4">Edit Language</h2>
            <div className="space-y-3">
                <div>
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                    <Label>Slug</Label>
                    <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleUpdate} disabled={submitting}>{submitting ? 'Saving...' : 'Update'}</Button>
                </div>
            </div>
        </div>
    );
}
