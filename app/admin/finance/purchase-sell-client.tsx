"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  IndianRupee,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Trash2,
  UserCheck,
  X,
  XCircle,
  AlertCircle,
  Paperclip,
  TrendingDown,
  TrendingUp,
  Tag,
  Building2,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

export type RequestAttachment = {
  url: string;
  name: string;
  size?: number;
  type?: string;
};

export type PurchaseSellRequest = {
  id: number;
  request_number: string;
  scope_type: "institution" | "platform";
  institution_id: number | null;
  request_type: "purchase" | "sell";
  title: string;
  category: string | null;
  estimated_amount: number | string;
  quantity: number | string;
  unit: string;
  party_name: string | null;
  description: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachments?: RequestAttachment[];
  urgency: "low" | "medium" | "high" | "urgent";
  status: "pending" | "approved" | "rejected" | "cancelled";
  created_by: number;
  created_by_name: string | null;
  created_by_role: string | null;
  created_by_email: string | null;
  assigned_approver_id: number | null;
  assigned_approver_name: string | null;
  assigned_approver_role: string | null;
  matched_slab_id: number | null;
  matched_slab_label: string | null;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ApprovalSlab = {
  id: number;
  scope_type: "institution" | "platform";
  institution_id: number | null;
  min_amount: number | string;
  max_amount: number | string | null;
  responsible_user_id: number | null;
  responsible_user_name: string | null;
  responsible_user_role: string | null;
  label: string | null;
  is_active: boolean;
};

export type StaffOption = {
  id: number;
  name: string;
  role: string;
  email: string;
};

export function PurchaseSellRequestsClient() {
  const pathname = usePathname();
  const { user, accessToken } = useAuthStore();
  const { activeInstitutionId, activeInstitution, institutions } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);

  const isPlatformSection = Boolean(pathname?.startsWith("/platformadmin"));
  const isInstituteSection = Boolean(
    pathname?.startsWith("/instituteadmin") ||
    pathname?.startsWith("/institutionadmin") ||
    pathname?.startsWith("/institution") ||
    pathname?.startsWith("/staff")
  );

  const [serverOrgs, setServerOrgs] = useState<Array<{ id: number; name: string; count: number }>>([]);
  const canSwitchOrg =
    isPlatformAdmin ||
    serverOrgs.length > 1 ||
    (Array.isArray(institutions) && institutions.length > 1) ||
    Boolean(user?.memberships && user.memberships.length > 1);

  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>("auto");
  const [modalInstId, setModalInstId] = useState<string>("");

  const availableOrgs = useMemo(() => {
    const map = new Map<number, { id: number; name: string; count?: number }>();
    for (const org of serverOrgs) {
      map.set(org.id, org);
    }
    if (Array.isArray(institutions)) {
      for (const inst of institutions) {
        if (!map.has(inst.id)) {
          map.set(inst.id, { id: inst.id, name: inst.name, count: 0 });
        }
      }
    }
    return Array.from(map.values());
  }, [serverOrgs, institutions]);

  const totalOrgRequestsCount = useMemo(() => {
    return availableOrgs.reduce((acc, curr) => acc + (curr.count || 0), 0);
  }, [availableOrgs]);

  // Effective institution ID for querying and assigning
  const effectiveInstId: number | null = useMemo(() => {
    if (selectedOrgFilter === "platform" || selectedOrgFilter === "all") return null;
    if (selectedOrgFilter !== "auto") {
      const parsed = Number(selectedOrgFilter);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }
    if (isPlatformSection) return null;
    return activeInstitutionId ?? null;
  }, [selectedOrgFilter, isPlatformSection, activeInstitutionId]);

  // Is current view/operation for an institution or for platform?
  const isInstitutionScope = Boolean(effectiveInstId) || selectedOrgFilter === "all" || isInstituteSection || (!isPlatformAdmin && !isPlatformSection);
  const isPlatformScope = !isInstitutionScope;

  // The admin title MUST be strictly "Institution Admin" if institution login, or "Platform Admin" if platform admin login.
  const adminRoleLabel = isInstitutionScope ? "Institution Admin" : "Platform Admin";
  const adminDirectOption = `-- Direct to ${adminRoleLabel} --`;

  const currentOrgName = useMemo(() => {
    if (selectedOrgFilter === "all") return "All My Organizations";
    if (effectiveInstId) {
      const found = availableOrgs.find((i) => i.id === effectiveInstId);
      return found?.name || activeInstitution?.name || `Institution #${effectiveInstId}`;
    }
    return isInstitutionScope ? (activeInstitution?.name || "Institution") : "Platform Operations";
  }, [selectedOrgFilter, effectiveInstId, availableOrgs, activeInstitution, isInstitutionScope]);

  // When user is viewing an organization with 0 requests, check if another org has requests
  const otherOrgsWithRequests = useMemo(() => {
    return availableOrgs.filter((o) => {
      const cnt = o.count || 0;
      if (cnt <= 0) return false;
      if (selectedOrgFilter === "all") return false;
      if (selectedOrgFilter === "auto") {
        return o.id !== activeInstitutionId;
      }
      return String(o.id) !== selectedOrgFilter;
    });
  }, [availableOrgs, selectedOrgFilter, activeInstitutionId]);

  const targetInstitutionId = effectiveInstId ?? (activeInstitutionId ?? (availableOrgs[0]?.id ?? null));

  const [requests, setRequests] = useState<PurchaseSellRequest[]>([]);
  const [slabs, setSlabs] = useState<ApprovalSlab[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [metrics, setMetrics] = useState({
    total_count: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    total_purchase_amount: 0,
    total_sell_amount: 0,
    approved_purchase_amount: 0,
    approved_sell_amount: 0,
  });

  // Filter States
  const [typeFilter, setTypeFilter] = useState<"all" | "purchase" | "sell">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Request Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reqType, setReqType] = useState<"purchase" | "sell">("purchase");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Operational Equipment");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("units");
  const [partyName, setPartyName] = useState("");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [description, setDescription] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachments, setAttachments] = useState<RequestAttachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Review / Approval Action Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<PurchaseSellRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewActionLoading, setReviewActionLoading] = useState(false);

  // Slabs Management Modal State
  const [slabsModalOpen, setSlabsModalOpen] = useState(false);
  const [editingSlab, setEditingSlab] = useState<Partial<ApprovalSlab> | null>(null);
  const [slabModalSubmitting, setSlabModalSubmitting] = useState(false);

  // Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingReq, setViewingReq] = useState<PurchaseSellRequest | null>(null);

  // Fetch data
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedOrgFilter === "all") {
        params.set("institutionId", "all");
      } else if (effectiveInstId) {
        params.set("institutionId", String(effectiveInstId));
      } else if (selectedOrgFilter === "platform" || isPlatformSection) {
        params.set("institutionId", "none");
      }

      const slabsParams = new URLSearchParams();
      if (effectiveInstId) {
        slabsParams.set("institutionId", String(effectiveInstId));
      } else if (targetInstitutionId) {
        slabsParams.set("institutionId", String(targetInstitutionId));
      } else if (selectedOrgFilter === "platform" || isPlatformSection) {
        slabsParams.set("institutionId", "none");
      }

      const [reqRes, slabsRes] = await Promise.all([
        fetch(`/api/admin/finance/requests?${params.toString()}`, { headers }),
        fetch(`/api/admin/finance/requests/slabs?${slabsParams.toString()}`, { headers }),
      ]);

      if (reqRes.ok) {
        const d = await reqRes.json();
        setRequests(d.requests || []);
        if (d.metrics) setMetrics(d.metrics);
        if (Array.isArray(d.staffOptions)) setStaffOptions(d.staffOptions);
        if (Array.isArray(d.userInstitutions)) setServerOrgs(d.userInstitutions);
        setIsAdmin(Boolean(d.isAdmin));
        if (d.currentUserId) setCurrentUserId(d.currentUserId);
      }

      if (slabsRes.ok) {
        const sd = await slabsRes.json();
        setSlabs(sd.slabs || []);
        if (Array.isArray(sd.staffOptions) && sd.staffOptions.length > 0) {
          setStaffOptions(sd.staffOptions);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter, statusFilter, effectiveInstId, selectedOrgFilter]);

  // Live slab resolution as the user enters budget amount in the create modal
  const resolvedApprover = useMemo(() => {
    const amountNum = parseFloat(estimatedAmount) || 0;
    const defaultAdminName = adminRoleLabel;
    if (slabs.length === 0) {
      return {
        name: defaultAdminName,
        role: "Administrator",
        label: "Default Admin Approval",
      };
    }

    const matched = [...slabs]
      .filter((s) => s.is_active)
      .sort((a, b) => Number(b.min_amount) - Number(a.min_amount))
      .find((s) => {
        const min = Number(s.min_amount) || 0;
        const max = s.max_amount !== null && s.max_amount !== undefined && String(s.max_amount).trim() !== ""
          ? Number(s.max_amount)
          : null;
        return amountNum >= min && (max === null || amountNum <= max);
      });

    if (matched) {
      return {
        name: matched.responsible_user_name || defaultAdminName,
        role: matched.responsible_user_role || "Administrator",
        label: matched.label || `Slab: ₹${matched.min_amount} - ${matched.max_amount ? `₹${matched.max_amount}` : "Above"}`,
        slabId: matched.id,
      };
    }

    return {
      name: defaultAdminName,
      role: "Administrator",
      label: "Upper Tier Admin Approval",
    };
  }, [estimatedAmount, slabs, adminRoleLabel]);

  // Handle multi-file upload for quotation / document (PDF and images)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];

    const invalidFiles = fileList.filter((f) => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error("Only PDF documents and image files (JPG, PNG, WebP) are allowed");
      return;
    }

    const oversizedFiles = fileList.filter((f) => f.size > 15 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error("Each file must be 15MB or smaller");
      return;
    }

    try {
      setUploadingFile(true);
      const uploadPromises = fileList.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const headers: Record<string, string> = {};
        if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

        const res = await fetch("/api/admin/finance/requests/upload", {
          method: "POST",
          headers,
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }

        return {
          url: data.url,
          name: data.fileName || file.name,
          size: data.fileSize || file.size,
          type: data.fileType || file.type,
        } as RequestAttachment;
      });

      const uploaded = await Promise.all(uploadPromises);
      setAttachments((prev) => {
        const next = [...prev, ...uploaded];
        if (next.length > 0) {
          setAttachmentUrl(next[0].url);
          setAttachmentName(next[0].name);
        }
        return next;
      });

      toast.success(`${uploaded.length} file${uploaded.length > 1 ? "s" : ""} uploaded successfully!`);
    } catch (err: any) {
      toast.error(err?.message || "Document upload failed");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (next.length > 0) {
        setAttachmentUrl(next[0].url);
        setAttachmentName(next[0].name);
      } else {
        setAttachmentUrl("");
        setAttachmentName("");
      }
      return next;
    });
  };

  // Handle Create Request Submit
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter an item title or description");
      return;
    }

    const amountNum = parseFloat(estimatedAmount) || 0;
    if (amountNum < 0) {
      toast.error("Estimated amount cannot be negative");
      return;
    }

    try {
      setSubmitting(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/finance/requests", {
        method: "POST",
        headers,
        body: JSON.stringify({
          request_type: reqType,
          title: title.trim(),
          category,
          estimated_amount: amountNum,
          quantity: parseFloat(quantity) || 1,
          unit,
          party_name: partyName.trim() || null,
          urgency,
          description: description.trim() || null,
          attachment_url: attachments[0]?.url || attachmentUrl.trim() || null,
          attachment_name: attachments[0]?.name || attachmentName.trim() || null,
          attachments,
          institutionId: modalInstId ? Number(modalInstId) : targetInstitutionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      toast.success(
        `${reqType === "purchase" ? "Purchase" : "Sell"} request submitted successfully! Routed to ${data.request?.assigned_approver_name || "Admin"}.`
      );

      // Reset Form
      setTitle("");
      setEstimatedAmount("");
      setQuantity("1");
      setPartyName("");
      setDescription("");
      setAttachmentUrl("");
      setAttachmentName("");
      setAttachments([]);
      setCreateModalOpen(false);

      fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Review Action (Approve / Reject)
  const handleReviewAction = async (status: "approved" | "rejected") => {
    if (!selectedReq) return;
    if (status === "rejected" && !reviewNotes.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      setReviewActionLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/finance/requests/${selectedReq.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status,
          review_notes: reviewNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      toast.success(`Request ${status === "approved" ? "Approved" : "Rejected"} successfully!`);
      setReviewModalOpen(false);
      setSelectedReq(null);
      setReviewNotes("");
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Review action failed");
    } finally {
      setReviewActionLoading(false);
    }
  };

  // Handle Cancel Request
  const handleCancelRequest = async (reqId: number) => {
    if (!confirm("Are you sure you want to cancel this request?")) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/finance/requests/${reqId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "cancelled" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");

      toast.success("Request cancelled");
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel request");
    }
  };

  // Handle Delete Request
  const handleDeleteRequest = async (reqId: number) => {
    if (!confirm("Are you sure you want to delete this draft request?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/finance/requests/${reqId}`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      toast.success("Request deleted");
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete request");
    }
  };

  // Handle Save Slab (Threshold Rule)
  const handleSaveSlab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlab) return;

    try {
      setSlabModalSubmitting(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/finance/requests/slabs", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...editingSlab,
          institutionId: targetInstitutionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save slab");

      toast.success("Approval threshold slab saved!");
      setEditingSlab(null);

      // Refresh slabs
      const slabsParams = new URLSearchParams();
      if (targetInstitutionId) slabsParams.set("institutionId", String(targetInstitutionId));
      const slabsRes = await fetch(`/api/admin/finance/requests/slabs?${slabsParams.toString()}`, { headers });
      if (slabsRes.ok) {
        const sd = await slabsRes.json();
        setSlabs(sd.slabs || []);
        if (Array.isArray(sd.staffOptions) && sd.staffOptions.length > 0) {
          setStaffOptions(sd.staffOptions);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save slab");
    } finally {
      setSlabModalSubmitting(false);
    }
  };

  // Handle Delete Slab
  const handleDeleteSlab = async (slabId: number) => {
    if (!confirm("Are you sure you want to delete this approval slab?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/finance/requests/slabs?id=${slabId}`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete slab");

      toast.success("Approval slab removed");
      // Refresh slabs
      const slabsParams = new URLSearchParams();
      if (targetInstitutionId) slabsParams.set("institutionId", String(targetInstitutionId));
      const slabsRes = await fetch(`/api/admin/finance/requests/slabs?${slabsParams.toString()}`, { headers });
      if (slabsRes.ok) {
        const sd = await slabsRes.json();
        setSlabs(sd.slabs || []);
        if (Array.isArray(sd.staffOptions) && sd.staffOptions.length > 0) {
          setStaffOptions(sd.staffOptions);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete slab");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1 font-semibold">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            Cancelled
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-semibold animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Pending Approval
          </Badge>
        );
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">Urgent</Badge>;
      case "high":
        return <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40 text-[10px] uppercase font-bold">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="text-[10px] uppercase font-medium">Medium</Badge>;
      case "low":
      default:
        return <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">Low</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <IndianRupee className="w-4 h-4 text-primary" />
            <span>Finance & Procurement</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex flex-wrap items-center gap-2.5">
            <span>Purchase & Sell Requests</span>
            <Badge variant="outline" className="text-xs font-normal">
              {metrics.total_count} Total
            </Badge>
            {selectedOrgFilter === "all" ? (
              <Badge variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-primary/20">
                <Building2 className="w-3 h-3 mr-1 inline" />
                All My Organizations
              </Badge>
            ) : targetInstitutionId && currentOrgName ? (
              <Badge variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-primary/20">
                <Building2 className="w-3 h-3 mr-1 inline" />
                {currentOrgName}
              </Badge>
            ) : isPlatformScope ? (
              <Badge variant="secondary" className="text-xs font-medium bg-muted text-muted-foreground">
                <Building2 className="w-3 h-3 mr-1 inline" />
                Platform Scope
              </Badge>
            ) : null}
          </h1>
          <p className="text-xs text-muted-foreground">
            Submit purchase or sell requests. Amounts are automatically routed to responsible designated approvers based on budget slabs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSlabsModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-medium border-primary/30 hover:border-primary text-primary"
            >
              <Sliders className="w-3.5 h-3.5" />
              Approval Slabs ({slabs.length})
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => {
              setReqType("purchase");
              setPartyName("");
              setAttachmentUrl("");
              setAttachmentName("");
              setAttachments([]);
              setModalInstId(String(targetInstitutionId || activeInstitutionId || availableOrgs[0]?.id || ""));
              setCreateModalOpen(true);
            }}
            className="h-9 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <ArrowDownLeft className="w-4 h-4" />
            New Purchase Request
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setReqType("sell");
              setPartyName("");
              setAttachmentUrl("");
              setAttachmentName("");
              setAttachments([]);
              setModalInstId(String(targetInstitutionId || activeInstitutionId || availableOrgs[0]?.id || ""));
              setCreateModalOpen(true);
            }}
            className="h-9 gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <ArrowUpRight className="w-4 h-4" />
            New Sell Request
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-xs shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Total Purchase Requests</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            ₹{Number(metrics.total_purchase_amount).toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="text-emerald-600 font-semibold">
              ₹{Number(metrics.approved_purchase_amount).toLocaleString("en-IN")}
            </span>
            <span>approved volume</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-xs shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Total Sell Requests</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            ₹{Number(metrics.total_sell_amount).toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="text-blue-600 font-semibold">
              ₹{Number(metrics.approved_sell_amount).toLocaleString("en-IN")}
            </span>
            <span>approved volume</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-xs shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Pending Approvals</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">
            {metrics.pending_count}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Requires inspection and approval
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-xs shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Approved / Completed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {metrics.approved_count}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {metrics.rejected_count} rejected requests
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card/40">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter Buttons */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${typeFilter === "all" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("purchase")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1 ${typeFilter === "purchase" ? "bg-emerald-600 text-white shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" /> Purchase
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("sell")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1 ${typeFilter === "sell" ? "bg-blue-600 text-white shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Sell
            </button>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${statusFilter === "all" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"}`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 ${statusFilter === "pending" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              Pending ({metrics.pending_count})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("approved")}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 ${statusFilter === "approved" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              Approved
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("rejected")}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 ${statusFilter === "rejected" ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              Rejected
            </button>
          </div>

          {/* Organization / Scope Filter */}
          {(canSwitchOrg || availableOrgs.length > 0) && (
            <div className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1 bg-background text-xs shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-[11px] font-semibold text-muted-foreground shrink-0 hidden sm:inline">Org:</span>
              <select
                value={selectedOrgFilter}
                onChange={(e) => setSelectedOrgFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-foreground outline-hidden cursor-pointer max-w-[200px] truncate"
              >
                {isPlatformAdmin && (
                  <option value="platform">Platform Operations (No Org)</option>
                )}
                <option value="all">
                  All My Organizations ({totalOrgRequestsCount})
                </option>
                {availableOrgs.map((inst) => (
                  <option key={inst.id} value={String(inst.id)}>
                    {inst.name} ({inst.count ?? 0})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData()}
            placeholder="Search title, ref #, vendor, requester..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Requests Data Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b text-muted-foreground font-semibold">
                <th className="p-3.5">Request #</th>
                <th className="p-3.5">Type & Item</th>
                <th className="p-3.5">Budget / Amount</th>
                <th className="p-3.5">Documents / Proof</th>
                <th className="p-3.5">Requester</th>
                <th className="p-3.5">Assigned Approver</th>
                <th className="p-3.5">Urgency</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      <span>Loading finance requests...</span>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-muted-foreground">
                    <div className="max-w-lg mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground">
                        <ArrowLeftRight className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-foreground text-sm">No Purchase or Sell Requests found</p>
                      <p className="text-xs text-muted-foreground">
                        No requests found for <strong className="text-foreground">{currentOrgName}</strong>.
                      </p>

                      {otherOrgsWithRequests.length > 0 && (
                        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-2 mt-3 text-left">
                          <div className="flex items-center gap-2 font-semibold">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                              Requests found in your other organization(s):
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {otherOrgsWithRequests.map((org) => (
                              <Button
                                key={org.id}
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedOrgFilter(String(org.id))}
                                className="h-7 text-xs font-semibold bg-background border-amber-500/40 hover:bg-amber-500/10 text-foreground"
                              >
                                View {org.name} ({org.count} requests)
                              </Button>
                            ))}
                            <Button
                              size="sm"
                              onClick={() => setSelectedOrgFilter("all")}
                              className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              View All My Organizations ({totalOrgRequestsCount})
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setReqType("purchase");
                            setPartyName("");
                            setAttachmentUrl("");
                            setAttachmentName("");
                            setAttachments([]);
                            setModalInstId(String(targetInstitutionId || activeInstitutionId || availableOrgs[0]?.id || ""));
                            setCreateModalOpen(true);
                          }}
                          className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Create Request in {currentOrgName}
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const canApprove =
                    req.status === "pending" &&
                    (isAdmin || (currentUserId && Number(req.assigned_approver_id) === Number(currentUserId)));

                  const isCreator = currentUserId && Number(req.created_by) === Number(currentUserId);
                  const canCancel = req.status === "pending" && (isCreator || isAdmin);

                  return (
                    <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                      {/* Request Number & Date */}
                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-foreground">{req.request_number}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString()}
                        </div>
                        {(req as any).institution_name && (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-[9px] font-semibold text-muted-foreground bg-muted/40 border-border gap-1 py-0 px-1.5 inline-flex items-center">
                              <Building2 className="w-2.5 h-2.5 text-primary shrink-0" />
                              <span className="truncate max-w-[120px]">{(req as any).institution_name}</span>
                            </Badge>
                          </div>
                        )}
                      </td>

                      {/* Type & Item Title */}
                      <td className="p-3.5 max-w-[240px]">
                        <div className="flex items-center gap-1.5 mb-1">
                          {req.request_type === "purchase" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold px-1.5 py-0 gap-0.5">
                              <ArrowDownLeft className="w-3 h-3" /> Purchase
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold px-1.5 py-0 gap-0.5">
                              <ArrowUpRight className="w-3 h-3" /> Sell
                            </Badge>
                          )}
                          {req.category && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              • {req.category}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-foreground truncate" title={req.title}>
                          {req.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Qty: {req.quantity} {req.unit}
                        </div>
                      </td>

                      {/* Budget / Estimated Amount */}
                      <td className="p-3.5 font-mono">
                        <div className="text-sm font-bold text-foreground">
                          ₹{Number(req.estimated_amount).toLocaleString("en-IN")}
                        </div>
                        {req.matched_slab_label && (
                          <div className="text-[9px] text-muted-foreground truncate max-w-[140px]" title={req.matched_slab_label}>
                            {req.matched_slab_label}
                          </div>
                        )}
                      </td>

                      {/* Documents / Proof */}
                      <td className="p-3.5">
                        {(() => {
                          const attList = Array.isArray(req.attachments) && req.attachments.length > 0
                            ? req.attachments
                            : (req.attachment_url ? [{ url: req.attachment_url, name: req.attachment_name || "Document" }] : []);

                          if (attList.length === 0) {
                            return <span className="text-muted-foreground">—</span>;
                          }

                          if (attList.length === 1) {
                            const isPdf = attList[0].name?.toLowerCase().endsWith(".pdf") || attList[0].url.toLowerCase().endsWith(".pdf");
                            return (
                              <a
                                href={attList[0].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border bg-muted/40 hover:bg-muted font-medium text-foreground hover:text-primary transition-colors truncate max-w-[130px]"
                                title={attList[0].name}
                              >
                                {isPdf ? <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                <span className="truncate">{attList[0].name}</span>
                              </a>
                            );
                          }

                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setViewingReq(req);
                                setDetailsModalOpen(true);
                              }}
                              className="h-6 px-2 text-[10px] font-semibold gap-1 border-primary/30 text-primary hover:bg-primary/10"
                            >
                              <Paperclip className="w-3 h-3" />
                              {attList.length} files
                            </Button>
                          );
                        })()}
                      </td>

                      {/* Requester */}
                      <td className="p-3.5">
                        <div className="font-semibold text-foreground truncate max-w-[130px]">
                          {req.created_by_name || "Staff"}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {req.created_by_role || "Employee"}
                        </div>
                      </td>

                      {/* Assigned Approver */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div className="truncate max-w-[140px]">
                            <div className="font-bold text-foreground">
                              {req.assigned_approver_name || "Administrator"}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {req.assigned_approver_role || "Admin Review"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Urgency */}
                      <td className="p-3.5">
                        {getUrgencyBadge(req.urgency)}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {getStatusBadge(req.status)}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setViewingReq(req);
                            setDetailsModalOpen(true);
                          }}
                          className="h-7 px-2 text-[11px]"
                        >
                          Details
                        </Button>

                        {canApprove && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedReq(req);
                              setReviewNotes("");
                              setReviewModalOpen(true);
                            }}
                            className="h-7 px-2.5 text-[11px] font-bold bg-primary text-primary-foreground shadow-2xs"
                          >
                            Review
                          </Button>
                        )}

                        {canCancel && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelRequest(req.id)}
                            className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          >
                            Cancel
                          </Button>
                        )}

                        {isAdmin && req.status !== "approved" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRequest(req.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Create Purchase / Sell Request */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-xl w-[94vw] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {reqType === "purchase" ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              )}
              <span>New {reqType === "purchase" ? "Purchase" : "Sell"} Request</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fill in the request details. Based on your entered budget, the request will automatically route to the designated approval authority.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRequest} className="space-y-4 pt-2">
            {/* Target Organization Context */}
            {availableOrgs.length > 1 ? (
              <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/40 border text-xs">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Target Organization <span className="text-destructive">*</span>
                </Label>
                <select
                  value={modalInstId}
                  onChange={(e) => setModalInstId(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-bold text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {availableOrgs.map((org) => (
                    <option key={org.id} value={String(org.id)}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Select which of your institutions this request is being submitted under.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Organization:
                </span>
                <span className="font-bold text-foreground">
                  {currentOrgName}
                </span>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Item Title / Deliverable Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={reqType === "purchase" ? "e.g. Physics Lab Multimeters, Office Stationery, Server Disk" : "e.g. Surplus Textbook Batches, Old Computer Scrap"}
                className="text-xs"
                required
              />
            </div>

            {/* Category & Urgency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Operational Equipment">Operational Equipment</option>
                  <option value="Stationery & Supplies">Stationery & Supplies</option>
                  <option value="Books & Curriculum">Books & Curriculum</option>
                  <option value="Hardware & Electronics">Hardware & Electronics</option>
                  <option value="Software & Licenses">Software & Licenses</option>
                  <option value="Furniture & Fixtures">Furniture & Fixtures</option>
                  <option value="Maintenance & Repairs">Maintenance & Repairs</option>
                  <option value="Marketing Materials">Marketing Materials</option>
                  <option value="Surplus & Scrap">Surplus & Scrap</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Urgency Level</Label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="low">Low - Routine</option>
                  <option value="medium">Medium - Normal</option>
                  <option value="high">High - Priority</option>
                  <option value="urgent">Urgent - Immediate Requirement</option>
                </select>
              </div>
            </div>

            {/* Estimated Budget, Quantity & Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs font-semibold">
                  Total Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-xs">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={estimatedAmount}
                    onChange={(e) => setEstimatedAmount(e.target.value)}
                    placeholder="5000"
                    className="pl-7 text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Quantity</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unit</Label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="units, pcs, boxes, kg..."
                  className="text-xs"
                />
              </div>
            </div>

            {/* Live Multi-tier Auto-routing Feedback Banner */}
            <div className="p-3 rounded-xl border bg-primary/5 border-primary/20 flex items-start gap-3 text-xs">
              <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-foreground flex items-center gap-2">
                  <span>Routing to: {resolvedApprover.name}</span>
                  <Badge variant="outline" className="text-[10px] font-normal py-0">
                    {resolvedApprover.role}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Applied Rule: <strong className="text-primary">{resolvedApprover.label}</strong>.
                  {reqType === "purchase" ? " Institution and platform approval hierarchy protects financial operations." : " Sell authorizations are reviewed and audited."}
                </p>
              </div>
            </div>

            {/* Justification & Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Purpose & Justification</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain why this purchase or sell is required and how it supports operations..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* Document / Quotation / Bill File Upload (Multiple PDFs & Images) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Quotations / Bills / Proof Documents</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Upload multiple PDFs or Images (Optional)
                </span>
              </Label>

              {/* Upload Dropzone */}
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-card/60">
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingFile}
                  onChange={handleFileUpload}
                />
                {uploadingFile ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground font-medium">Uploading documents...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-1 text-center">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-primary hover:underline">
                        Click to upload multiple files
                      </span>
                      <span className="text-xs text-muted-foreground"> or drag & drop</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Select one or multiple PDF, PNG, JPG, WebP files (up to 15MB each)
                    </p>
                  </div>
                )}
              </label>

              {/* Uploaded Files List */}
              {attachments.length > 0 && (
                <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-0.5">
                    <span>Attached Files ({attachments.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachments([]);
                        setAttachmentUrl("");
                        setAttachmentName("");
                      }}
                      className="text-[10px] text-rose-500 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachments.map((att, idx) => {
                      const isPdf = att.name.toLowerCase().endsWith(".pdf") || att.type === "application/pdf";
                      return (
                        <div
                          key={att.url + idx}
                          className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              {isPdf ? (
                                <FileText className="w-4 h-4 text-rose-600" />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-emerald-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate max-w-[140px]" title={att.name}>
                                {att.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                {att.size ? (
                                  <span>{(att.size / 1024).toFixed(1)} KB</span>
                                ) : null}
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-0.5 font-medium"
                                >
                                  View <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className={`text-xs font-bold gap-1.5 ${reqType === "purchase" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
              >
                {submitting ? "Submitting..." : `Submit ${reqType === "purchase" ? "Purchase" : "Sell"} Request`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Review / Approval Dialog */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-lg w-[94vw] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              <span>Review Request: {selectedReq?.request_number}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Inspect deliverable details and record your approval or rejection decision.
            </DialogDescription>
          </DialogHeader>

          {selectedReq && (
            <div className="space-y-4 pt-1">
              <div className="p-3 rounded-xl border bg-muted/20 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">{selectedReq.title}</span>
                  <Badge variant="outline" className="font-mono font-bold text-primary">
                    ₹{Number(selectedReq.estimated_amount).toLocaleString("en-IN")}
                  </Badge>
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-[11px]">
                  <span>Requested by: <strong className="text-foreground">{selectedReq.created_by_name}</strong></span>
                  <span>Qty: <strong className="text-foreground">{selectedReq.quantity} {selectedReq.unit}</strong></span>
                  {selectedReq.party_name && (
                    <span>Party: <strong className="text-foreground">{selectedReq.party_name}</strong></span>
                  )}
                </div>
                {selectedReq.description && (
                  <p className="text-[11px] text-muted-foreground pt-1 border-t italic">
                    &quot;{selectedReq.description}&quot;
                  </p>
                )}
                {(() => {
                  const atts = Array.isArray(selectedReq.attachments) && selectedReq.attachments.length > 0
                    ? selectedReq.attachments
                    : (selectedReq.attachment_url ? [{ url: selectedReq.attachment_url, name: selectedReq.attachment_name || "Document" }] : []);

                  if (atts.length === 0) return null;

                  const imageAtts = atts.filter((a) => a.url.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i) || a.name.match(/\.(jpeg|jpg|png|webp|gif)$/i));
                  const docAtts = atts.filter((a) => !imageAtts.includes(a));

                  return (
                    <div className="pt-2 space-y-2 border-t">
                      <span className="font-semibold text-muted-foreground text-[11px]">
                        Attached Documents & Proofs ({atts.length}):
                      </span>

                      {imageAtts.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {imageAtts.map((img, idx) => (
                            <a
                              key={img.url + idx}
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative rounded-lg border overflow-hidden bg-muted/20 aspect-video flex items-center justify-center hover:ring-2 hover:ring-primary transition-all"
                              title={img.name}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.url}
                                alt={img.name}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-semibold gap-1 transition-opacity">
                                <ExternalLink className="w-3 h-3" /> View
                              </div>
                            </a>
                          ))}
                        </div>
                      )}

                      {docAtts.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          {docAtts.map((doc, idx) => {
                            const isPdf = doc.name.toLowerCase().endsWith(".pdf") || doc.type === "application/pdf";
                            return (
                              <a
                                key={doc.url + idx}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-xs group"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded bg-rose-500/10 flex items-center justify-center shrink-0">
                                    {isPdf ? (
                                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                                    ) : (
                                      <Paperclip className="w-3.5 h-3.5 text-primary" />
                                    )}
                                  </div>
                                  <span className="font-medium text-foreground truncate max-w-[200px]" title={doc.name}>
                                    {doc.name}
                                  </span>
                                </div>
                                <span className="text-[11px] text-primary flex items-center gap-1 group-hover:underline font-semibold shrink-0">
                                  Open <ExternalLink className="w-3 h-3" />
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Review Notes / Rejection Reason */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Reviewer Notes / Rejection Reason
                </Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Quotation verified and approved within departmental budget. Or specify reason if rejecting..."
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviewModalOpen(false)}
                  disabled={reviewActionLoading}
                  className="text-xs"
                >
                  Close
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleReviewAction("rejected")}
                    disabled={reviewActionLoading}
                    className="text-xs font-bold gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject Request
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleReviewAction("approved")}
                    disabled={reviewActionLoading}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve Request
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 3: View Request Details */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-lg w-[94vw] p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Request #{viewingReq?.request_number}</span>
              {viewingReq && getStatusBadge(viewingReq.status)}
            </DialogTitle>
          </DialogHeader>

          {viewingReq && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
                <div className="text-base font-bold text-foreground">{viewingReq.title}</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <strong className="uppercase">{viewingReq.request_type}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Budget:</span>{" "}
                    <strong className="font-mono text-primary font-bold">
                      ₹{Number(viewingReq.estimated_amount).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quantity:</span>{" "}
                    <strong>{viewingReq.quantity} {viewingReq.unit}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Party:</span>{" "}
                    <strong>{viewingReq.party_name || "—"}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground">Requester Information:</span>
                <div className="p-2 rounded-lg border bg-card text-[11px] flex items-center justify-between">
                  <span>{viewingReq.created_by_name} ({viewingReq.created_by_role})</span>
                  <span className="text-muted-foreground">{new Date(viewingReq.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground">Assigned Approver:</span>
                <div className="p-2 rounded-lg border bg-card text-[11px] flex items-center justify-between">
                  <span>{viewingReq.assigned_approver_name || adminRoleLabel} ({viewingReq.assigned_approver_role || "Administrator"})</span>
                  {viewingReq.matched_slab_label && (
                    <Badge variant="outline" className="text-[10px]">{viewingReq.matched_slab_label}</Badge>
                  )}
                </div>
              </div>

              {viewingReq.description && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground">Purpose & Description:</span>
                  <p className="p-2.5 rounded-lg border bg-muted/10 text-[11px] whitespace-pre-wrap">
                    {viewingReq.description}
                  </p>
                </div>
              )}

              {viewingReq.review_notes && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground">Reviewer Decision Notes:</span>
                  <div className={`p-2.5 rounded-lg border text-[11px] ${viewingReq.status === "approved" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"}`}>
                    <div className="font-semibold mb-0.5">By {viewingReq.reviewed_by_name} on {viewingReq.reviewed_at ? new Date(viewingReq.reviewed_at).toLocaleDateString() : ""}:</div>
                    <p>{viewingReq.review_notes}</p>
                  </div>
                </div>
              )}

              {(() => {
                const atts = Array.isArray(viewingReq.attachments) && viewingReq.attachments.length > 0
                  ? viewingReq.attachments
                  : (viewingReq.attachment_url ? [{ url: viewingReq.attachment_url, name: viewingReq.attachment_name || "Document" }] : []);

                if (atts.length === 0) return null;

                const imageAtts = atts.filter((a) => a.url.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i) || a.name.match(/\.(jpeg|jpg|png|webp|gif)$/i));
                const docAtts = atts.filter((a) => !imageAtts.includes(a));

                return (
                  <div className="pt-2 space-y-2">
                    <span className="font-semibold text-muted-foreground">Attached Documents & Proofs ({atts.length}):</span>

                    {/* Image Thumbnails Grid */}
                    {imageAtts.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {imageAtts.map((img, idx) => (
                          <a
                            key={img.url + idx}
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative rounded-lg border overflow-hidden bg-muted/20 aspect-video flex items-center justify-center hover:ring-2 hover:ring-primary transition-all"
                            title={img.name}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={img.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-medium transition-opacity">
                              <ExternalLink className="w-4 h-4 mr-1" /> View
                            </div>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Document / PDF Links */}
                    {docAtts.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {docAtts.map((doc, idx) => (
                          <a
                            key={doc.url + idx}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2 rounded-lg border bg-primary/5 hover:bg-primary/10 text-primary font-semibold transition-colors"
                          >
                            <span className="flex items-center gap-2 truncate max-w-[280px]">
                              <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                              <span className="truncate text-xs">{doc.name}</span>
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <DialogFooter className="pt-2">
                <Button onClick={() => setDetailsModalOpen(false)} className="w-full text-xs">
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 4: Approval Slabs Configuration Dialog (Admins Only) */}
      <Dialog open={slabsModalOpen} onOpenChange={setSlabsModalOpen}>
        <DialogContent className="sm:max-w-2xl w-[94vw] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              <span>
                Approval Slabs & Hierarchy ({currentOrgName})
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure amount thresholds and designate responsible approvers dedicated for {currentOrgName}. Purchases and sell requests within each slab are automatically routed to the designated approver.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* List of Slabs */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Configured Threshold Slabs ({slabs.length})
                </Label>
                <Button
                  size="sm"
                  onClick={() =>
                    setEditingSlab({
                      min_amount: 0,
                      max_amount: null,
                      responsible_user_id: null,
                      responsible_user_name: adminRoleLabel,
                      responsible_user_role: "Administrator",
                      label: "",
                      is_active: true,
                    })
                  }
                  className="h-7 text-xs font-bold gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Slab
                </Button>
              </div>

              {slabs.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-xl text-xs text-muted-foreground">
                  No approval slabs configured yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {slabs.map((slab) => (
                    <div
                      key={slab.id}
                      className="p-3 rounded-xl border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
                            ₹{Number(slab.min_amount).toLocaleString("en-IN")} —{" "}
                            {slab.max_amount !== null && slab.max_amount !== undefined
                              ? `₹${Number(slab.max_amount).toLocaleString("en-IN")}`
                              : "No Limit (6000+)"}
                          </span>
                          <span className="font-semibold text-foreground truncate">
                            {slab.label || "Tier Slab"}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Responsible Approver:</span>
                          <strong className="text-foreground">
                            {slab.responsible_user_name || adminRoleLabel}
                          </strong>
                          <span className="text-[10px] text-muted-foreground">
                            ({slab.responsible_user_role || "Administrator"})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSlab({ ...slab })}
                          className="h-7 px-2.5 text-[11px]"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSlab(slab.id)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Edit / Create Form */}
            {editingSlab && (
              <form onSubmit={handleSaveSlab} className="p-4 rounded-xl border bg-muted/20 space-y-3 pt-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-xs font-bold text-foreground">
                    {editingSlab.id ? "Edit Approval Slab" : "Create New Approval Slab"}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingSlab(null)}
                    className="h-6 w-6"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Min Amount (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editingSlab.min_amount ?? 0}
                      onChange={(e) =>
                        setEditingSlab({ ...editingSlab, min_amount: e.target.value })
                      }
                      className="h-8 text-xs font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold flex items-center justify-between">
                      <span>Max Amount (₹)</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        (Leave empty for ∞ / 6000+)
                      </span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={editingSlab.max_amount ?? ""}
                      onChange={(e) =>
                        setEditingSlab({
                          ...editingSlab,
                          max_amount: e.target.value === "" ? null : e.target.value,
                        })
                      }
                      placeholder="e.g. 6000 (empty = no max)"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Slab Label / Name</Label>
                  <Input
                    value={editingSlab.label ?? ""}
                    onChange={(e) => setEditingSlab({ ...editingSlab, label: e.target.value })}
                    placeholder="e.g. Micro Expenses (< ₹1,000), Mid Budget (₹1,000 - ₹6,000)..."
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold">
                      Responsible Person / Approver
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      Staff dedicated for {currentOrgName} ({staffOptions.length} staff found)
                    </span>
                  </div>
                  <select
                    value={editingSlab.responsible_user_id ? String(editingSlab.responsible_user_id) : "admin"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "admin") {
                        setEditingSlab({
                          ...editingSlab,
                          responsible_user_id: null,
                          responsible_user_name: adminRoleLabel,
                          responsible_user_role: "Administrator",
                        });
                      } else {
                        const s = staffOptions.find((opt) => String(opt.id) === val);
                        setEditingSlab({
                          ...editingSlab,
                          responsible_user_id: s ? s.id : null,
                          responsible_user_name: s ? s.name : "",
                          responsible_user_role: s ? s.role : "",
                        });
                      }
                    }}
                    className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs outline-none font-medium"
                  >
                    <option value="admin">
                      {adminDirectOption}
                    </option>
                    {staffOptions.map((st) => (
                      <option key={st.id} value={String(st.id)}>
                        {st.name} ({st.role})
                      </option>
                    ))}
                  </select>
                  {staffOptions.length === 0 && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      No additional staff profiles found dedicated for {currentOrgName} yet. Approvals will route directly to the {adminRoleLabel}.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSlab(null)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={slabModalSubmitting}
                    className="h-8 text-xs font-bold bg-primary"
                  >
                    {slabModalSubmitting ? "Saving..." : "Save Slab Rule"}
                  </Button>
                </div>
              </form>
            )}

            <DialogFooter className="pt-2 border-t">
              <Button onClick={() => setSlabsModalOpen(false)} className="text-xs">
                Done & Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
