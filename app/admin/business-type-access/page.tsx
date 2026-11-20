"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import {
  SlidersHorizontal,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  RotateCcw,
  Check,
  X,
  ExternalLink,
  Loader2,
  Trash2,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Filter,
  Layers,
  Edit2,
  FolderKanban,
  Boxes,
  Package,
  FileText,
  Settings,
  ArrowRight,
  Code,
  FolderTree,
  UserCog,
  Users,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface BusinessTypeItem {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  last_updated: string;
  total_modules: number;
  enabled_modules: number;
  disabled_modules: number;
  total_roles?: number;
  enabled_roles?: number;
  disabled_roles?: number;
}

interface BusinessTypeRoleItem {
  id: number;
  name: string;
  code: string;
  scope_code?: string;
  scope_name?: string;
  is_enabled: boolean;
}

interface SystemModuleChild {
  id: number;
  module_key: string;
  module_name: string;
  parent_module_id: number;
  route: string;
  icon: string;
  display_order: number;
  description: string;
  is_enabled: boolean;
}

interface SystemModuleParent {
  id: number;
  module_key: string;
  module_name: string;
  parent_module_id: null;
  route: string;
  icon: string;
  display_order: number;
  description: string;
  is_enabled: boolean;
  children: SystemModuleChild[];
}

interface ModuleListItem {
  id: number;
  module_key: string;
  module_name: string;
  parent_module_id: number | null;
  parent_module_name?: string | null;
  route: string;
  icon: string;
  display_order: number;
  description: string;
  status: string;
  enabled_business_types_count: number;
  total_business_types_count: number;
  children_count: number;
}

