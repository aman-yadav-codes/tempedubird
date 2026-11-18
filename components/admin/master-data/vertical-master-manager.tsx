"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Car,
  Building2,
  UtensilsCrossed,
  BedDouble,
  GraduationCap,
  HeartPulse,
  CalendarDays,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Boxes,
  ArrowUpDown,
  Sparkles,
  FolderTree,
  Activity,
  FileSpreadsheet,
  Settings,
  MoreVertical,
  Check,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store";

const ICON_MAP: Record<string, any> = {
  Car,
  Building2,
  UtensilsCrossed,
  BedDouble,
  GraduationCap,
  HeartPulse,
  CalendarDays,
  Boxes,
  Layers,
  FolderTree,
  Sparkles,
  Activity,
};

type MasterType = {
  id: number;
  vertical_id: number;
  vertical_code: string;
  vertical_name: string;
  code: string;
  name: string;
  description: string;
  hierarchy_level: number;
  parent_master_type_id: number | null;
  parent_master_type_code: string | null;
  parent_master_type_name: string | null;
  icon: string | null;
  is_hierarchical: boolean;
  allow_multiple_parents: boolean;
  records_count: number;
  active_records_count: number;
  attributes_count: number;
};

type MasterRecord = {
  id: number;
  vertical_id: number;
  master_type_id: number;
  master_type_code: string;
  master_type_name: string;
  parent_id: number | null;
  parent_name: string | null;
  code: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  display_order: number;
  status: "active" | "inactive" | "archived";
  children_count: number;
  attribute_values: any[];
  related_records: any[];
  created_at: string;
  updated_at: string;
};

type MasterAttribute = {
  id: number;
  vertical_id: number;
  master_type_id: number;
  name: string;
  label: string;
  field_type: string;
  placeholder: string | null;
  options: string[] | null;
  is_required: boolean;
  validation_rules: Record<string, any>;
  display_order: number;
};

interface VerticalMasterManagerProps {
  verticalCode: string;
  title: string;
  subtitle: string;
  iconName?: string;
  accentColor?: string;
}

