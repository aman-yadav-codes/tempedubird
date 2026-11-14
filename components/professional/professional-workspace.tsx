"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Briefcase,
  User,
  GraduationCap,
  Award,
  Image as ImageIcon,
  Clock,
  MapPin,
  Star,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Phone,
  Mail,
  Globe,
  Save,
  Send,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ProfessionalWorkspace() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);

  // Sub-modules
  const [services, setServices] = useState<any[]>([]);
  const [masterServices, setMasterServices] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Dialogs
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [qualModalOpen, setQualModalOpen] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [replyTextMap, setReplyTextMap] = useState<Record<number, string>>({});

  // Forms
  const [serviceForm, setServiceForm] = useState({
    masterServiceId: "",
    customTitle: "",
    customDescription: "",
    hourlyRate: "",
    fixedPrice: "",
    pricingModel: "hourly",
    isAvailable: true,
  });

  const [qualForm, setQualForm] = useState({
    degree: "",
    institution: "",
    year: "",
  });

  const [certForm, setCertForm] = useState({
    title: "",
    licenseNumber: "",
    authority: "",
    year: "",
  });

  // Load Professional Profile
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/professional/profile");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load professional profile");
      setProfile(data.profile);
    } catch (err: any) {
      toast.error(err.message || "Failed to load professional profile");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Categories
  useEffect(() => {
    fetch("/api/admin/categories?type=professional")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Load Sub-modules
  const loadSubModules = useCallback(async () => {
    try {
      const sRes = await fetch("/api/professional/services");
      if (sRes.ok) {
        const sData = await sRes.json();
        setServices(sData.services || []);
        setMasterServices(sData.masterCatalog || []);
      }

      const eRes = await fetch("/api/professional/enquiries");
      if (eRes.ok) {
        const eData = await eRes.json();
        setEnquiries(eData.enquiries || []);
      }

      const rRes = await fetch("/api/professional/reviews");
      if (rRes.ok) {
        const rData = await rRes.json();
        setReviews(rData.reviews || []);
      }
    } catch (err) {
      console.error("Error loading professional sub-modules", err);
    }
  }, []);

  useEffect(() => {
    if (profile?.id) {
      loadSubModules();
    }
  }, [profile?.id, loadSubModules]);

  // Save Professional Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      setSaving(true);
      const res = await fetch("/api/professional/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update professional profile");
      toast.success("Professional profile saved successfully");
      loadProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Save Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    try {
      const payload = {
        id: editingService?.id || null,
        masterServiceId: serviceForm.masterServiceId || null,
        customTitle: serviceForm.customTitle,
        customDescription: serviceForm.customDescription,
        hourlyRate: Number(serviceForm.hourlyRate || 0),
        fixedPrice: Number(serviceForm.fixedPrice || 0),
        pricingModel: serviceForm.pricingModel,
        isAvailable: serviceForm.isAvailable,
      };

      const res = await fetch("/api/professional/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save service");

      toast.success(editingService ? "Service updated" : "Service added");
      setServiceModalOpen(false);
      setEditingService(null);
      loadSubModules();
    } catch (err: any) {
      toast.error(err.message || "Failed to save service");
    }
  };

  // Delete Service
  const handleDeleteService = async (sId: number) => {
    if (!confirm("Are you sure you want to remove this service?")) return;
    try {
      const res = await fetch(`/api/professional/services?id=${sId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete service");
      toast.success("Service removed");
      loadSubModules();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Add Qualification
  const handleAddQualification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qualForm.degree.trim()) return;
    const current = Array.isArray(profile.qualifications) ? [...profile.qualifications] : [];
    current.push({ ...qualForm, id: Date.now() });
    setProfile({ ...profile, qualifications: current });
    setQualModalOpen(false);
    setQualForm({ degree: "", institution: "", year: "" });
    toast.success("Qualification added to draft. Click Save Changes to save.");
  };

  const handleRemoveQualification = (index: number) => {
    const current = Array.isArray(profile.qualifications) ? [...profile.qualifications] : [];
    current.splice(index, 1);
    setProfile({ ...profile, qualifications: current });
  };

  // Add Certification
  const handleAddCertification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certForm.title.trim()) return;
    const current = Array.isArray(profile.certifications) ? [...profile.certifications] : [];
    current.push({ ...certForm, id: Date.now() });
    setProfile({ ...profile, certifications: current });
    setCertModalOpen(false);
    setCertForm({ title: "", licenseNumber: "", authority: "", year: "" });
    toast.success("Certification added to draft. Click Save Changes to save.");
  };

  const handleRemoveCertification = (index: number) => {
    const current = Array.isArray(profile.certifications) ? [...profile.certifications] : [];
    current.splice(index, 1);
    setProfile({ ...profile, certifications: current });
  };

  // Update Enquiry Status
  const handleUpdateEnquiryStatus = async (eId: number, status: string) => {
    try {
      const res = await fetch("/api/professional/enquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eId, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Enquiry marked as ${status}`);
      loadSubModules();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Review Reply
  const handleReplyReview = async (reviewId: number) => {
    const text = replyTextMap[reviewId]?.trim();
    if (!text) {
      toast.error("Please enter a reply message");
      return;
    }
    try {
      const res = await fetch("/api/professional/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, reply: text }),
      });
      if (!res.ok) throw new Error("Failed to post reply");
      toast.success("Reply published successfully");
      setReplyTextMap((prev) => ({ ...prev, [reviewId]: "" }));
      loadSubModules();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="p-8 text-center">
        <Briefcase className="size-12 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-bold">No Professional Profile Found</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          You haven&apos;t created an individual professional profile yet (e.g. Lawyer, Doctor, Accountant, Consultant).
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{profile.name}</h2>
            {profile.is_verified && (
              <Badge className="bg-emerald-600 text-white gap-1">
                <CheckCircle2 className="size-3" /> Verified Provider
              </Badge>
            )}
            {profile.professional_title && (
              <Badge variant="outline" className="text-primary border-primary">
                {profile.professional_title}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profile.city ? `${profile.city}, ` : ""}{profile.country_code || "India"} • {profile.experience_years || 0} Years Experience • {services.length} Services • {enquiries.length} Enquiries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`/explore?type=professional&q=${encodeURIComponent(profile.name)}`, "_blank")}
          >
            <ExternalLink className="size-3.5 mr-1.5" />
            View Profile Page
          </Button>

          <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="bg-primary text-white">
            {saving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Save className="size-3.5 mr-1.5" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="profile" className="text-xs gap-1.5">
            <User className="size-3.5" /> Profile & Contact
          </TabsTrigger>
          <TabsTrigger value="qualifications" className="text-xs gap-1.5">
            <GraduationCap className="size-3.5" /> Qualifications & Licenses
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="text-xs gap-1.5">
            <ImageIcon className="size-3.5" /> Portfolio Samples
          </TabsTrigger>
          <TabsTrigger value="services" className="text-xs gap-1.5">
            <Briefcase className="size-3.5" /> Services & Rates ({services.length})
          </TabsTrigger>
          <TabsTrigger value="availability" className="text-xs gap-1.5">
            <Clock className="size-3.5" /> Availability & Hours
          </TabsTrigger>
          <TabsTrigger value="enquiries" className="text-xs gap-1.5">
            <MessageSquare className="size-3.5" /> Client Inquiries ({enquiries.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs gap-1.5">
            <Star className="size-3.5" /> Ratings & Reviews ({reviews.length})
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: PROFILE & BIO ================= */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Professional Profile Details</CardTitle>
              <CardDescription className="text-xs">
                Your individual professional credentials, practice title, and contact methods.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Full Name *</Label>
                  <Input
                    required
                    value={profile.name || ""}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Professional Title *</Label>
                  <Input
                    placeholder="e.g. Senior Corporate Lawyer, Tax Consultant"
                    value={profile.professional_title || ""}
                    onChange={(e) => setProfile({ ...profile, professional_title: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Total Experience (Years)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 8"
                    value={profile.experience_years || ""}
                    onChange={(e) => setProfile({ ...profile, experience_years: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Category Classification</Label>
                  <Select
                    value={profile.category_id ? String(profile.category_id) : ""}
                    onValueChange={(val) => setProfile({ ...profile, category_id: Number(val) })}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue placeholder="Select Professional Category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Country</Label>
                  <Select
                    value={profile.country_code || "IN"}
                    onValueChange={(val) => setProfile({ ...profile, country_code: val })}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">India (+91)</SelectItem>
                      <SelectItem value="US">United States (+1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Introduction & Bio</Label>
                <Textarea
                  placeholder="Introduce yourself, your specialization, legal/medical/engineering background..."
                  value={profile.about || ""}
                  onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                  rows={4}
                  className="mt-1 text-xs"
                />
              </div>

              {/* Photos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-3">
                <div>
                  <Label className="text-xs font-semibold">Profile Photo (Avatar URL)</Label>
                  <Input
                    placeholder="https://example.com/photo.jpg"
                    value={profile.avatar_url || ""}
                    onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                  {profile.avatar_url && (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar Preview"
                      className="size-16 rounded-full object-cover border mt-2"
                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                    />
                  )}
                </div>
                <div>
                  <Label className="text-xs font-semibold">Cover Banner URL</Label>
                  <Input
                    placeholder="https://example.com/banner.jpg"
                    value={profile.banner_url || ""}
                    onChange={(e) => setProfile({ ...profile, banner_url: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                  {profile.banner_url && (
                    <img
                      src={profile.banner_url}
                      alt="Banner Preview"
                      className="h-16 w-full rounded object-cover border mt-2"
                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                    />
                  )}
                </div>
              </div>

              {/* Contact info */}
              <div className="border-t pt-3 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact & Direct Channels</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Phone className="size-3 text-emerald-600" /> Phone
                    </Label>
                    <Input
                      placeholder="+91 9876543210"
                      value={profile.phone || ""}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <MessageSquare className="size-3 text-emerald-600" /> WhatsApp
                    </Label>
                    <Input
                      placeholder="+91 9876543210"
                      value={profile.whatsapp || ""}
                      onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Mail className="size-3 text-blue-600" /> Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="pro@example.com"
                      value={profile.email || ""}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Globe className="size-3 text-indigo-600" /> Website / Portfolio
                    </Label>
                    <Input
                      placeholder="https://pro.com"
                      value={profile.website || ""}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">City</Label>
                    <Input
                      placeholder="e.g. Bangalore, Mumbai"
                      value={profile.city || ""}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">State / Region</Label>
                    <Input
                      placeholder="e.g. Karnataka"
                      value={profile.state || ""}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">PIN / ZIP Code</Label>
                    <Input
                      placeholder="e.g. 560001"
                      value={profile.postal_code || ""}
                      onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 2: QUALIFICATIONS & LICENSES ================= */}
        <TabsContent value="qualifications" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Educational Qualifications */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Qualifications & Degrees</CardTitle>
                  <CardDescription className="text-xs">Add your academic background and degrees.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setQualModalOpen(true)} className="h-7 text-xs">
                  <Plus className="size-3 mr-1" /> Add Degree
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.isArray(profile.qualifications) && profile.qualifications.length > 0 ? (
                  profile.qualifications.map((q: any, i: number) => (
                    <div key={i} className="border rounded p-2.5 text-xs flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-foreground">{q.degree}</h5>
                        <p className="text-muted-foreground">{q.institution} {q.year ? `(${q.year})` : ""}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 text-destructive"
                        onClick={() => handleRemoveQualification(i)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-6 text-center">No qualifications listed yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Certifications & Licenses */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Certifications & Licenses</CardTitle>
                  <CardDescription className="text-xs">Bar enrollment, medical licenses, certifications.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setCertModalOpen(true)} className="h-7 text-xs">
                  <Plus className="size-3 mr-1" /> Add License
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.isArray(profile.certifications) && profile.certifications.length > 0 ? (
                  profile.certifications.map((c: any, i: number) => (
                    <div key={i} className="border rounded p-2.5 text-xs flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-foreground">{c.title}</h5>
                        {c.licenseNumber && <p className="font-mono text-muted-foreground">Lic: {c.licenseNumber}</p>}
                        {c.authority && <p className="text-muted-foreground">Issued by: {c.authority}</p>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 text-destructive"
                        onClick={() => handleRemoveCertification(i)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-6 text-center">No licenses/certifications added yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================= TAB 3: PORTFOLIO ================= */}
        <TabsContent value="portfolio" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Portfolio & Work Samples</CardTitle>
                <CardDescription className="text-xs">Showcase images of completed work, court cases, projects, designs.</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  const url = prompt("Enter Portfolio Image URL:");
                  if (url?.trim()) {
                    const current = Array.isArray(profile.portfolio_images) ? [...profile.portfolio_images] : [];
                    current.push(url.trim());
                    setProfile({ ...profile, portfolio_images: current });
                    toast.success("Image added to portfolio. Click Save Changes to save.");
                  }
                }}
              >
                <Plus className="size-3 mr-1" /> Add Portfolio Sample
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {Array.isArray(profile.portfolio_images) && profile.portfolio_images.length > 0 ? (
                  profile.portfolio_images.map((img: string, i: number) => (
                    <div key={i} className="relative group rounded border overflow-hidden aspect-square bg-muted">
                      <img src={img} alt={`Portfolio ${i}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const current = [...profile.portfolio_images];
                          current.splice(i, 1);
                          setProfile({ ...profile, portfolio_images: current });
                        }}
                        className="absolute top-1 right-1 size-6 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-xs text-muted-foreground py-8 text-center">
                    No portfolio images added. Click <strong>+ Add Portfolio Sample</strong> above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 4: SERVICES & RATES ================= */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Professional Services & Pricing Models ({services.length})</CardTitle>
                <CardDescription className="text-xs">
                  Pick from master catalog or configure hourly rates, fixed fees, or consultation pricing.
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-primary text-white h-8 text-xs"
                onClick={() => {
                  setEditingService(null);
                  setServiceForm({
                    masterServiceId: "",
                    customTitle: "",
                    customDescription: "",
                    hourlyRate: "",
                    fixedPrice: "",
                    pricingModel: "hourly",
                    isAvailable: true,
                  });
                  setServiceModalOpen(true);
                }}
              >
                <Plus className="size-3.5 mr-1" /> Add Service
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30 font-semibold uppercase text-muted-foreground">
                      <th className="p-2">Service Title</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Pricing Model</th>
                      <th className="p-2 text-right">Rate / Price</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {services.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No services added yet. Click <strong>+ Add Service</strong> to specify your offerings.
                        </td>
                      </tr>
                    ) : (
                      services.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/20">
                          <td className="p-2 font-medium text-foreground">
                            {s.custom_title || s.master_title}
                            {s.custom_description && <p className="text-[10px] text-muted-foreground">{s.custom_description}</p>}
                          </td>
                          <td className="p-2 text-muted-foreground">{s.category_name || "General"}</td>
                          <td className="p-2 uppercase font-medium text-primary">
                            {s.pricing_model || "Hourly"}
                          </td>
                          <td className="p-2 text-right font-bold text-foreground">
                            {s.pricing_model === "hourly" ? `₹${s.hourly_rate} / hr` : `₹${s.fixed_price}`}
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant={s.is_available ? "default" : "secondary"}>
                              {s.is_available ? "Available" : "Unavailable"}
                            </Badge>
                          </td>
                          <td className="p-2 text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => {
                                setEditingService(s);
                                setServiceForm({
                                  masterServiceId: String(s.master_service_id || ""),
                                  customTitle: s.custom_title || "",
                                  customDescription: s.custom_description || "",
                                  hourlyRate: String(s.hourly_rate || ""),
                                  fixedPrice: String(s.fixed_price || ""),
                                  pricingModel: s.pricing_model || "hourly",
                                  isAvailable: s.is_available,
                                });
                                setServiceModalOpen(true);
                              }}
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive"
                              onClick={() => handleDeleteService(s.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 5: AVAILABILITY & HOURS ================= */}
        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Availability & Service Areas</CardTitle>
              <CardDescription className="text-xs">
                Configure remote consultation availability, on-site service areas, and working hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b pb-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remoteCheck"
                    checked={profile.remote_available !== false}
                    onChange={(e) => setProfile({ ...profile, remote_available: e.target.checked })}
                    className="size-4"
                  />
                  <div>
                    <label htmlFor="remoteCheck" className="font-semibold text-xs cursor-pointer">
                      Remote Consultations / Online Availability
                    </label>
                    <p className="text-[11px] text-muted-foreground">Available for video calls, phone consultations, and remote delivery.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="onsiteCheck"
                    checked={profile.onsite_available !== false}
                    onChange={(e) => setProfile({ ...profile, onsite_available: e.target.checked })}
                    className="size-4"
                  />
                  <div>
                    <label htmlFor="onsiteCheck" className="font-semibold text-xs cursor-pointer">
                      On-Site / In-Person Visits Availability
                    </label>
                    <p className="text-[11px] text-muted-foreground">Available to visit client location, office, or court in-person.</p>
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Weekly Working Hours</h4>
                {DAYS_OF_WEEK.map((day) => {
                  const hours = (profile.working_hours && typeof profile.working_hours === "object") ? profile.working_hours[day] || {} : {};
                  return (
                    <div key={day} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                      <span className="w-24 font-medium">{day}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!hours.isClosed}
                          onChange={(e) => {
                            const newHours = { ...(profile.working_hours || {}) };
                            newHours[day] = { ...(newHours[day] || {}), isClosed: !e.target.checked };
                            setProfile({ ...profile, working_hours: newHours });
                          }}
                          className="size-3.5"
                        />
                        <span>Available</span>
                        {!hours.isClosed ? (
                          <>
                            <Input
                              type="time"
                              value={hours.open || "09:00"}
                              onChange={(e) => {
                                const newHours = { ...(profile.working_hours || {}) };
                                newHours[day] = { ...(newHours[day] || {}), open: e.target.value };
                                setProfile({ ...profile, working_hours: newHours });
                              }}
                              className="h-7 w-24 text-xs"
                            />
                            <span>to</span>
                            <Input
                              type="time"
                              value={hours.close || "18:00"}
                              onChange={(e) => {
                                const newHours = { ...(profile.working_hours || {}) };
                                newHours[day] = { ...(newHours[day] || {}), close: e.target.value };
                                setProfile({ ...profile, working_hours: newHours });
                              }}
                              className="h-7 w-24 text-xs"
                            />
                          </>
                        ) : (
                          <span className="text-rose-600 font-semibold px-2">Off</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 6: CLIENT ENQUIRIES ================= */}
        <TabsContent value="enquiries" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Client Inquiries & Booking Requests</CardTitle>
              <CardDescription className="text-xs">
                Inquiries and consultation requests sent by clients viewing your professional profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {enquiries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">No client inquiries received yet.</p>
              ) : (
                enquiries.map((enq) => (
                  <div key={enq.id} className="border rounded-lg p-3 text-xs space-y-2 bg-muted/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-sm text-foreground">{enq.customer_name}</span>
                        <div className="flex items-center gap-3 text-muted-foreground text-[11px] mt-0.5">
                          {enq.customer_phone && <span className="flex items-center gap-1"><Phone className="size-3" /> {enq.customer_phone}</span>}
                          {enq.customer_email && <span className="flex items-center gap-1"><Mail className="size-3" /> {enq.customer_email}</span>}
                        </div>
                      </div>
                      <Select
                        value={enq.status || "new"}
                        onValueChange={(val) => handleUpdateEnquiryStatus(enq.id, val)}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="responded">Responded</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <p className="bg-background rounded p-2 text-foreground border">{enq.message}</p>

                    <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
                      <span>Received: {new Date(enq.created_at).toLocaleString()}</span>
                      {enq.customer_phone && (
                        <div className="flex gap-2">
                          <a
                            href={`https://wa.me/${enq.customer_phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:underline flex items-center gap-1"
                          >
                            <MessageSquare className="size-3" /> WhatsApp Client
                          </a>
                          <a
                            href={`tel:${enq.customer_phone}`}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <Phone className="size-3" /> Call
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 7: REVIEWS ================= */}
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Client Reviews & Testimonials</CardTitle>
              <CardDescription className="text-xs">
                Client feedback and ratings. Reply directly to client reviews.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">No reviews submitted yet.</p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="border rounded-lg p-3 text-xs space-y-2 bg-muted/10">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{rev.author_name}</span>
                        <div className="flex text-amber-500">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`size-3.5 ${idx < rev.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {rev.title && <h5 className="font-semibold text-foreground">{rev.title}</h5>}
                    <p className="text-muted-foreground">{rev.comment}</p>

                    {/* Reply */}
                    {rev.reply ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded p-2 text-xs">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300">Your Response:</span>
                        <p className="mt-0.5 text-foreground">{rev.reply}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-2">
                        <Input
                          placeholder="Write a response to this client review..."
                          value={replyTextMap[rev.id] || ""}
                          onChange={(e) => setReplyTextMap({ ...replyTextMap, [rev.id]: e.target.value })}
                          className="h-8 text-xs flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleReplyReview(rev.id)}
                          className="h-8 text-xs bg-primary text-white"
                        >
                          <Send className="size-3 mr-1" /> Reply
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================= ADD SERVICE MODAL ================= */}
      <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Professional Service" : "Add Service from Master Catalog"}</DialogTitle>
            <DialogDescription>Configure custom service rates and pricing models.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveService} className="space-y-3 text-xs">
            {!editingService && (
              <div>
                <Label className="text-xs font-semibold">Select Master Service</Label>
                <Select
                  value={serviceForm.masterServiceId}
                  onValueChange={(val) => {
                    const ms = masterServices.find((s) => String(s.id) === val);
                    if (ms) {
                      setServiceForm({
                        ...serviceForm,
                        masterServiceId: val,
                        customTitle: ms.title || "",
                        customDescription: ms.description || "",
                        hourlyRate: String(ms.suggested_price_inr || ""),
                        fixedPrice: String(ms.suggested_price_inr || ""),
                      });
                    } else {
                      setServiceForm({ ...serviceForm, masterServiceId: val });
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Choose from catalog..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">+ Custom Service (Not in catalog)</SelectItem>
                    {masterServices.map((ms) => (
                      <SelectItem key={ms.id} value={String(ms.id)}>
                        {ms.title} - Suggested ₹{ms.suggested_price_inr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold">Service Title *</Label>
              <Input
                required
                value={serviceForm.customTitle}
                onChange={(e) => setServiceForm({ ...serviceForm, customTitle: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Pricing Model</Label>
              <Select
                value={serviceForm.pricingModel}
                onValueChange={(val) => setServiceForm({ ...serviceForm, pricingModel: val })}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly Rate (₹/hr)</SelectItem>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="consultation">Consultation Fee</SelectItem>
                  <SelectItem value="project">Project-based / Quote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Hourly Rate (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1500"
                  value={serviceForm.hourlyRate}
                  onChange={(e) => setServiceForm({ ...serviceForm, hourlyRate: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Fixed / Base Price (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={serviceForm.fixedPrice}
                  onChange={(e) => setServiceForm({ ...serviceForm, fixedPrice: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Service Description</Label>
              <Textarea
                placeholder="Details about consultation, deliverables, turnaround..."
                value={serviceForm.customDescription}
                onChange={(e) => setServiceForm({ ...serviceForm, customDescription: e.target.value })}
                rows={2}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setServiceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-white">
                Save Service
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= ADD DEGREE MODAL ================= */}
      <Dialog open={qualModalOpen} onOpenChange={setQualModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Qualification / Degree</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddQualification} className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-semibold">Degree / Qualification *</Label>
              <Input
                required
                placeholder="e.g. LLB, MBBS, B.Tech, CA, MBA"
                value={qualForm.degree}
                onChange={(e) => setQualForm({ ...qualForm, degree: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">University / College</Label>
              <Input
                placeholder="e.g. National Law School, AIIMS, IIT"
                value={qualForm.institution}
                onChange={(e) => setQualForm({ ...qualForm, institution: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Year of Passing</Label>
              <Input
                placeholder="e.g. 2016"
                value={qualForm.year}
                onChange={(e) => setQualForm({ ...qualForm, year: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setQualModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">Add Degree</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= ADD LICENSE MODAL ================= */}
      <Dialog open={certModalOpen} onOpenChange={setCertModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add License / Certification</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCertification} className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-semibold">Certification / License Title *</Label>
              <Input
                required
                placeholder="e.g. Bar Council Advocate License, Chartered Accountant Membership"
                value={certForm.title}
                onChange={(e) => setCertForm({ ...certForm, title: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">License / Registration Number</Label>
              <Input
                placeholder="e.g. D/1234/2018"
                value={certForm.licenseNumber}
                onChange={(e) => setCertForm({ ...certForm, licenseNumber: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Issuing Board / Authority</Label>
              <Input
                placeholder="e.g. Bar Council of India, ICAI, Medical Council"
                value={certForm.authority}
                onChange={(e) => setCertForm({ ...certForm, authority: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCertModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">Add License</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