export default function BusinessTypeAccessManagementPage() {
  const { accessToken } = useAuthStore();
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "commercial" | "academic">("all");

  const filteredBusinessTypes = useMemo(() => {
    return businessTypes.filter((bt) => {
      const isAcademic = ["coaching", "college", "institute", "school", "university"].includes(bt.slug);
      if (categoryFilter === "commercial") return !isAcademic;
      if (categoryFilter === "academic") return isAcademic;
      return true;
    });
  }, [businessTypes, categoryFilter]);

  // Create Business Type modal state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeTemplate, setNewTypeTemplate] = useState<"commercial" | "academic">("commercial");
  const [creating, setCreating] = useState(false);

  // Manage Access modal state
  const [selectedType, setSelectedType] = useState<BusinessTypeItem | null>(null);
  const [modulesHierarchy, setModulesHierarchy] = useState<SystemModuleParent[]>([]);
  const [accessMap, setAccessMap] = useState<Record<number, boolean>>({});
  const [loadingModules, setLoadingModules] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [moduleSearch, setModuleSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<"all" | "enabled" | "disabled">("all");

  // Reset confirmation modal
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Manage Roles modal state
  const [selectedTypeForRoles, setSelectedTypeForRoles] = useState<BusinessTypeItem | null>(null);
  const [rolesList, setRolesList] = useState<BusinessTypeRoleItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [roleAccessMap, setRoleAccessMap] = useState<Record<number, boolean>>({});
  const [resetRolesDialogOpen, setResetRolesDialogOpen] = useState(false);
  const [resettingRoles, setResettingRoles] = useState(false);

  // --- System Modules Management State ---
  const [modulesModalOpen, setModulesModalOpen] = useState(false);
  const [allModulesList, setAllModulesList] = useState<ModuleListItem[]>([]);
  const [loadingAllModules, setLoadingAllModules] = useState(false);
  const [modulesListSearch, setModulesListSearch] = useState("");
  const [modulesListFilter, setModulesListFilter] = useState<"parent" | "all" | "child">("parent");
  const [expandedParentModuleIds, setExpandedParentModuleIds] = useState<number[]>([]);
  const [parentOptions, setParentOptions] = useState<Array<{ id: number; name: string; key: string }>>([]);

  // Create / Edit Module Modal State
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [formModuleName, setFormModuleName] = useState("");
  const [formModuleKey, setFormModuleKey] = useState("");
  const [formParentId, setFormParentId] = useState("none");
  const [formRoute, setFormRoute] = useState("");
  const [formIcon, setFormIcon] = useState("Layers");
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(50);
  const [formDescription, setFormDescription] = useState("");
  const [formEnableForAll, setFormEnableForAll] = useState(true);
  const [formSelectedTypes, setFormSelectedTypes] = useState<number[]>([]);
  const [savingModule, setSavingModule] = useState(false);

  // Delete Module confirmation
  const [deleteModuleTarget, setDeleteModuleTarget] = useState<ModuleListItem | null>(null);
  const [deletingModule, setDeletingModule] = useState(false);

  // Load business types listing
  const loadBusinessTypes = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/business-type-access", window.location.origin);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString(), {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load business types");

      setBusinessTypes(json.data || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error loading business types");
    } finally {
      setLoading(false);
    }
  }, [accessToken, search]);

  useEffect(() => {
    loadBusinessTypes();
  }, [loadBusinessTypes]);

  // Load All System Modules for the Modules Management modal
  const loadAllModules = useCallback(async () => {
    setLoadingAllModules(true);
    try {
      const res = await fetch("/api/admin/business-type-access/modules", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load system modules");

      setAllModulesList(json.modules || []);
      setParentOptions(json.parentOptions || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error loading modules");
    } finally {
      setLoadingAllModules(false);
    }
  }, [accessToken]);

  const handleOpenModulesModal = () => {
    setModulesListFilter("parent");
    setExpandedParentModuleIds([]);
    setModulesModalOpen(true);
    loadAllModules();
  };

  // Open Create Module dialog
  const handleOpenCreateModule = () => {
    setEditingModuleId(null);
    setFormModuleName("");
    setFormModuleKey("");
    setFormParentId("none");
    setFormRoute("");
    setFormIcon("Layers");
    setFormDisplayOrder(50);
    setFormDescription("");
    setFormEnableForAll(true);
    setFormSelectedTypes(businessTypes.map((bt) => bt.id));
    setModuleFormOpen(true);
  };

  // Open Edit Module dialog
  const handleOpenEditModule = (mod: ModuleListItem) => {
    setEditingModuleId(mod.id);
    setFormModuleName(mod.module_name);
    setFormModuleKey(mod.module_key);
    setFormParentId(mod.parent_module_id ? String(mod.parent_module_id) : "none");
    setFormRoute(mod.route || "");
    setFormIcon(mod.icon || "Layers");
    setFormDisplayOrder(mod.display_order ?? 50);
    setFormDescription(mod.description || "");
    setModuleFormOpen(true);
  };

  // Auto-slugify module key when creating
  const handleNameChange = (name: string) => {
    setFormModuleName(name);
    if (!editingModuleId) {
      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "");
      setFormModuleKey(slug);
      if (!formRoute || formRoute.startsWith("/admin/")) {
        setFormRoute(`/admin/${slug.replace(/_/g, "-")}`);
      }
    }
  };

  // Save new or edited module
  const handleSaveModule = async () => {
    if (!formModuleName.trim()) {
      toast.error("Module name is required");
      return;
    }

    setSavingModule(true);
    try {
      const payload: any = {
        module_name: formModuleName.trim(),
        module_key: formModuleKey.trim() || undefined,
        parent_module_id: formParentId !== "none" ? Number(formParentId) : null,
        route: formRoute.trim(),
        icon: formIcon.trim(),
        display_order: Number(formDisplayOrder) || 50,
        description: formDescription.trim(),
      };

      if (!editingModuleId) {
        payload.enable_for_all = formEnableForAll;
        payload.selected_business_type_ids = formSelectedTypes;
      }

      const url = editingModuleId
        ? `/api/admin/business-type-access/modules/${editingModuleId}`
        : "/api/admin/business-type-access/modules";

      const method = editingModuleId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save module");

      toast.success(json.message || "Module saved successfully");
      setModuleFormOpen(false);
      loadAllModules();
      loadBusinessTypes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save module");
    } finally {
      setSavingModule(false);
    }
  };

  // Confirm delete module
  const handleDeleteModule = async () => {
    if (!deleteModuleTarget) return;
    setDeletingModule(true);
    try {
      const res = await fetch(`/api/admin/business-type-access/modules/${deleteModuleTarget.id}`, {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete module");

      toast.success(json.message || "Module deleted");
      setDeleteModuleTarget(null);
      loadAllModules();
      loadBusinessTypes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete module");
    } finally {
      setDeletingModule(false);
    }
  };

  // Open Manage Access modal and load full module hierarchy for a business type
  const handleOpenManageAccess = async (bt: BusinessTypeItem) => {
    setSelectedType(bt);
    setLoadingModules(true);
    setModuleSearch("");
    setModuleFilter("all");

    try {
      const res = await fetch(`/api/admin/business-type-access/${bt.id}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load module access");

      setModulesHierarchy(json.modules || []);

      const initialMap: Record<number, boolean> = {};
      if (Array.isArray(json.flatModules)) {
        json.flatModules.forEach((m: any) => {
          initialMap[m.id] = Boolean(m.is_enabled);
        });
      }
      setAccessMap(initialMap);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error loading module configuration");
    } finally {
      setLoadingModules(false);
    }
  };

  // Toggle single module in access configuration
  const handleToggleModule = (moduleId: number, isParent: boolean, childrenIds: number[] = []) => {
    setAccessMap((prev) => {
      const current = prev[moduleId] ?? true;
      const nextState = !current;
      const updated = { ...prev, [moduleId]: nextState };

      if (isParent && !nextState) {
        childrenIds.forEach((cId) => {
          updated[cId] = false;
        });
      }

      if (!isParent && nextState) {
        const parent = modulesHierarchy.find((p) =>
          p.children.some((c) => c.id === moduleId)
        );
        if (parent) {
          updated[parent.id] = true;
        }
      }

      return updated;
    });
  };

  // Select All
  const handleSelectAll = () => {
    setAccessMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[Number(id)] = true;
      });
      return updated;
    });
  };

  // Deselect All
  const handleDeselectAll = () => {
    setAccessMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[Number(id)] = false;
      });
      return updated;
    });
  };

  // Save Changes for business type
  const handleSaveChanges = async () => {
    if (!selectedType) return;
    setSavingAccess(true);

    try {
      const enabledIds = Object.entries(accessMap)
        .filter(([, isEnabled]) => isEnabled)
        .map(([id]) => Number(id));

      const res = await fetch(`/api/admin/business-type-access/${selectedType.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ enabledModuleIds: enabledIds }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save configuration");

      toast.success(json.message || "Permissions updated successfully");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("edubird:business-type-access-change", { detail: { businessTypeId: selectedType.id } }));
      }
      setSelectedType(null);
      loadBusinessTypes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingAccess(false);
    }
  };

  // Reset to Default
  const handleResetToDefault = async () => {
    if (!selectedType) return;
    setResetting(true);

    try {
      const res = await fetch(`/api/admin/business-type-access/${selectedType.id}/reset`, {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Reset failed");

      toast.success(json.message || "Permissions reset to default");
      setResetDialogOpen(false);
      handleOpenManageAccess(selectedType);
      loadBusinessTypes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  // Open Manage Roles modal for a business type
  const handleOpenManageRoles = async (bt: BusinessTypeItem) => {
    setSelectedTypeForRoles(bt);
    setLoadingRoles(true);
    setRoleSearch("");
    setRoleFilter("all");

    try {
      const res = await fetch(`/api/admin/business-type-access/${bt.id}/roles`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load roles for business type");

      setRolesList(json.roles || []);
      const initialMap: Record<number, boolean> = {};
      if (Array.isArray(json.roles)) {
        json.roles.forEach((r: any) => {
          initialMap[r.id] = Boolean(r.is_enabled);
        });
      }
      setRoleAccessMap(initialMap);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error loading roles");
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleToggleRole = (roleId: number) => {
    setRoleAccessMap((prev) => ({
      ...prev,
      [roleId]: !prev[roleId],
    }));
  };

  const handleSelectAllRoles = () => {
    setRoleAccessMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[Number(id)] = true;
      });
      return updated;
    });
  };

  const handleDeselectAllRoles = () => {
    setRoleAccessMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[Number(id)] = false;
      });
      return updated;
    });
  };

  const handleSaveRoles = async () => {
    if (!selectedTypeForRoles) return;
    setSavingRoles(true);

    try {
      const enabledIds = Object.entries(roleAccessMap)
        .filter(([, isEnabled]) => isEnabled)
        .map(([id]) => Number(id));

      const res = await fetch(`/api/admin/business-type-access/${selectedTypeForRoles.id}/roles`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ enabledRoleIds: enabledIds }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save role configuration");

      toast.success(json.message || "Role access configuration updated");
      setSelectedTypeForRoles(null);
      loadBusinessTypes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingRoles(false);
    }
  };

  const handleResetRolesToDefault = async () => {
    if (!selectedTypeForRoles) return;
    setResettingRoles(true);

    try {
      const res = await fetch(`/api/admin/business-type-access/${selectedTypeForRoles.id}/roles/reset`, {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Reset failed");

      toast.success(json.message || "Roles reset to default");
      setResetRolesDialogOpen(false);
      handleOpenManageRoles(selectedTypeForRoles);
      loadBusinessTypes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResettingRoles(false);
    }
  };

  // Create new Business Type
  const handleCreateBusinessType = async () => {
    if (!newTypeName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/admin/business-type-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          name: newTypeName.trim(),
          template: newTypeTemplate,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create business type");

      toast.success(json.message || "Business type created successfully");
      setCreateDialogOpen(false);
      setNewTypeName("");
      loadBusinessTypes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setCreating(false);
    }
  };

  // Filtered hierarchy for the Manage Access modal
  const filteredHierarchy = useMemo(() => {
    return modulesHierarchy
      .map((parent) => {
        const parentMatchesSearch =
          parent.module_name.toLowerCase().includes(moduleSearch.toLowerCase()) ||
          parent.description.toLowerCase().includes(moduleSearch.toLowerCase()) ||
          parent.route.toLowerCase().includes(moduleSearch.toLowerCase());

        const matchingChildren = parent.children.filter((child) => {
          const childMatchesSearch =
            child.module_name.toLowerCase().includes(moduleSearch.toLowerCase()) ||
            child.description.toLowerCase().includes(moduleSearch.toLowerCase()) ||
            child.route.toLowerCase().includes(moduleSearch.toLowerCase());

          const childIsEnabled = accessMap[child.id] ?? child.is_enabled;
          const childMatchesFilter =
            moduleFilter === "all" ||
            (moduleFilter === "enabled" && childIsEnabled) ||
            (moduleFilter === "disabled" && !childIsEnabled);

          return (parentMatchesSearch || childMatchesSearch) && childMatchesFilter;
        });

        const parentIsEnabled = accessMap[parent.id] ?? parent.is_enabled;
        const parentMatchesFilter =
          moduleFilter === "all" ||
          (moduleFilter === "enabled" && parentIsEnabled) ||
          (moduleFilter === "disabled" && !parentIsEnabled);

        if (parentMatchesSearch || matchingChildren.length > 0 || parentMatchesFilter) {
          return {
            ...parent,
            children: matchingChildren,
          };
        }
        return null;
      })
      .filter(Boolean) as SystemModuleParent[];
  }, [modulesHierarchy, moduleSearch, moduleFilter, accessMap]);

  // Filtered module list for the System Modules view
  const filteredModulesList = useMemo(() => {
    return allModulesList.filter((m) => {
      const matchesSearch =
        m.module_name.toLowerCase().includes(modulesListSearch.toLowerCase()) ||
        m.module_key.toLowerCase().includes(modulesListSearch.toLowerCase()) ||
        m.route.toLowerCase().includes(modulesListSearch.toLowerCase()) ||
        (m.parent_module_name && m.parent_module_name.toLowerCase().includes(modulesListSearch.toLowerCase())) ||
        (m.description && m.description.toLowerCase().includes(modulesListSearch.toLowerCase()));

      const matchesFilter =
        modulesListFilter === "all" ||
        (modulesListFilter === "parent" && !m.parent_module_id) ||
        (modulesListFilter === "child" && Boolean(m.parent_module_id));

      return matchesSearch && matchesFilter;
    });
  }, [allModulesList, modulesListSearch, modulesListFilter]);

  // Filtered roles list for the Roles Configuration modal
  const filteredRoles = useMemo(() => {
    return rolesList.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
        r.code.toLowerCase().includes(roleSearch.toLowerCase()) ||
        (r.scope_name && r.scope_name.toLowerCase().includes(roleSearch.toLowerCase())) ||
        (r.scope_code && r.scope_code.toLowerCase().includes(roleSearch.toLowerCase()));

      const isEnabled = roleAccessMap[r.id] ?? r.is_enabled;
      const matchesFilter =
        roleFilter === "all" ||
        (roleFilter === "enabled" && isEnabled) ||
        (roleFilter === "disabled" && !isEnabled);

      return matchesSearch && matchesFilter;
    });
  }, [rolesList, roleSearch, roleFilter, roleAccessMap]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <SlidersHorizontal className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Business Type Access Management</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Control which modules, tabs, and system operations are accessible to business owners and staff based on their registered business type.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Modules Button Highlighted by User */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenModulesModal}
            className="text-xs h-9 gap-1.5 font-bold border-red-500/30 text-red-600 dark:text-red-400 bg-red-50/50 hover:bg-red-100/50 dark:bg-red-950/20 shadow-xs"
          >
            <Layers className="size-3.5" />
            Modules
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
          >
            <Plus className="size-3.5" />
            Add Business Type
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadBusinessTypes}
            disabled={loading}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search & Info Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search business types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-600" />
          <span>Final Access = Business Type Access AND Role Permissions</span>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={categoryFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setCategoryFilter("all")}
          className="text-xs h-8 gap-1.5 cursor-pointer font-bold"
        >
          <span>All Business Types</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
            {businessTypes.length}
          </Badge>
        </Button>
        <Button
          variant={categoryFilter === "commercial" ? "default" : "outline"}
          size="sm"
          onClick={() => setCategoryFilter("commercial")}
          className="text-xs h-8 gap-1.5 cursor-pointer font-bold"
        >
          <span>Main Business Categories</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
            {businessTypes.filter((b) => !["coaching", "college", "institute", "school", "university"].includes(b.slug)).length}
          </Badge>
        </Button>
        <Button
          variant={categoryFilter === "academic" ? "default" : "outline"}
          size="sm"
          onClick={() => setCategoryFilter("academic")}
          className="text-xs h-8 gap-1.5 cursor-pointer font-bold"
        >
          <span>Academic Institutions</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            {businessTypes.filter((b) => ["coaching", "college", "institute", "school", "university"].includes(b.slug)).length}
          </Badge>
        </Button>
      </div>

      {/* Business Types Table */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Business Type / Category</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Total Modules</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Enabled Modules</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Disabled Modules</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Last Updated</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-right pr-6">Access Management</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center text-xs text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading business types...
                  </TableCell>
                </TableRow>
              ) : filteredBusinessTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center text-xs text-muted-foreground">
                    No business types found matching search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBusinessTypes.map((bt) => {
                  const percentEnabled = bt.total_modules > 0 ? Math.round((bt.enabled_modules / bt.total_modules) * 100) : 0;
                  const isAcademic = ["coaching", "college", "institute", "school", "university"].includes(bt.slug);
                  return (
                    <TableRow key={bt.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className={`size-7 rounded-md flex items-center justify-center shrink-0 ${
                            isAcademic 
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                          }`}>
                            <Building2 className="size-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-foreground text-sm">{bt.name}</span>
                              {isAcademic ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200">
                                  Academic
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border-sky-200">
                                  Business Category
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">slug: {bt.slug}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold">
                        <Badge variant="outline" className="font-mono text-xs">
                          {bt.total_modules}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 font-mono text-xs gap-1">
                          <CheckCircle2 className="size-3" />
                          {bt.enabled_modules} ({percentEnabled}%)
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {bt.disabled_modules > 0 ? (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-mono text-xs gap-1">
                            <XCircle className="size-3" />
                            {bt.disabled_modules}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {bt.last_updated ? new Date(bt.last_updated).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }) : "—"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenManageRoles(bt)}
                            className="h-8 text-xs font-semibold gap-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-50/50 hover:bg-purple-100/50 dark:bg-purple-950/20 shadow-2xs"
                            title="Configure allowed roles for this business type"
                          >
                            <UserCog className="size-3.5" />
                            Roles
                            {bt.enabled_roles != null && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-mono bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                                {bt.enabled_roles}
                              </Badge>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenManageAccess(bt)}
                            className="h-8 text-xs font-semibold gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                          >
                            <SlidersHorizontal className="size-3.5" />
                            Manage Access
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- ALL MODULES MANAGEMENT MODAL (TRIGGERED BY "MODULES" BUTTON) --- */}
      <Dialog open={modulesModalOpen} onOpenChange={setModulesModalOpen}>
        <DialogContent className="max-w-5xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                  <Layers className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">System Modules & Navigation Tabs</DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    View all platform modules, inspect routing & hierarchy, or register new system modules.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleOpenCreateModule}
                  className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-bold shadow-xs"
                >
                  <Plus className="size-3.5" />
                  Create New Module
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAllModules}
                  disabled={loadingAllModules}
                  className="text-xs h-8 gap-1"
                >
                  <RefreshCw className={`size-3 ${loadingAllModules ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search modules, keys, routes..."
                  value={modulesListSearch}
                  onChange={(e) => setModulesListSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Select value={modulesListFilter} onValueChange={(v: any) => setModulesListFilter(v)}>
                  <SelectTrigger className="h-8 text-xs w-52 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Top-Level Parents Only ({allModulesList.filter((m) => !m.parent_module_id).length})</SelectItem>
                    <SelectItem value="all">All Modules & Tabs ({allModulesList.length})</SelectItem>
                    <SelectItem value="child">Child Submodules Only ({allModulesList.filter((m) => Boolean(m.parent_module_id)).length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Module Table Body */}
          <div className="flex-1 overflow-y-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                  <TableHead className="font-bold uppercase tracking-wider text-muted-foreground">Module Name & Key</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-muted-foreground">Hierarchy</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-muted-foreground">Route Path</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-muted-foreground text-center">Order</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-muted-foreground text-center">Enabled In</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-muted-foreground text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAllModules ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-44 text-center text-xs text-muted-foreground">
                      <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading system modules...
                    </TableCell>
                  </TableRow>
                ) : filteredModulesList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-44 text-center text-xs text-muted-foreground">
                      No system modules found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredModulesList.map((mod) => {
                    const isParent = !mod.parent_module_id;
                    const isExpanded = expandedParentModuleIds.includes(mod.id);
                    const childModules = isParent ? allModulesList.filter((m) => m.parent_module_id === mod.id) : [];

                    return (
                      <React.Fragment key={mod.id}>
                        <TableRow className="hover:bg-muted/20 text-xs transition-colors">
                          <TableCell className="font-medium py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`size-7 rounded-md flex items-center justify-center font-bold text-[10px] ${isParent ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground"}`}>
                                {mod.icon ? mod.icon.slice(0, 2).toUpperCase() : "MD"}
                              </div>
                              <div>
                                <div className="font-bold text-foreground flex items-center gap-1.5">
                                  {mod.module_name}
                                  {isParent && mod.children_count > 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setExpandedParentModuleIds((prev) =>
                                          prev.includes(mod.id) ? prev.filter((id) => id !== mod.id) : [...prev, mod.id]
                                        );
                                      }}
                                      className="text-[9px] px-1.5 py-0 h-5 font-normal flex items-center gap-1 cursor-pointer hover:bg-muted"
                                      title={isExpanded ? "Collapse submodules" : "Expand submodules"}
                                    >
                                      <span>{mod.children_count} tabs</span>
                                      <ChevronDown className={`size-2.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                    </Button>
                                  )}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                  <Code className="size-2.5 text-muted-foreground/70" />
                                  {mod.module_key}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isParent ? (
                              <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 font-medium">
                                Top-Level Parent
                              </Badge>
                            ) : (
                              <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                                <span>Child of</span>
                                <Badge variant="secondary" className="text-[10px] font-medium">
                                  {mod.parent_module_name || `Parent #${mod.parent_module_id}`}
                                </Badge>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-[10px] bg-muted/40 max-w-[200px] truncate block">
                              {mod.route || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                            {mod.display_order ?? "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`font-mono text-[10px] ${
                                mod.enabled_business_types_count === mod.total_business_types_count
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                              }`}
                            >
                              {mod.enabled_business_types_count} / {mod.total_business_types_count} Types
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditModule(mod)}
                                className="size-7 p-0 text-muted-foreground hover:text-foreground"
                                title="Edit Module"
                              >
                                <Edit2 className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteModuleTarget(mod)}
                                className="size-7 p-0 text-muted-foreground hover:text-red-600"
                                title="Delete Module"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Nested Child Rows when Expanded */}
                        {isParent && isExpanded && childModules.map((cMod) => (
                          <TableRow key={`child-${cMod.id}`} className="bg-muted/10 hover:bg-muted/30 text-xs transition-colors border-l-2 border-l-primary/40">
                            <TableCell className="font-medium py-2 pl-10">
                              <div className="flex items-center gap-2">
                                <div className="text-muted-foreground font-mono text-xs">└─</div>
                                <div>
                                  <div className="font-medium text-foreground text-xs flex items-center gap-1.5">
                                    {cMod.module_name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    {cMod.module_key}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[9px] font-normal text-muted-foreground">
                                Sub-tab of {mod.module_name}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-[9px] bg-background max-w-[200px] truncate block text-muted-foreground">
                                {cMod.route || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-mono text-[10px] text-muted-foreground">
                              {cMod.display_order ?? "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className="font-mono text-[9px]"
                              >
                                {cMod.enabled_business_types_count} / {cMod.total_business_types_count} Types
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditModule(cMod)}
                                  className="size-6 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit Submodule"
                                >
                                  <Edit2 className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteModuleTarget(cMod)}
                                  className="size-6 p-0 text-muted-foreground hover:text-red-600"
                                  title="Delete Submodule"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing <strong>{filteredModulesList.length}</strong> {modulesListFilter === "parent" ? "top-level parent" : modulesListFilter === "child" ? "child submodule" : ""} modules ({allModulesList.length} total registered).
            </span>
            <Button variant="outline" size="sm" onClick={() => setModulesModalOpen(false)} className="text-xs h-8">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- CREATE / EDIT MODULE DIALOG --- */}
      <Dialog open={moduleFormOpen} onOpenChange={setModuleFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingModuleId ? "Edit System Module" : "Create New System Module"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingModuleId
                ? "Update module details, navigation routing, and hierarchy."
                : "Register a new navigation module or submodule to the platform and define default business type access."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Module Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Module Name *</Label>
              <Input
                placeholder="e.g. Inventory Management, Batch Timetable, Client Invoicing"
                value={formModuleName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Module Key */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Module Key (Unique identifier) *
              </Label>
              <Input
                placeholder="e.g. operations_inventory"
                value={formModuleKey}
                disabled={Boolean(editingModuleId)}
                onChange={(e) => setFormModuleKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                className="h-9 text-xs font-mono"
              />
              <span className="text-[10px] text-muted-foreground">
                Internal programmatic key used for permissions and dynamic access mapping.
              </span>
            </div>

            {/* Parent Module */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Parent Module</Label>
              <Select value={formParentId} onValueChange={setFormParentId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top-Level Parent Module)</SelectItem>
                  {parentOptions
                    .filter((p) => p.id !== editingModuleId)
                    .map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        Child of: {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Route URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Route URL Path</Label>
              <Input
                placeholder="e.g. /admin/inventory or /admin/operations/inventory"
                value={formRoute}
                onChange={(e) => setFormRoute(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            {/* Icon & Display Order */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Icon Name</Label>
                <Input
                  placeholder="e.g. Layers, Boxes, Store"
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Display Order</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={formDisplayOrder}
                  onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
              <Input
                placeholder="Brief description of what this module does..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Business Type Initial Access (Only on Create) */}
            {!editingModuleId && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Initial Business Type Availability
                </Label>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="enable-all-types"
                      checked={formEnableForAll}
                      onCheckedChange={(checked) => setFormEnableForAll(Boolean(checked))}
                    />
                    <Label htmlFor="enable-all-types" className="text-xs font-medium cursor-pointer">
                      Enable for all current business types by default
                    </Label>
                  </div>

                  {!formEnableForAll && (
                    <div className="pl-6 pt-1 space-y-1.5 max-h-36 overflow-y-auto border p-2 rounded-md bg-muted/20">
                      {businessTypes.map((bt) => {
                        const isChecked = formSelectedTypes.includes(bt.id);
                        return (
                          <div key={bt.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`bt-${bt.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                setFormSelectedTypes((prev) =>
                                  checked ? [...prev, bt.id] : prev.filter((id) => id !== bt.id)
                                );
                              }}
                            />
                            <Label htmlFor={`bt-${bt.id}`} className="text-xs cursor-pointer">
                              {bt.name}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setModuleFormOpen(false)} disabled={savingModule} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveModule} disabled={savingModule || !formModuleName.trim()} className="text-xs gap-1.5 font-bold">
              {savingModule && <Loader2 className="size-3.5 animate-spin" />}
              {editingModuleId ? "Save Changes" : "Create Module"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Module Confirmation Dialog */}
      <AlertDialog open={!!deleteModuleTarget} onOpenChange={(open) => !open && setDeleteModuleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-5" />
              Delete System Module?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete the module <strong>{deleteModuleTarget?.module_name}</strong> ({deleteModuleTarget?.module_key})? This will remove its access mappings across all business types.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingModule} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModule}
              disabled={deletingModule}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {deletingModule && <Loader2 className="size-3.5 animate-spin mr-1" />}
              Delete Module
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- CREATE BUSINESS TYPE DIALOG --- */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Business Type</DialogTitle>
            <DialogDescription className="text-xs">
              Create a new business classification. Module access will be configured automatically with standard defaults.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Business Type Name</Label>
              <Input
                placeholder="e.g. IT & Digital Agency, Dental Clinic, Legal Firm..."
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Initial Permission Template</Label>
              <Select value={newTypeTemplate} onValueChange={(v: any) => setNewTypeTemplate(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commercial">Commercial Business (Excludes Academic Classroom/Students)</SelectItem>
                  <SelectItem value="academic">Academic Institution (Enables all Classroom, Students & Courses)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)} disabled={creating} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateBusinessType} disabled={creating || !newTypeName.trim()} className="text-xs gap-1.5 font-bold">
              {creating && <Loader2 className="size-3.5 animate-spin" />}
              Create Business Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MANAGE ACCESS FOR BUSINESS TYPE MODAL --- */}
      <Dialog open={!!selectedType} onOpenChange={(open) => !open && setSelectedType(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <SlidersHorizontal className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">
                    Configure Access: {selectedType?.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    Enable or disable specific modules and sub-tabs for business accounts registered under this business type.
                  </DialogDescription>
                </div>
              </div>

              <Badge variant="outline" className="font-mono text-xs uppercase">
                {selectedType?.slug}
              </Badge>
            </div>

            {/* Quick Actions & Search bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search modules & tabs..."
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
                <Select value={moduleFilter} onValueChange={(v: any) => setModuleFilter(v)}>
                  <SelectTrigger className="h-8 text-[11px] w-28 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    <SelectItem value="enabled">Enabled Only</SelectItem>
                    <SelectItem value="disabled">Disabled Only</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={handleSelectAll} className="h-8 text-[11px] px-2.5">
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll} className="h-8 text-[11px] px-2.5">
                  Deselect All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResetDialogOpen(true)}
                  className="h-8 text-[11px] px-2.5 text-amber-600 hover:text-amber-700 gap-1"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Module List Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loadingModules ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                <Loader2 className="size-8 animate-spin mx-auto mb-2 text-primary" />
                Loading module hierarchy...
              </div>
            ) : filteredHierarchy.length === 0 ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                No system modules matched your filter.
              </div>
            ) : (
              filteredHierarchy.map((parent) => {
                const parentEnabled = accessMap[parent.id] ?? parent.is_enabled;
                const childIds = parent.children.map((c) => c.id);

                return (
                  <Card key={parent.id} className={`border transition-all shadow-2xs ${parentEnabled ? "border-border/80 bg-card" : "border-muted bg-muted/20 opacity-80"}`}>
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded-lg flex items-center justify-center font-bold text-xs ${parentEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {parent.module_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{parent.module_name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 bg-muted/40">
                              {parent.route}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{parent.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label htmlFor={`switch-${parent.id}`} className="text-xs font-semibold cursor-pointer">
                          {parentEnabled ? "Enabled" : "Disabled"}
                        </Label>
                        <Switch
                          id={`switch-${parent.id}`}
                          checked={parentEnabled}
                          onCheckedChange={() => handleToggleModule(parent.id, true, childIds)}
                        />
                      </div>
                    </CardHeader>

                    {/* Children submodules */}
                    {parent.children.length > 0 && (
                      <CardContent className="pt-0 pb-3 px-4 border-t bg-muted/10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
                          {parent.children.map((child) => {
                            const childEnabled = accessMap[child.id] ?? child.is_enabled;
                            return (
                              <div
                                key={child.id}
                                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all ${
                                  childEnabled && parentEnabled
                                    ? "bg-background border-border/80"
                                    : "bg-muted/40 border-dashed border-border/40 opacity-70"
                                }`}
                              >
                                <div className="space-y-0.5 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <ChevronRight className="size-3 text-muted-foreground" />
                                    <span className="font-semibold text-foreground">{child.module_name}</span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">
                                    {child.route}
                                  </span>
                                </div>

                                <Switch
                                  checked={childEnabled && parentEnabled}
                                  disabled={!parentEnabled}
                                  onCheckedChange={() => handleToggleModule(child.id, false)}
                                  className="scale-90"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Changes apply instantly across all business accounts of this type.
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedType(null)}
                disabled={savingAccess}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveChanges}
                disabled={savingAccess}
                className="text-xs h-8 gap-1.5 font-bold"
              >
                {savingAccess && <Loader2 className="size-3.5 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- RESET CONFIRMATION ALERT DIALOG --- */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="size-5" />
              Reset Module Access to Default?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to reset all module permissions for <strong>{selectedType?.name}</strong> to the standard system defaults? Any custom module overrides will be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetToDefault}
              disabled={resetting}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {resetting && <Loader2 className="size-3.5 animate-spin mr-1" />}
              Confirm Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- CONFIGURE ROLES MODAL (TRIGGERED BY "ROLES" BUTTON PER BUSINESS TYPE) --- */}
      <Dialog open={!!selectedTypeForRoles} onOpenChange={(open) => !open && setSelectedTypeForRoles(null)}>
        <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <UserCog className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">
                    Configure Allowed Roles: {selectedTypeForRoles?.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    Select which roles are valid and assignable for businesses under{" "}
                    <code className="text-primary font-mono font-bold uppercase">{selectedTypeForRoles?.slug}</code>.
                    Unchecked roles will be hidden from staff and user creation dropdowns.
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search roles by name or code..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <Select value={roleFilter} onValueChange={(val: any) => setRoleFilter(val)}>
                  <SelectTrigger className="h-8 text-xs w-[130px] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="enabled">Enabled Only</SelectItem>
                    <SelectItem value="disabled">Disabled Only</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllRoles}
                  className="h-8 text-[11px] px-2.5 gap-1 bg-background"
                >
                  <CheckSquare className="size-3" />
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAllRoles}
                  className="h-8 text-[11px] px-2.5 gap-1 bg-background"
                >
                  <Square className="size-3" />
                  Deselect All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResetRolesDialogOpen(true)}
                  className="h-8 text-[11px] px-2.5 text-amber-600 hover:text-amber-700 gap-1 bg-background"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Roles Grid Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {loadingRoles ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                <Loader2 className="size-8 animate-spin mx-auto mb-2 text-primary" />
                Loading roles for {selectedTypeForRoles?.name}...
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                No roles matched your search criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredRoles.map((role) => {
                  const isEnabled = roleAccessMap[role.id] ?? role.is_enabled;
                  return (
                    <div
                      key={role.id}
                      onClick={() => handleToggleRole(role.id)}
                      className={`cursor-pointer select-none rounded-lg border p-3 transition-all flex flex-col justify-between gap-2 ${
                        isEnabled
                          ? "bg-card border-purple-500/40 shadow-xs hover:border-purple-500"
                          : "bg-muted/30 border-muted/80 opacity-65 hover:opacity-90"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="font-semibold text-xs text-foreground leading-tight">
                            {role.name}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {role.code}
                          </div>
                        </div>

                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleToggleRole(role.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="scale-90 data-[state=checked]:bg-purple-600"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                        <span className="capitalize">{role.scope_code || "institution"} scope</span>
                        <span className={`font-semibold ${isEnabled ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"}`}>
                          {isEnabled ? "Allowed" : "Hidden"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {Object.values(roleAccessMap).filter(Boolean).length} roles enabled for {selectedTypeForRoles?.name}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTypeForRoles(null)}
                disabled={savingRoles}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveRoles}
                disabled={savingRoles}
                className="text-xs h-8 gap-1.5 font-bold bg-purple-600 hover:bg-purple-700 text-white"
              >
                {savingRoles && <Loader2 className="size-3.5 animate-spin" />}
                Save Role Access
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- RESET ROLES CONFIRMATION ALERT DIALOG --- */}
      <AlertDialog open={resetRolesDialogOpen} onOpenChange={setResetRolesDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="size-5" />
              Reset Role Access to Default?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to reset all role permissions for <strong>{selectedTypeForRoles?.name}</strong> to the standard defaults? Academic roles will be enabled for education types and disabled for commercial/service types.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resettingRoles} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetRolesToDefault}
              disabled={resettingRoles}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {resettingRoles && <Loader2 className="size-3.5 animate-spin mr-1" />}
              Confirm Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
