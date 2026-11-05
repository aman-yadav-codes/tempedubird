"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { setStoredActiveInstitutionId } from "@/lib/auth/active-institution";
import { Building2, Briefcase, Sparkles, Loader2 } from "lucide-react";

type InstitutionTypeOption = {
  id: number;
  name: string;
  slug: string;
};

interface CreateBusinessProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (institution: { id: number; name: string }) => void;
}

export function CreateBusinessProfileDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateBusinessProfileDialogProps) {
  const { user, accessToken } = useAuthStore();
  const [profileType, setProfileType] = useState<"business" | "professional">("business");
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [establishedYear, setEstablishedYear] = useState<string>("");
  const [about, setAbout] = useState("");
  const [types, setTypes] = useState<InstitutionTypeOption[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill user data when opened
  useEffect(() => {
    if (open) {
      if (user?.phone && !phone) setPhone(user.phone);
      if (user?.email && !email) setEmail(user.email);
    }
  }, [open, user]);

  // Fetch available institution types
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingTypes(true);

    fetch("/api/admin/institutions/create-business", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.data) && data.data.length > 0) {
          setTypes(data.data);
          // Default to Institute if available, else first type
          const instituteType = data.data.find((t: InstitutionTypeOption) =>
            t.slug?.toLowerCase().includes("institute") || t.name?.toLowerCase().includes("institute")
          );
          if (instituteType && !typeId) {
            setTypeId(String(instituteType.id));
          } else if (!typeId && data.data[0]) {
            setTypeId(String(data.data[0].id));
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load institution types:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingTypes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Please enter a business or organization name");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/institutions/create-business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          name: cleanName,
          institutionTypeId: typeId ? Number(typeId) : undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          website: website.trim() || undefined,
          city: city.trim() || undefined,
          about: about.trim() || undefined,
          establishedYear: establishedYear ? Number(establishedYear) : undefined,
          profileType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create profile");
      }

      const created = data.data;
      if (created?.id) {
        setStoredActiveInstitutionId(Number(created.id), {
          id: Number(created.id),
          name: created.name,
          roleName: "Institution Admin",
        });
      }

      toast.success(
        profileType === "business"
          ? "Business profile created successfully!"
          : "Professional profile created successfully!"
      );

      onOpenChange(false);
      if (onSuccess && created) {
        onSuccess(created);
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error creating profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {profileType === "business" ? (
                <Building2 className="size-5" />
              ) : (
                <Briefcase className="size-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Create {profileType === "business" ? "Business" : "Professional"} Profile
              </DialogTitle>
              <DialogDescription className="text-xs">
                Enter your organization details to activate your institution workspace.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Profile Type Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-lg">
          <button
            type="button"
            onClick={() => setProfileType("business")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              profileType === "business"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="size-3.5" />
            <span>Business Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setProfileType("professional")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              profileType === "professional"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="size-3.5" />
            <span>Professional Profile</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="business-name" className="text-xs font-semibold">
              {profileType === "business" ? "Business / Institution Name" : "Professional / Practice Name"}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="business-name"
              placeholder={
                profileType === "business"
                  ? "e.g., Apex Academy, Tech Solutions Pvt Ltd"
                  : "e.g., Dr. Sharma Clinics, John Consulting"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-sm"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="business-type" className="text-xs font-semibold">
                Organization Type <span className="text-destructive">*</span>
              </Label>
              <Select value={typeId} onValueChange={setTypeId} disabled={loadingTypes}>
                <SelectTrigger id="business-type" className="text-xs">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {types.length > 0 ? (
                    types.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                        {t.name}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="8" className="text-xs">Institute</SelectItem>
                      <SelectItem value="4" className="text-xs">College</SelectItem>
                      <SelectItem value="5" className="text-xs">School</SelectItem>
                      <SelectItem value="7" className="text-xs">University</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="est-year" className="text-xs font-semibold">
                Established Year <span className="text-muted-foreground text-[10px]">(Optional)</span>
              </Label>
              <Input
                id="est-year"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                placeholder="e.g., 2020"
                value={establishedYear}
                onChange={(e) => setEstablishedYear(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="business-phone" className="text-xs font-semibold">
                Official Phone <span className="text-muted-foreground text-[10px]">(Optional)</span>
              </Label>
              <Input
                id="business-phone"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="business-email" className="text-xs font-semibold">
                Official Email <span className="text-muted-foreground text-[10px]">(Optional)</span>
              </Label>
              <Input
                id="business-email"
                type="email"
                placeholder="contact@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="business-city" className="text-xs font-semibold">
                City / Location <span className="text-muted-foreground text-[10px]">(Optional)</span>
              </Label>
              <Input
                id="business-city"
                placeholder="e.g., Mumbai, New Delhi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="business-website" className="text-xs font-semibold">
                Website <span className="text-muted-foreground text-[10px]">(Optional)</span>
              </Label>
              <Input
                id="business-website"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="business-about" className="text-xs font-semibold">
              About / Description <span className="text-muted-foreground text-[10px]">(Optional)</span>
            </Label>
            <Textarea
              id="business-about"
              placeholder="Brief overview of services, mission, or specialization..."
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !name.trim()}
              className="text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  Create Profile
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