export function VerticalMasterManager({
  verticalCode,
  title,
  subtitle,
  iconName = "Boxes",
  accentColor = "from-red-600 to-rose-600",
}: VerticalMasterManagerProps) {
  const { accessToken } = useAuthStore();
  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken]
  );

  // State
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [masterTypes, setMasterTypes] = useState<MasterType[]>([]);
  const [selectedType, setSelectedType] = useState<MasterType | null>(null);

  // Records state
  const [records, setRecords] = useState<MasterRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [parentFilter, setParentFilter] = useState<string>("all");
  const [parentOptions, setParentOptions] = useState<{ id: number; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MasterRecord | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    slug: "",
    parent_id: "" as string,
    description: "",
    image_url: "",
    icon: "",
    display_order: 0,
    status: "active",
  });
  const [customAttributeValues, setCustomAttributeValues] = useState<Record<string, any>>({});
  const [typeAttributes, setTypeAttributes] = useState<MasterAttribute[]>([]);

  // Attributes Dialog
  const [attrDialogOpen, setAttrDialogOpen] = useState(false);
  const [newAttrLabel, setNewAttrLabel] = useState("");
  const [newAttrType, setNewAttrType] = useState("text");
  const [newAttrPlaceholder, setNewAttrPlaceholder] = useState("");
  const [newAttrRequired, setNewAttrRequired] = useState(false);
  const [newAttrOptions, setNewAttrOptions] = useState("");
  const [savingAttr, setSavingAttr] = useState(false);

  // Import Dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  // View Details Dialog
  const [viewRecord, setViewRecord] = useState<MasterRecord | null>(null);

  const HeaderIcon = ICON_MAP[iconName] || Boxes;

  // 1. Fetch Master Types for this Vertical
  const fetchMasterTypes = useCallback(async () => {
    setLoadingTypes(true);
    try {
      const res = await fetch(`/api/platformadmin/masters/types?vertical=${verticalCode}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load master types");
      const types = json.data || [];
      setMasterTypes(types);
      if (types.length > 0 && !selectedType) {
        setSelectedType(types[0]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load master types");
    } finally {
      setLoadingTypes(false);
    }
  }, [verticalCode, selectedType]);

  useEffect(() => {
    void fetchMasterTypes();
  }, [fetchMasterTypes]);

  // 2. Fetch Parent Options when selected type has parent_master_type_id
  const fetchParentOptions = useCallback(async () => {
    if (!selectedType || !selectedType.parent_master_type_id) {
      setParentOptions([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/platformadmin/masters/records?type=${selectedType.parent_master_type_id}&limit=200&status=active`
      );
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setParentOptions(json.data.map((r: any) => ({ id: r.id, name: r.name })));
      }
    } catch {
      setParentOptions([]);
    }
  }, [selectedType]);

  useEffect(() => {
    void fetchParentOptions();
  }, [fetchParentOptions]);

  // 3. Fetch Type Attributes
  const fetchTypeAttributes = useCallback(async () => {
    if (!selectedType) return;
    try {
      const res = await fetch(`/api/platformadmin/masters/attributes?typeId=${selectedType.id}`);
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setTypeAttributes(json.data);
      }
    } catch {
      setTypeAttributes([]);
    }
  }, [selectedType]);

  useEffect(() => {
    void fetchTypeAttributes();
  }, [fetchTypeAttributes]);

  // 4. Fetch Records
  const fetchRecords = useCallback(async () => {
    if (!selectedType) return;
    setLoadingRecords(true);
    try {
      const params = new URLSearchParams({
        vertical: verticalCode,
        type: String(selectedType.id),
        page: String(page),
        limit: "25",
        status: statusFilter,
      });
      if (search) params.set("search", search);
      if (parentFilter !== "all") params.set("parentId", parentFilter);

      const res = await fetch(`/api/platformadmin/masters/records?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load records");
      setRecords(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalCount(json.pagination?.total || 0);
    } catch (err: any) {
      toast.error(err.message || "Failed to load records");
    } finally {
      setLoadingRecords(false);
    }
  }, [verticalCode, selectedType, page, statusFilter, parentFilter, search]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalRecords = masterTypes.reduce((acc, t) => acc + (t.records_count || 0), 0);
    const activeRecords = masterTypes.reduce((acc, t) => acc + (t.active_records_count || 0), 0);
    const inactiveRecords = totalRecords - activeRecords;
    const catType = masterTypes.find((t) => t.is_hierarchical && t.hierarchy_level === 1);
    const subType = masterTypes.find((t) => t.is_hierarchical && t.hierarchy_level === 2);
    return {
      totalRecords,
      activeRecords,
      inactiveRecords,
      categoriesCount: catType?.records_count || 0,
      subcategoriesCount: subType?.records_count || 0,
    };
  }, [masterTypes]);

  // Toggle record status
  const handleToggleStatus = async (record: MasterRecord) => {
    const nextStatus = record.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/platformadmin/masters/records/${record.id}/status`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update status");
      }
      toast.success(`"${record.name}" status updated to ${nextStatus}`);
      void fetchRecords();
      void fetchMasterTypes();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Open Form Dialog
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormData({
      name: "",
      code: "",
      slug: "",
      parent_id: parentFilter !== "all" ? parentFilter : "",
      description: "",
      image_url: "",
      icon: "",
      display_order: records.length + 1,
      status: "active",
    });
    setCustomAttributeValues({});
    setFormOpen(true);
  };

  const handleOpenEdit = (rec: MasterRecord) => {
    setEditingRecord(rec);
    setFormData({
      name: rec.name,
      code: rec.code || "",
      slug: rec.slug,
      parent_id: rec.parent_id ? String(rec.parent_id) : "",
      description: rec.description || "",
      image_url: rec.image_url || "",
      icon: rec.icon || "",
      display_order: rec.display_order,
      status: rec.status,
    });
    // Populate custom attribute values
    const attrVals: Record<string, any> = {};
    if (Array.isArray(rec.attribute_values)) {
      for (const av of rec.attribute_values) {
        attrVals[av.attribute_id] =
          av.value_text ?? av.value_number ?? av.value_boolean ?? av.value_json ?? "";
      }
    }
    setCustomAttributeValues(attrVals);
    setFormOpen(true);
  };

  // Save Record
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !selectedType) {
      toast.error("Record Name is required");
      return;
    }

    setSavingRecord(true);
    try {
      const payload = {
        vertical_id: selectedType.vertical_id,
        master_type_id: selectedType.id,
        parent_id: formData.parent_id ? Number(formData.parent_id) : null,
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        slug: formData.slug.trim() || undefined,
        description: formData.description.trim() || null,
        image_url: formData.image_url.trim() || null,
        icon: formData.icon.trim() || null,
        display_order: Number(formData.display_order || 0),
        status: formData.status,
        custom_attributes: customAttributeValues,
      };

      const url = editingRecord
        ? `/api/platformadmin/masters/records/${editingRecord.id}`
        : "/api/platformadmin/masters/records";
      const method = editingRecord ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save record");

      toast.success(
        editingRecord
          ? `Record "${formData.name}" updated successfully`
          : `Record "${formData.name}" created successfully`
      );
      setFormOpen(false);
      void fetchRecords();
      void fetchMasterTypes();
    } catch (err: any) {
      toast.error(err.message || "Failed to save record");
    } finally {
      setSavingRecord(false);
    }
  };

  // Archive / Delete Record
  const handleDeleteRecord = async (record: MasterRecord) => {
    if (!confirm(`Are you sure you want to delete/archive "${record.name}"?`)) return;
    try {
      const res = await fetch(`/api/platformadmin/masters/records/${record.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete record");

      toast.success(json.message || "Record archived successfully");
      void fetchRecords();
      void fetchMasterTypes();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record");
    }
  };

  // Create Custom Attribute
  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrLabel.trim() || !selectedType) {
      toast.error("Attribute label is required");
      return;
    }

    setSavingAttr(true);
    try {
      const optionsArray = newAttrOptions
        ? newAttrOptions.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      const res = await fetch("/api/platformadmin/masters/attributes", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          vertical_id: selectedType.vertical_id,
          master_type_id: selectedType.id,
          label: newAttrLabel.trim(),
          field_type: newAttrType,
          placeholder: newAttrPlaceholder.trim() || null,
          is_required: newAttrRequired,
          options: optionsArray,
          display_order: typeAttributes.length + 1,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save attribute");

      toast.success(`Custom field "${newAttrLabel}" created!`);
      setNewAttrLabel("");
      setNewAttrPlaceholder("");
      setNewAttrOptions("");
      setNewAttrRequired(false);
      void fetchTypeAttributes();
    } catch (err: any) {
      toast.error(err.message || "Failed to save attribute");
    } finally {
      setSavingAttr(false);
    }
  };

  // Handle Bulk Import
  const handleBulkImport = async () => {
    if (!importText.trim() || !selectedType) {
      toast.error("Please enter records to import");
      return;
    }

    setImporting(true);
    try {
      const lines = importText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      // Support comma separated format: Name, Code, Description
      const recordsToImport = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return {
          name: parts[0] || "",
          code: parts[1] || undefined,
          description: parts[2] || undefined,
        };
      }).filter((r) => r.name.length > 0);

      const res = await fetch("/api/platformadmin/masters/import", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          vertical_id: selectedType.vertical_id,
          master_type_id: selectedType.id,
          parent_id: parentFilter !== "all" ? Number(parentFilter) : null,
          records: recordsToImport,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to import records");

      toast.success(json.message || "Bulk import completed!");
      setImportOpen(false);
      setImportText("");
      void fetchRecords();
      void fetchMasterTypes();
    } catch (err: any) {
      toast.error(err.message || "Failed to process bulk import");
    } finally {
      setImporting(false);
    }
  };

  // Export CSV
  const handleExport = () => {
    if (!selectedType) return;
    const url = `/api/platformadmin/masters/export?vertical=${verticalCode}&type=${selectedType.id}&format=csv`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-6 sm:p-8 text-white shadow-xl border border-slate-700/60">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 text-rose-300">
              <HeaderIcon className="w-3.5 h-3.5" />
              <span>Platform Admin Vertical Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${accentColor} shadow-lg text-white`}>
                <HeaderIcon className="w-7 h-7" />
              </div>
              {title}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/platformadmin/master-data">
              <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                <FolderTree className="w-4 h-4 mr-2" />
                All Verticals Hub
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className={`bg-gradient-to-r ${accentColor} text-white hover:opacity-90 shadow-md font-medium`}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Record
            </Button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Dashboard Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Records</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {summaryMetrics.totalRecords}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Boxes className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Records</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {summaryMetrics.activeRecords}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Inactive Records</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {summaryMetrics.inactiveRecords}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Primary Categories</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {summaryMetrics.categoriesCount}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <FolderTree className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Subcategories</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                {summaryMetrics.subcategoriesCount}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Master Types Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {masterTypes.map((mt) => {
            const isSelected = selectedType?.id === mt.id;
            return (
              <button
                key={mt.id}
                onClick={() => {
                  setSelectedType(mt);
                  setPage(1);
                  setParentFilter("all");
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>{mt.name}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {mt.records_count || 0}
                </span>
                {mt.attributes_count > 0 && (
                  <span
                    title={`${mt.attributes_count} Custom Fields`}
                    className="w-2 h-2 rounded-full bg-rose-500"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Master Type Header & Filters */}
      {selectedType && (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    {selectedType.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    Level {selectedType.hierarchy_level}
                  </Badge>
                  {selectedType.parent_master_type_name && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      Parent: {selectedType.parent_master_type_name}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs mt-1">
                  {selectedType.description || `Manage and configure master entries for ${selectedType.name}`}
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAttrDialogOpen(true)}
                  className="text-xs text-slate-700 dark:text-slate-300"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                  Custom Fields ({typeAttributes.length})
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenCreate}
                  className={`bg-gradient-to-r ${accentColor} text-white hover:opacity-90 shadow-sm text-xs font-medium`}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add {selectedType.name.replace(/s$/, "")}
                </Button>
              </div>
            </div>

            {/* Filter controls row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={`Search ${selectedType.name}...`}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-500 whitespace-nowrap">Status:</Label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>

              {/* Parent Record Filter (if hierarchical) */}
              {selectedType.parent_master_type_id && parentOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-500 whitespace-nowrap">
                    {selectedType.parent_master_type_name || "Parent"}:
                  </Label>
                  <select
                    value={parentFilter}
                    onChange={(e) => {
                      setParentFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs"
                  >
                    <option value="all">All {selectedType.parent_master_type_name || "Parents"}</option>
                    {parentOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </CardHeader>

          {/* 5. Master Records Table */}
          <CardContent className="p-0">
            {loadingRecords ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <RefreshCw className="w-7 h-7 animate-spin mb-2" />
                <p className="text-xs">Loading records...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="p-3.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                  <Boxes className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  No records found in {selectedType.name}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  {search || statusFilter !== "all" || parentFilter !== "all"
                    ? "Try adjusting your search query or filters."
                    : "Get started by adding your first record or importing in bulk."}
                </p>
                <Button
                  size="sm"
                  onClick={handleOpenCreate}
                  className={`mt-4 bg-gradient-to-r ${accentColor} text-white text-xs`}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add First Record
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-100 dark:border-slate-800 font-medium">
                    <tr>
                      <th className="py-3 px-4">Order</th>
                      <th className="py-3 px-4">Record Name</th>
                      <th className="py-3 px-4">Code / Slug</th>
                      {selectedType.parent_master_type_id && (
                        <th className="py-3 px-4">{selectedType.parent_master_type_name || "Parent"}</th>
                      )}
                      <th className="py-3 px-4">Children</th>
                      <th className="py-3 px-4">Custom Attributes</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {records.map((rec) => (
                      <tr
                        key={rec.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-slate-400">
                          #{rec.display_order}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            {rec.image_url ? (
                              <img
                                src={rec.image_url}
                                alt={rec.name}
                                className="w-7 h-7 rounded object-cover border border-slate-200 dark:border-slate-700"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                                {rec.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold">{rec.name}</p>
                              {rec.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">
                                  {rec.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {rec.code || rec.slug}
                        </td>
                        {selectedType.parent_master_type_id && (
                          <td className="py-3 px-4">
                            {rec.parent_name ? (
                              <Badge variant="outline" className="text-[11px] font-normal">
                                {rec.parent_name}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">None</span>
                            )}
                          </td>
                        )}
                        <td className="py-3 px-4">
                          {rec.children_count > 0 ? (
                            <Badge className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px]">
                              {rec.children_count} child records
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {rec.attribute_values && rec.attribute_values.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {rec.attribute_values.slice(0, 2).map((av: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                >
                                  {av.label}: {av.value_text ?? av.value_number ?? av.value_boolean ?? "—"}
                                </span>
                              ))}
                              {rec.attribute_values.length > 2 && (
                                <span className="text-[10px] text-slate-400">
                                  +{rec.attribute_values.length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleStatus(rec)}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                              rec.status === "active"
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                rec.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                            {rec.status === "active" ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-500 hover:text-slate-900"
                              onClick={() => setViewRecord(rec)}
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleOpenEdit(rec)}
                              title="Edit Record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDeleteRecord(rec)}
                              title="Delete/Archive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <p className="text-slate-500">
                  Showing page {page} of {totalPages} ({totalCount} total records)
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-7 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-7 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. Add / Edit Record Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord
                ? `Edit ${selectedType?.name.replace(/s$/, "")}`
                : `Add New ${selectedType?.name.replace(/s$/, "")}`}
            </DialogTitle>
            <DialogDescription>
              Configure this master record. Changes reflect automatically across all connected business accounts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRecord} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold">
                  Record Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  required
                  placeholder={`e.g. ${selectedType?.name === "Vehicle Brands" ? "Toyota" : selectedType?.name === "Dishes" ? "Paneer Tikka" : "Name"}`}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {selectedType?.parent_master_type_id && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">
                    {selectedType.parent_master_type_name || "Parent Category"}
                  </Label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm"
                  >
                    <option value="">-- No Parent (Root Level) --</option>
                    {parentOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unique Code</Label>
                <Input
                  placeholder="e.g. TOYOTA-SUV-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea
                  rows={2}
                  placeholder="Optional brief description or specs..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Image or Logo URL</Label>
                <Input
                  placeholder="https://... or /images/..."
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm"
                >
                  <option value="active">Active (Available for business selection)</option>
                  <option value="inactive">Inactive (Hidden from new selection)</option>
                </select>
              </div>
            </div>

            {/* Custom Attributes Section */}
            {typeAttributes.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-rose-500" />
                  Dynamic Custom Attributes ({typeAttributes.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  {typeAttributes.map((attr) => (
                    <div key={attr.id} className="space-y-1">
                      <Label className="text-xs font-medium">
                        {attr.label}{" "}
                        {attr.is_required && <span className="text-rose-500">*</span>}
                      </Label>
                      {attr.field_type === "dropdown" ? (
                        <select
                          value={customAttributeValues[attr.id] || ""}
                          onChange={(e) =>
                            setCustomAttributeValues({
                              ...customAttributeValues,
                              [attr.id]: e.target.value,
                            })
                          }
                          className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                        >
                          <option value="">-- Select {attr.label} --</option>
                          {Array.isArray(attr.options) &&
                            attr.options.map((opt: string, i: number) => (
                              <option key={i} value={opt}>
                                {opt}
                              </option>
                            ))}
                        </select>
                      ) : attr.field_type === "boolean" ? (
                        <div className="flex items-center gap-3 pt-1">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(customAttributeValues[attr.id])}
                              onChange={(e) =>
                                setCustomAttributeValues({
                                  ...customAttributeValues,
                                  [attr.id]: e.target.checked,
                                })
                              }
                              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                            />
                            <span>Enabled / Yes</span>
                          </label>
                        </div>
                      ) : attr.field_type === "textarea" ? (
                        <Textarea
                          rows={2}
                          placeholder={attr.placeholder || ""}
                          value={customAttributeValues[attr.id] || ""}
                          onChange={(e) =>
                            setCustomAttributeValues({
                              ...customAttributeValues,
                              [attr.id]: e.target.value,
                            })
                          }
                          className="text-xs"
                        />
                      ) : (
                        <Input
                          type={attr.field_type === "number" || attr.field_type === "decimal" ? "number" : "text"}
                          step={attr.field_type === "decimal" ? "0.01" : undefined}
                          placeholder={attr.placeholder || ""}
                          value={customAttributeValues[attr.id] || ""}
                          onChange={(e) =>
                            setCustomAttributeValues({
                              ...customAttributeValues,
                              [attr.id]: e.target.value,
                            })
                          }
                          className="h-9 text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingRecord}
                className={`bg-gradient-to-r ${accentColor} text-white font-medium`}
              >
                {savingRecord ? "Saving..." : editingRecord ? "Update Record" : "Create Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. Dynamic Attributes Management Dialog */}
      <Dialog open={attrDialogOpen} onOpenChange={setAttrDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-rose-500" />
              Custom Attributes for {selectedType?.name}
            </DialogTitle>
            <DialogDescription>
              Define schema-less dynamic attributes (e.g. Engine Capacity, Mileage, Price, Prep Time).
              These fields automatically appear in business owner creation forms without code modifications.
            </DialogDescription>
          </DialogHeader>

          {/* Add New Attribute Form */}
          <form
            onSubmit={handleSaveAttribute}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3.5"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Add New Custom Field
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Field Label *</Label>
                <Input
                  required
                  placeholder="e.g. Engine Capacity (cc)"
                  value={newAttrLabel}
                  onChange={(e) => setNewAttrLabel(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Field Type</Label>
                <select
                  value={newAttrType}
                  onChange={(e) => setNewAttrType(e.target.value)}
                  className="w-full h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                >
                  <option value="text">Text (Single Line)</option>
                  <option value="textarea">Textarea (Multi-line)</option>
                  <option value="number">Number (Integer)</option>
                  <option value="decimal">Decimal / Currency</option>
                  <option value="dropdown">Dropdown Select</option>
                  <option value="boolean">Boolean Toggle / Checkbox</option>
                  <option value="date">Date</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Placeholder</Label>
                <Input
                  placeholder="e.g. 1498"
                  value={newAttrPlaceholder}
                  onChange={(e) => setNewAttrPlaceholder(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {newAttrType === "dropdown" && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Dropdown Options (Comma-separated)</Label>
                  <Input
                    placeholder="e.g. Petrol, Diesel, Electric, Hybrid"
                    value={newAttrOptions}
                    onChange={(e) => setNewAttrOptions(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="reqCheck"
                  checked={newAttrRequired}
                  onChange={(e) => setNewAttrRequired(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 h-4 w-4"
                />
                <Label htmlFor="reqCheck" className="text-xs cursor-pointer">
                  Mandatory / Required Field
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={savingAttr}
              className={`bg-gradient-to-r ${accentColor} text-white text-xs`}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {savingAttr ? "Adding..." : "Add Attribute"}
            </Button>
          </form>

          {/* Existing Attributes List */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Attributes ({typeAttributes.length})
            </h4>
            {typeAttributes.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No custom attributes configured yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                {typeAttributes.map((attr) => (
                  <div
                    key={attr.id}
                    className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-850"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {attr.label}
                        {attr.is_required && (
                          <span className="text-rose-500 font-bold ml-1">*</span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        field_name: {attr.name} | type: {attr.field_type}
                      </p>
                      {Array.isArray(attr.options) && attr.options.length > 0 && (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                          Options: {attr.options.join(", ")}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {attr.field_type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 8. Bulk Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-rose-500" />
              Bulk Import into {selectedType?.name}
            </DialogTitle>
            <DialogDescription>
              Enter one record per line in format: <strong>Name, Code, Description</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Textarea
              rows={8}
              placeholder={`Example:\nToyota Fortuner, FORTUNER, Mid-size luxury SUV\nToyota Corolla, COROLLA, Compact premium sedan\nToyota Hilux, HILUX, Heavy duty pickup truck`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-slate-400">
              Duplicates by slug will automatically update existing records without breaking relationships.
            </p>
          </div>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkImport}
              disabled={importing}
              className={`bg-gradient-to-r ${accentColor} text-white font-medium`}
            >
              {importing ? "Importing..." : "Process Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. View Details Dialog */}
      {viewRecord && (
        <Dialog open={Boolean(viewRecord)} onOpenChange={() => setViewRecord(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-rose-500" />
                {viewRecord.name}
              </DialogTitle>
              <DialogDescription>
                Record #{viewRecord.id} • {viewRecord.master_type_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-850 rounded-lg">
                <div>
                  <span className="text-slate-400">Code:</span>
                  <p className="font-mono font-medium">{viewRecord.code || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400">Slug:</span>
                  <p className="font-mono font-medium">{viewRecord.slug}</p>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <p className="font-semibold text-emerald-600 capitalize">{viewRecord.status}</p>
                </div>
                <div>
                  <span className="text-slate-400">Display Order:</span>
                  <p className="font-semibold">#{viewRecord.display_order}</p>
                </div>
              </div>
              {viewRecord.description && (
                <div>
                  <span className="text-slate-400">Description:</span>
                  <p className="mt-0.5 text-slate-700 dark:text-slate-300">{viewRecord.description}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
