"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function NewSubtypePage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return toast.error("Name required");
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/institutions/subtypes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug }) });
            const json = await res.json();
            if (res.ok) {
                toast.success("Created");
                router.push('/admin/institutions/subtypes');
            } else {
                toast.error(json.error ?? "Failed");
            }
        } catch (err) {
            toast.error("Network error");
        } finally { setSubmitting(false); }
    };

    return (
        <div className="max-w-xl">
            <h2 className="text-xl font-semibold mb-4">New Institution Subtype</h2>
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
                    <Button onClick={handleCreate} disabled={submitting}>{submitting ? 'Saving...' : 'Create'}</Button>
                </div>
            </div>
        </div>
    );
}
