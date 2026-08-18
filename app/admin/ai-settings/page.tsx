"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { slugify } from "@/lib/utils/slug";
import { cn } from "@/lib/utils";

type AiProviderRow = {
    id: number;
    name: string;
    slug: string;
    base_url: string;
    institution_id?: number | null;
    provider_scope?: "platform" | "institution";
    model_name?: string | null;
    chat_id?: string | null;
    last_response_id?: string | null;
    token?: string | null;
    is_active: boolean;
};

type ProviderForm = {
    id: number | null;
    name: string;
    base_url: string;
    model_name: string;
    token: string;
    is_active: boolean;
};

type SettingsTab = "api" | "templates";

const builtInTemplates = [
    {
        title: "Institution Details",
        slug: "institution-details",
        fields: ["about", "history", "key_highlights", "email", "phone", "website_url", "established_year"],
    },
    {
        title: "Scholarship",
        slug: "scholarship",
        fields: ["description", "eligibility", "required_documents", "scholarship_amount", "application_process", "financial_assistance"],
    },
    {
        title: "Institution Cutoffs",
        slug: "institute-cutoffs",
        fields: ["institution_name", "exam_name", "year_wise_cutoffs", "notes"],
    },
];

function emptyProviderForm(): ProviderForm {
    return {
        id: null,
        name: "Open AI",
        base_url: "https://api.openai.com",
        model_name: "gpt-4o-mini",
        token: "",
        is_active: true,
    };
}

