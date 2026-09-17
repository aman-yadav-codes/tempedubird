"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  MapPin,
  BookOpen,
  HelpCircle,
  Sparkles,
  Layers,
  Globe,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Building,
  Check,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export type ListingSeoItem = {
  id: number;
  listing_type: string;
  city: string;
  area: string;
  course: string;
  slug?: string;
  page_title?: string;
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];
  h1_heading?: string;
  subheading?: string;
  intro_content?: string;
  bottom_content?: string;
  quick_highlights?: string[];
  faqs?: { question: string; answer: string }[];
  canonical_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function ListingSeoManagementPage() {
  const [items, setItems] = useState<ListingSeoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ListingSeoItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("targeting");

  // Form State
  const [formType, setFormType] = useState("institutes");
  const [formCity, setFormCity] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formCourse, setFormCourse] = useState("");
  const [formMetaTitle, setFormMetaTitle] = useState("");
  const [formMetaDesc, setFormMetaDesc] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formH1, setFormH1] = useState("");
  const [formSubheading, setFormSubheading] = useState("");
  const [formIntroContent, setFormIntroContent] = useState("");
  const [formBottomContent, setFormBottomContent] = useState("");
  const [formCanonicalUrl, setFormCanonicalUrl] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Highlights state
  const [highlightsList, setHighlightsList] = useState<string[]>([]);
  const [newHighlight, setNewHighlight] = useState("");

  // FAQs state
  const [faqsList, setFaqsList] = useState<{ question: string; answer: string }[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/marketing/listing-seo");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
      }
    } catch (err: any) {
      toast.error("Failed to load listing SEO configurations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormType("institutes");
    setFormCity("");
    setFormArea("");
    setFormCourse("");
    setFormMetaTitle("");
    setFormMetaDesc("");
    setFormKeywords("");
    setFormH1("");
    setFormSubheading("");
    setFormIntroContent("");
    setFormBottomContent("");
    setFormCanonicalUrl("");
    setFormIsActive(true);
    setHighlightsList([
      "Verified Institutes & Faculty",
      "Comprehensive Doubt Sessions",
      "Flexible Batches & Hostel Info"
    ]);
    setFaqsList([]);
    setActiveTab("targeting");
    setDialogOpen(true);
  };

  const openEditModal = (item: ListingSeoItem) => {
    setEditingItem(item);
    setFormType(item.listing_type || "institutes");
    setFormCity(item.city || "");
    setFormArea(item.area === "all" ? "" : item.area || "");
    setFormCourse(item.course === "all" ? "" : item.course || "");
    setFormMetaTitle(item.meta_title || "");
    setFormMetaDesc(item.meta_description || "");
    setFormKeywords(Array.isArray(item.keywords) ? item.keywords.join(", ") : "");
    setFormH1(item.h1_heading || "");
    setFormSubheading(item.subheading || "");
    setFormIntroContent(item.intro_content || "");
    setFormBottomContent(item.bottom_content || "");
    setFormCanonicalUrl(item.canonical_url || "");
    setFormIsActive(item.is_active !== false);
    
    let parsedHighlights: string[] = [];
    if (Array.isArray(item.quick_highlights)) {
      parsedHighlights = item.quick_highlights;
    } else if (typeof item.quick_highlights === "string") {
      try { parsedHighlights = JSON.parse(item.quick_highlights); } catch(e){}
    }
    setHighlightsList(parsedHighlights);

    let parsedFaqs: { question: string; answer: string }[] = [];
    if (Array.isArray(item.faqs)) {
      parsedFaqs = item.faqs;
    } else if (typeof item.faqs === "string") {
      try { parsedFaqs = JSON.parse(item.faqs); } catch(e){}
    }
    setFaqsList(parsedFaqs);

    setActiveTab("targeting");
    setDialogOpen(true);
  };

  const handleAddHighlight = () => {
    if (!newHighlight.trim()) return;
    setHighlightsList([...highlightsList, newHighlight.trim()]);
    setNewHighlight("");
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlightsList(highlightsList.filter((_, i) => i !== index));
  };

  const handleAddFaq = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error("Both question and answer are required");
      return;
    }
    setFaqsList([...faqsList, { question: newQuestion.trim(), answer: newAnswer.trim() }]);
    setNewQuestion("");
    setNewAnswer("");
  };

  const handleRemoveFaq = (index: number) => {
    setFaqsList(faqsList.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formCity.trim()) {
      toast.error("Please enter a Target City");
      setActiveTab("targeting");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        id: editingItem?.id,
        listing_type: formType,
        city: formCity.trim(),
        area: formArea.trim() || "all",
        course: formCourse.trim() || "all",
        meta_title: formMetaTitle.trim() || formH1.trim() || undefined,
        meta_description: formMetaDesc.trim() || undefined,
        keywords: formKeywords ? formKeywords.split(",").map(k => k.trim()).filter(Boolean) : [],
        h1_heading: formH1.trim() || `Best ${formCourse ? formCourse + ' ' : ''}Coaching in ${formArea ? formArea + ', ' : ''}${formCity}`,
        subheading: formSubheading.trim() || undefined,
        intro_content: formIntroContent.trim() || undefined,
        bottom_content: formBottomContent.trim() || undefined,
        quick_highlights: highlightsList,
        faqs: faqsList,
        canonical_url: formCanonicalUrl.trim() || undefined,
        is_active: formIsActive
      };

      const method = editingItem ? "PUT" : "POST";
      const res = await fetch("/api/admin/marketing/listing-seo", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingItem ? "Listing SEO page updated" : "Listing SEO page created successfully");
        setDialogOpen(false);
        fetchItems();
      } else {
        toast.error(data.error || "Failed to save configuration");
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this listing SEO configuration?")) return;
    try {
      const res = await fetch(`/api/admin/marketing/listing-seo?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Configuration deleted");
        setItems(items.filter(item => item.id !== id));
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch (err) {
      toast.error("Failed to delete item");
    }
  };

  const handleToggleStatus = async (item: ListingSeoItem) => {
    try {
      const updatedStatus = !item.is_active;
      const res = await fetch("/api/admin/marketing/listing-seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_active: updatedStatus })
      });
      const data = await res.json();
      if (data.success) {
        setItems(items.map(i => i.id === item.id ? { ...i, is_active: updatedStatus } : i));
        toast.success(`Page is now ${updatedStatus ? "Active" : "Draft"}`);
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // Distinct cities and courses for filter dropdowns
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.city) set.add(i.city); });
    return Array.from(set);
  }, [items]);

  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.course && i.course !== "all") set.add(i.course); });
    return Array.from(set);
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterCity !== "all" && item.city.toLowerCase() !== filterCity.toLowerCase()) return false;
      if (filterCourse !== "all" && item.course.toLowerCase() !== filterCourse.toLowerCase()) return false;
      if (filterType !== "all" && item.listing_type !== filterType) return false;
      if (filterStatus === "active" && !item.is_active) return false;
      if (filterStatus === "inactive" && item.is_active) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = [
          item.city,
          item.area,
          item.course,
          item.h1_heading,
          item.meta_title,
          item.meta_description
        ].filter(Boolean).join(" ").toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterCity, filterCourse, filterType, filterStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const citiesCount = new Set(items.map(i => i.city)).size;
    const coursesCount = new Set(items.map(i => i.course).filter(c => c !== "all")).size;
    let faqsCount = 0;
    items.forEach(i => {
      if (Array.isArray(i.faqs)) faqsCount += i.faqs.length;
      else if (typeof i.faqs === "string") {
        try { faqsCount += JSON.parse(i.faqs).length; } catch(e){}
      }
    });
    return {
      total: items.length,
      cities: citiesCount,
      courses: coursesCount,
      faqs: faqsCount
    };
  }, [items]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Listing Page SEO Management
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure organic SEO content, headings, meta tags, and FAQ schema tailored by City, Area, and Course.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchItems} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={openCreateModal} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Listing SEO Page
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total SEO Profiles</CardDescription>
            <CardTitle className="text-2xl font-black text-foreground">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Area / City / Course targeted landing configurations
          </CardContent>
        </Card>

        <Card className="border bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Target Cities Covered</CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.cities}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Metro and tier-2 coaching hub markets
          </CardContent>
        </Card>

        <Card className="border bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Courses Configured</CardDescription>
            <CardTitle className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.courses}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            NEET, IIT-JEE, UPSC, and specialized streams
          </CardContent>
        </Card>

        <Card className="border bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Active FAQs Published</CardDescription>
            <CardTitle className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.faqs}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Structured questions with rich snippet schema
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by city, area, course, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* City filter */}
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {availableCities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Course filter */}
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {availableCourses.map(course => (
                <SelectItem key={course} value={course}>{course}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Listing Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="institutes">Institutes</SelectItem>
              <SelectItem value="courses">Courses</SelectItem>
              <SelectItem value="teachers">Teachers</SelectItem>
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Drafts Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid of Profiles */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading listing SEO configurations...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed rounded-2xl bg-muted/20">
          <Globe className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-60" />
          <h3 className="text-lg font-semibold text-foreground">No Listing SEO Pages Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            {searchQuery || filterCity !== "all" || filterCourse !== "all"
              ? "Try clearing your filters or search terms to view all records."
              : "Create your first targeted SEO configuration for any city, area, and course combination."}
          </p>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Create Listing SEO Page
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            let highlightsCount = 0;
            if (Array.isArray(item.quick_highlights)) highlightsCount = item.quick_highlights.length;
            else if (typeof item.quick_highlights === "string") {
              try { highlightsCount = JSON.parse(item.quick_highlights).length; } catch(e){}
            }

            let faqsCount = 0;
            if (Array.isArray(item.faqs)) faqsCount = item.faqs.length;
            else if (typeof item.faqs === "string") {
              try { faqsCount = JSON.parse(item.faqs).length; } catch(e){}
            }

            const liveUrl = item.listing_type === "courses" 
              ? `/courses?course=${encodeURIComponent(item.course !== 'all' ? item.course : '')}`
              : `/institutes?location=${encodeURIComponent(item.city)}${item.course !== 'all' ? '&course=' + encodeURIComponent(item.course) : ''}`;

            return (
              <Card key={item.id} className="flex flex-col border shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 space-y-3">
                  {/* Targeting Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs capitalize">
                        {item.listing_type}
                      </Badge>
                      <Badge variant="secondary" className="font-semibold text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-rose-500" />
                        {item.city}
                        {item.area && item.area !== "all" && (
                          <span className="text-muted-foreground font-normal">({item.area})</span>
                        )}
                      </Badge>
                      {item.course && item.course !== "all" && (
                        <Badge variant="secondary" className="font-semibold text-xs flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                          <BookOpen className="h-3 w-3" />
                          {item.course}
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                        item.is_active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {item.is_active ? "Active" : "Draft"}
                    </button>
                  </div>

                  {/* Heading */}
                  <div>
                    <h3 className="font-bold text-base text-foreground line-clamp-1">
                      {item.h1_heading || item.meta_title || "Untitled SEO Page"}
                    </h3>
                    {item.subheading && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {item.subheading}
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pb-3 flex-1 space-y-2.5 text-xs">
                  {item.intro_content && (
                    <p className="text-muted-foreground line-clamp-3 bg-muted/30 p-2.5 rounded-lg italic">
                      "{item.intro_content}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground text-[11px]">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      {highlightsCount} Highlights
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground text-[11px]">
                      <HelpCircle className="h-3 w-3 text-purple-500" />
                      {faqsCount} FAQs
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t flex items-center justify-between gap-2 bg-muted/10">
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Preview Live
                  </a>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(item)}
                      className="h-8 px-2 text-xs"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {editingItem ? "Edit Listing Page SEO" : "Create Listing Page SEO Target"}
            </DialogTitle>
            <DialogDescription>
              Configure rich content, headings, meta tags, and FAQ schema targeted by City, Area, and Course.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="targeting">1. Targeting</TabsTrigger>
              <TabsTrigger value="meta">2. SEO & SERP</TabsTrigger>
              <TabsTrigger value="content">3. On-Page Text</TabsTrigger>
              <TabsTrigger value="faqs">4. FAQs & Badges</TabsTrigger>
            </TabsList>

            {/* Tab 1: Targeting */}
            <TabsContent value="targeting" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Listing Category</label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="institutes">Institutes Directory (/institutes)</SelectItem>
                      <SelectItem value="courses">Courses Catalog (/courses)</SelectItem>
                      <SelectItem value="teachers">Teachers Directory (/teachers)</SelectItem>
                      <SelectItem value="all">Universal (All Listings)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">The listing directory where this SEO content applies.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Target City <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Indore, Varanasi, Kota, Delhi"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Main metropolitan city or district name.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Area / Locality</label>
                  <Input
                    placeholder="e.g. Bhawarkua, Lanka, Sigra, Kothrud (or leave blank for City-wide)"
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Specific neighborhood, campus area, or zone.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Course / Stream</label>
                  <Input
                    placeholder="e.g. NEET, IIT-JEE, UPSC, CA (or leave blank for All Courses)"
                    value={formCourse}
                    onChange={(e) => setFormCourse(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Exam or course stream focus.</p>
                </div>
              </div>

              <div className="pt-2 border-t flex items-center justify-between">
                <label className="text-xs font-medium cursor-pointer flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  Publish Page as Active immediately
                </label>
              </div>
            </TabsContent>

            {/* Tab 2: SEO & SERP */}
            <TabsContent value="meta" className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-foreground">Meta Title</label>
                  <span className={`text-[11px] ${formMetaTitle.length > 60 ? "text-amber-500 font-semibold" : "text-muted-foreground"}`}>
                    {formMetaTitle.length}/60 chars recommended
                  </span>
                </div>
                <Input
                  placeholder="e.g. Best NEET Coaching in Bhawarkua, Indore (2026) - Fees & Reviews"
                  value={formMetaTitle}
                  onChange={(e) => setFormMetaTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-foreground">Meta Description</label>
                  <span className={`text-[11px] ${formMetaDesc.length > 160 ? "text-amber-500 font-semibold" : "text-muted-foreground"}`}>
                    {formMetaDesc.length}/160 chars recommended
                  </span>
                </div>
                <Textarea
                  rows={2}
                  placeholder="e.g. Compare top-rated NEET coaching centers in Bhawarkua, Indore. Check verified faculty, batch schedules, fees, and student reviews."
                  value={formMetaDesc}
                  onChange={(e) => setFormMetaDesc(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Target Keywords (Comma Separated)</label>
                <Input
                  placeholder="neet coaching indore, best medical institute bhawarkua, allen resonance indore"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                />
              </div>

              {/* SERP Google Preview Card */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Globe className="h-3.5 w-3.5" /> Google Search Preview (SERP)
                </div>
                <div className="bg-card p-3 rounded-lg border shadow-sm space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>https://edubird.in</span>
                    <span>›</span>
                    <span className="capitalize">{formType}</span>
                    <span>›</span>
                    <span>{formCity || "city"}</span>
                  </div>
                  <div className="text-base text-blue-600 dark:text-blue-400 font-medium hover:underline line-clamp-1 cursor-pointer">
                    {formMetaTitle || formH1 || "Best Coaching Institutes in India | EduBird"}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {formMetaDesc || "Explore verified coaching institutes, courses, faculty ratings, batch details, and student reviews across top locations."}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: On-Page Text */}
            <TabsContent value="content" className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Primary H1 Banner Heading</label>
                <Input
                  placeholder="e.g. Best NEET Coaching Institutes in Bhawarkua, Indore"
                  value={formH1}
                  onChange={(e) => setFormH1(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">The main hero title displayed at the top of the directory page.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Subheading / Lead Description</label>
                <Input
                  placeholder="e.g. Explore premier medical entrance training centers, expert biology faculty, and proven track records."
                  value={formSubheading}
                  onChange={(e) => setFormSubheading(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Top Overview / Intro Content</label>
                <Textarea
                  rows={3}
                  placeholder="Rich introductory paragraph explaining the coaching culture, student facilities, and top highlights in this location..."
                  value={formIntroContent}
                  onChange={(e) => setFormIntroContent(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Displays directly below the header banner for search engines and visitors.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Bottom Organic SEO Guide / Article (Markdown Supported)
                </label>
                <Textarea
                  rows={5}
                  placeholder="### How to Choose the Best Coaching in this Area...&#10;&#10;Detailed guide, fee structures, hostel recommendations, and admission test criteria for long-tail SEO ranking."
                  value={formBottomContent}
                  onChange={(e) => setFormBottomContent(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">In-depth buyer's guide rendered beneath the cards for Google search crawlers.</p>
              </div>
            </TabsContent>

            {/* Tab 4: FAQs & Badges */}
            <TabsContent value="faqs" className="space-y-4 pt-4">
              {/* Highlight Badges */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Quick Highlight Badges</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 50+ Verified Centers, Avg Fees: ₹65k - ₹1.2L"
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddHighlight(); } }}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddHighlight}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {highlightsList.map((hl, idx) => (
                    <Badge key={idx} variant="secondary" className="pr-1.5 flex items-center gap-1 text-xs">
                      <span>{hl}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHighlight(idx)}
                        className="hover:text-destructive ml-1"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* FAQs Builder */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Frequently Asked Questions (FAQ Schema)</label>
                  <span className="text-xs text-muted-foreground">{faqsList.length} FAQs configured</span>
                </div>

                <div className="space-y-2 bg-muted/20 p-3 rounded-lg border">
                  <Input
                    placeholder="Question: e.g. What are the average coaching fees in Bhawarkua?"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Answer: e.g. Coaching fees typically range between ₹65,000 to ₹1,20,000 per year..."
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button type="button" size="sm" variant="secondary" onClick={handleAddFaq}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add FAQ Item
                    </Button>
                  </div>
                </div>

                {/* FAQ List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {faqsList.map((faq, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border bg-card text-xs flex justify-between gap-2">
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground">Q: {faq.question}</div>
                        <div className="text-muted-foreground line-clamp-2">A: {faq.answer}</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFaq(idx)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Save Changes" : "Create SEO Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