function maskSecret(value?: string | null) {
    if (!value) return "No API key saved";
    if (value.length <= 8) return "Saved API key";
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export default function AiSettingsPage() {
    const { isReady } = useAdminGuard();
    const { accessToken, user } = useAuthStore();
    const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

    const [activeTab, setActiveTab] = useState<SettingsTab>("api");
    const [providers, setProviders] = useState<AiProviderRow[]>([]);
    const [providerForm, setProviderForm] = useState<ProviderForm>(emptyProviderForm());
    const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const isPlatformAiAdmin = isPlatformAdminUser(user) || hasPermission(user, "settings.ai.view");
    const institutionAiMemberships = useMemo(
        () => user?.memberships?.filter((membership) =>
            hasPermission(user, "institution.ai_settings.view", { institutionId: membership.institution_id })
        ) ?? [],
        [user]
    );
    const selectedInstitution = useMemo(
        () => institutionAiMemberships.find((membership) => String(membership.institution_id) === selectedInstitutionId) ?? institutionAiMemberships[0] ?? null,
        [institutionAiMemberships, selectedInstitutionId]
    );
    const effectiveSelectedInstitutionId = selectedInstitution ? String(selectedInstitution.institution_id) : "";
    const canManageSettings = isPlatformAiAdmin
        ? hasPermission(user, "settings.ai.edit") || isPlatformAdminUser(user)
        : Boolean(selectedInstitution && hasPermission(user, "institution.ai_settings.manage", {
            institutionId: selectedInstitution.institution_id,
        }));
    const settingsScopeLabel = isPlatformAiAdmin
        ? "Platform provider"
        : `${selectedInstitution?.institution_name ?? "Institution"} provider`;

    const activeProvider = useMemo(() => {
        if (isPlatformAiAdmin) {
            const platformProviders = providers.filter((provider) =>
                (provider.provider_scope ?? "platform") === "platform" && !provider.institution_id
            );
            return platformProviders.find((provider) => provider.is_active) ?? platformProviders[0] ?? providers[0] ?? null;
        }

        const selectedId = Number(selectedInstitution?.institution_id);
        const institutionProviders = selectedId
            ? providers.filter((provider) => Number(provider.institution_id) === selectedId)
            : providers;
        return institutionProviders.find((provider) => provider.is_active) ?? institutionProviders[0] ?? null;
    }, [isPlatformAiAdmin, providers, selectedInstitution?.institution_id]);

    const fetchProviders = useCallback(async () => {
        if (!accessToken) return;
        if (!isPlatformAiAdmin && !effectiveSelectedInstitutionId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const query = !isPlatformAiAdmin && effectiveSelectedInstitutionId
                ? `?institutionId=${encodeURIComponent(effectiveSelectedInstitutionId)}`
                : "";
            const res = await fetch(`/api/admin/ai/providers${query}`, { headers: authHeader });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error ?? "Failed to load AI provider");
                return;
            }

            const nextProviders = (json.data ?? []) as AiProviderRow[];
            setProviders(nextProviders);
            const scopedProviders = isPlatformAiAdmin
                ? nextProviders.filter((item) => (item.provider_scope ?? "platform") === "platform" && !item.institution_id)
                : nextProviders.filter((item) => Number(item.institution_id) === Number(effectiveSelectedInstitutionId));
            const provider = scopedProviders.find((item) => item.is_active) ?? scopedProviders[0] ?? nextProviders[0];
            if (provider) {
                setProviderForm({
                    id: provider.id,
                    name: provider.name,
                    base_url: provider.base_url,
                    model_name: provider.model_name || "",
                    token: provider.token || "",
                    is_active: provider.is_active,
                });
            } else {
                setProviderForm(emptyProviderForm());
            }
        } catch {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    }, [accessToken, authHeader, effectiveSelectedInstitutionId, isPlatformAiAdmin]);

    useEffect(() => {
        if (!isReady) return;
        const timeoutId = window.setTimeout(() => {
            void fetchProviders();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [fetchProviders, isReady]);

    const saveProvider = async () => {
        if (!providerForm.name.trim()) {
            toast.error("Provider name is required");
            return;
        }
        if (!providerForm.base_url.trim()) {
            toast.error("Base URL is required");
            return;
        }
        if (!providerForm.token.trim()) {
            toast.error("API key is required");
            return;
        }
        if (!canManageSettings) {
            toast.error("You can view AI settings, but you do not have permission to save changes.");
            return;
        }
        if (!isPlatformAiAdmin && !selectedInstitution) {
            toast.error("Select an institution first.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: providerForm.name.trim(),
                slug: slugify(providerForm.name),
                base_url: providerForm.base_url.trim(),
                model_name: providerForm.model_name.trim() || null,
                token: providerForm.token.trim(),
                is_active: providerForm.is_active,
                institutionId: isPlatformAiAdmin ? undefined : selectedInstitution.institution_id,
            };
            const url = providerForm.id ? `/api/admin/ai/providers/${providerForm.id}` : "/api/admin/ai/providers";
            const method = providerForm.id ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error ?? "Failed to save API settings");
                return;
            }

            toast.success(isPlatformAiAdmin ? "Platform AI API settings saved" : "Institution AI API settings saved");
            await fetchProviders();
        } catch {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    if (!isReady) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Sparkles className="size-4 text-primary" />
                        AI engine controls
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">AI Settings</h1>
                        <p className="text-sm text-muted-foreground">
                            {isPlatformAiAdmin
                                ? "Add the platform fallback API key for platform-managed generation."
                                : "Add your institution API key. Institution generation uses this saved key only."}
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchProviders} className="w-fit gap-2">
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Refresh
                </Button>
            </div>

            <div className="flex flex-wrap gap-2">
                {[
                    { key: "api" as const, label: "API Key" },
                    { key: "templates" as const, label: "Default Templates" },
                ].map((tab) => (
                    <Button
                        key={tab.key}
                        type="button"
                        variant={activeTab === tab.key ? "default" : "outline"}
                        onClick={() => setActiveTab(tab.key)}
                        className="rounded-lg"
                    >
                        {tab.label}
                    </Button>
                ))}
            </div>

            {activeTab === "api" ? (
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <CardTitle>API Key</CardTitle>
                                <CardDescription>
                                    {isPlatformAiAdmin
                                        ? "Save the fallback provider key used when an institution has no active key."
                                        : "Save the provider key used only for your institution."}
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="w-fit">{settingsScopeLabel}</Badge>
                                <Badge variant={activeProvider?.is_active ? "default" : "secondary"} className="w-fit gap-1">
                                    <CheckCircle2 className="size-3" />
                                    {activeProvider?.is_active ? "Active" : "Not configured"}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    {loading ? (
                        <CardContent className="space-y-5">
                            {!isPlatformAiAdmin ? (
                                <div className="max-w-xl space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-3 w-72 max-w-full" />
                                </div>
                            ) : null}
                            <div className="grid gap-4 md:grid-cols-2">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <div key={index} className="space-y-2">
                                        <Skeleton className="h-4 w-28" />
                                        <Skeleton className="h-10 w-full" />
                                        {index === 3 ? <Skeleton className="h-3 w-36" /> : null}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-3">
                                <Skeleton className="size-5 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-56" />
                                    <Skeleton className="h-3 w-96 max-w-full" />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Skeleton className="h-10 w-32 rounded-lg" />
                                <Skeleton className="h-10 w-20 rounded-lg" />
                            </div>
                        </CardContent>
                    ) : (
                        <CardContent className="space-y-5">
                        {!isPlatformAiAdmin ? (
                            <div className="max-w-xl space-y-2">
                                <Label htmlFor="ai-provider-institution">Institution</Label>
                                <Select
                                    value={effectiveSelectedInstitutionId}
                                    onValueChange={(value) => {
                                        setSelectedInstitutionId(value);
                                        setProviders([]);
                                        setProviderForm(emptyProviderForm());
                                    }}
                                >
                                    <SelectTrigger id="ai-provider-institution" className="w-full">
                                        <SelectValue placeholder="Select institution" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {institutionAiMemberships.map((membership) => (
                                            <SelectItem key={membership.institution_id} value={String(membership.institution_id)}>
                                                {membership.institution_name ?? `Institution ${membership.institution_id}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    The saved key is used only when generating AI content for the selected institution.
                                </p>
                            </div>
                        ) : null}

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="ai-provider-name">Provider name</Label>
                                <Input
                                    id="ai-provider-name"
                                    value={providerForm.name}
                                    disabled={!canManageSettings}
                                    onChange={(event) => setProviderForm((current) => ({ ...current, name: event.target.value }))}
                                    placeholder="Open AI"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ai-provider-model">Model</Label>
                                <Input
                                    id="ai-provider-model"
                                    value={providerForm.model_name}
                                    disabled={!canManageSettings}
                                    onChange={(event) => setProviderForm((current) => ({ ...current, model_name: event.target.value }))}
                                    placeholder="gpt-4o-mini"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ai-provider-base-url">Base URL</Label>
                                <Input
                                    id="ai-provider-base-url"
                                    value={providerForm.base_url}
                                    disabled={!canManageSettings}
                                    onChange={(event) => setProviderForm((current) => ({ ...current, base_url: event.target.value }))}
                                    placeholder="https://api.openai.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ai-provider-key">API key</Label>
                                <Input
                                    id="ai-provider-key"
                                    type="password"
                                    value={providerForm.token}
                                    disabled={!canManageSettings}
                                    onChange={(event) => setProviderForm((current) => ({ ...current, token: event.target.value }))}
                                    placeholder="Paste API key"
                                />
                                <p className="text-xs text-muted-foreground">{maskSecret(activeProvider?.token)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-3">
                            <Checkbox
                                checked={providerForm.is_active}
                                disabled={!canManageSettings}
                                onCheckedChange={(checked) => setProviderForm((current) => ({ ...current, is_active: Boolean(checked) }))}
                            />
                            <div>
                                <div className="text-sm font-medium">Use this provider for AI generation</div>
                                <div className="text-xs text-muted-foreground">
                                    {isPlatformAiAdmin
                                        ? "Used as the fallback key when an institution has no active provider."
                                        : "Generation screens for your institution will use this saved key only."}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button onClick={saveProvider} disabled={saving || !canManageSettings} className="gap-2">
                                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                Save API Key
                            </Button>
                            <Button variant="outline" onClick={() => setProviderForm(emptyProviderForm())} disabled={!canManageSettings}>
                                Reset
                            </Button>
                        </div>
                        {!canManageSettings ? (
                            <p className="text-sm text-muted-foreground">
                                You have view access only. Ask a platform admin to grant Manage AI Settings for this institution.
                            </p>
                        ) : null}
                    </CardContent>
                    )}
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Default Templates</CardTitle>
                        <CardDescription>These templates are hard coded and used automatically during generation.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 lg:grid-cols-3">
                        {builtInTemplates.map((template) => (
                            <div key={template.slug} className="rounded-lg border bg-muted/20 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-semibold">{template.title}</h3>
                                        <p className="text-xs text-muted-foreground">{template.slug}</p>
                                    </div>
                                    <Badge variant="outline">Built in</Badge>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {template.fields.map((field) => (
                                        <span
                                            key={field}
                                            className={cn(
                                                "rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground",
                                                field === "description" && "text-foreground"
                                            )}
                                        >
                                            {field}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <KeyRound className="size-4" />
                        Generation Flow
                    </CardTitle>
                    <CardDescription>Scholarship generation now uses a default prompt every time.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        readOnly
                        rows={5}
                        value={[
                            "Scholarship default output:",
                            "description, eligibility, required_documents, scholarship_amount, application_process, financial_assistance.",
                            "",
                            "Admins only need to save the API key. No template table setup is required.",
                        ].join("\n")}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
