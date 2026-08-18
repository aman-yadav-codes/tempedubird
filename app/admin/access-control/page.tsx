"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight, Info, Loader2, MoreHorizontal, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAuthStore } from "@/store";
import { getApiErrorMessage, readJsonResponse } from "@/lib/auth/client-permission-errors";
import { cn } from "@/lib/utils";
import {
  FULL_ACCESS_PERMISSION,
  getPageViewPermission,
  getPermissionName,
  isInstitutionScopedPermission,
  isAdminPathVisibleForRole,
  isPermissionAssignableToRole,
  isPlatformOnlyPermission,
} from "@/lib/auth/permissions";
import { toRoleRoutePath } from "@/lib/auth/role-routes";

type ResourceKey =
  | "scope-types"
  | "permissions"
  | "roles"
  | "role-permissions"
  | "institution-memberships"
  | "institution-role-permissions"
  | "personal-permissions";

type PermissionSummary = {
  permission_id: number;
  permission_code: string;
  permission_name: string;
};
type AccessRow = Record<string, string | number | boolean | PermissionSummary[] | null>;
type AccessOptions = {
  scopes: Option[];
  roles: Option[];
  institutionRoles: Option[];
  permissions: Option[];
  institutions: Option[];
  users: Option[];
};
type Option = Record<string, string | number | number[] | null>;
type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "multi-select" | "checkbox";
  optionKey?: keyof AccessOptions;
  required?: boolean;
};
type OptionKey = keyof AccessOptions;
type ResourceConfig = {
  title: string;
  description: string;
  addLabel: string;
  searchKey: string;
  fields: Field[];
  columns: { key: string; label: string; kind?: "badge" | "boolean" | "scope" }[];
  canEdit?: boolean;
  canToggle?: boolean;
};

const defaultOptions: AccessOptions = {
  scopes: [],
  roles: [],
  institutionRoles: [],
  permissions: [],
  institutions: [],
  users: [],
};

const resources: Record<ResourceKey, ResourceConfig> = {
  "scope-types": {
    title: "Scope Types",
    description: "Manage dynamic role scopes like platform and institution.",
    addLabel: "Add Scope",
    searchKey: "name",
    canEdit: true,
    canToggle: true,
    fields: [
      { name: "code", label: "Code", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
    columns: [
      { key: "code", label: "Code", kind: "badge" },
      { key: "name", label: "Name" },
      { key: "is_active", label: "Status", kind: "boolean" },
      { key: "created_at", label: "Created" },
    ],
  },
  permissions: {
    title: "Permissions",
    description: "Manage permission codes used by APIs, menus, pages, and widgets.",
    addLabel: "Add Permission",
    searchKey: "code",
    canEdit: true,
    fields: [
      { name: "code", label: "Code", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
    ],
    columns: [
      { key: "code", label: "Code", kind: "badge" },
      { key: "scope_code", label: "Scope", kind: "scope" },
      { key: "name", label: "Name" },
      { key: "description", label: "Description" },
      { key: "created_at", label: "Created" },
    ],
  },
  roles: {
    title: "Roles",
    description: "Manage platform and institution roles with their dynamic scope.",
    addLabel: "Add Role",
    searchKey: "name",
    canEdit: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "code", label: "Code", type: "text", required: true },
      { name: "scope_id", label: "Scope", type: "select", optionKey: "scopes", required: true },
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "code", label: "Code", kind: "badge" },
      { key: "scope_name", label: "Scope" },
    ],
  },
  "role-permissions": {
    title: "Role Permissions",
    description: "Manage default permission mappings for each role.",
    addLabel: "Add Mapping",
    searchKey: "role_name",
    canEdit: true,
    fields: [
      { name: "role_id", label: "Role", type: "select", optionKey: "roles", required: true },
      { name: "permission_ids", label: "Permissions", type: "multi-select", optionKey: "permissions", required: true },
    ],
    columns: [
      { key: "role_name", label: "Role" },
      { key: "role_code", label: "Role Code", kind: "badge" },
      { key: "permission_count", label: "Permissions" },
    ],
  },
  "institution-memberships": {
    title: "Institution Memberships",
    description: "Assign institution-specific roles to users.",
    addLabel: "Add Membership",
    searchKey: "user_name",
    canEdit: true,
    canToggle: true,
    fields: [
      { name: "institution_id", label: "Institution", type: "select", optionKey: "institutions", required: true },
      { name: "user_id", label: "User", type: "select", optionKey: "users", required: true },
      { name: "role_id", label: "Institution Role", type: "select", optionKey: "institutionRoles", required: true },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
    columns: [
      { key: "institution_name", label: "Institution" },
      { key: "user_name", label: "User" },
      { key: "user_email", label: "Email" },
      { key: "role_name", label: "Role" },
      { key: "is_active", label: "Status", kind: "boolean" },
    ],
  },
  "institution-role-permissions": {
    title: "Institution Role Permissions",
    description: "Override default role permissions for a specific institution.",
    addLabel: "Add Override",
    searchKey: "institution_name",
    canEdit: true,
    fields: [
      { name: "institution_id", label: "Institution", type: "select", optionKey: "institutions", required: true },
      { name: "role_id", label: "Institution Role", type: "select", optionKey: "institutionRoles", required: true },
      { name: "permission_ids", label: "Permissions", type: "multi-select", optionKey: "permissions", required: true },
    ],
    columns: [
      { key: "institution_name", label: "Institution" },
      { key: "role_name", label: "Role" },
      { key: "permission_count", label: "Overrides" },
    ],
  },
  "personal-permissions": {
    title: "Personal Permissions",
    description: "Grant extra institution permissions to a specific institution admin.",
    addLabel: "Add Personal Permissions",
    searchKey: "user_name",
    canEdit: true,
    fields: [
      { name: "institution_id", label: "Institution", type: "select", optionKey: "institutions", required: true },
      { name: "user_id", label: "Institution Admin", type: "select", optionKey: "users", required: true },
      { name: "permission_ids", label: "Personal Permissions", type: "multi-select", optionKey: "permissions" },
    ],
    columns: [
      { key: "institution_name", label: "Institution" },
      { key: "user_name", label: "Institution Admin" },
      { key: "user_email", label: "Email" },
      { key: "role_name", label: "Institution Role" },
      { key: "personal_permission_count", label: "Personal Permissions" },
    ],
  },
};

const institutionContextResources = new Set<ResourceKey>([
  "institution-memberships",
  "institution-role-permissions",
  "personal-permissions",
]);

const resourceOrder = Object.keys(resources) as ResourceKey[];
const resourcePages: Record<ResourceKey, string> = {
  "scope-types": "/admin/access-control/scope-types",
  permissions: "/admin/access-control/permissions",
  roles: "/admin/access-control/roles",
  "role-permissions": "/admin/access-control/role-permissions",
  "institution-memberships": "/admin/access-control/institution-memberships",
  "institution-role-permissions": "/admin/access-control/institution-role-permissions",
  "personal-permissions": "/admin/access-control/personal-permissions",
};

const resourcePermissionModules: Record<ResourceKey, string> = {
  "scope-types": "rolespermissions.scopetypes",
  permissions: "rolespermissions.permissions",
  roles: "rolespermissions.roles",
  "role-permissions": "rolespermissions.rolepermissions",
  "institution-memberships": "rolespermissions.institutionmemberships",
  "institution-role-permissions": "rolespermissions.institutionrolepermissions",
  "personal-permissions": "rolespermissions.personalpermissions",
};

function getResourceOptionKeys(config: ResourceConfig) {
  return Array.from(
    new Set(
      config.fields
        .map((field) => field.optionKey)
        .filter((optionKey): optionKey is OptionKey => Boolean(optionKey))
    )
  );
}

function getResource(value: string | null): ResourceKey {
  return resourceOrder.includes(value as ResourceKey)
    ? (value as ResourceKey)
    : "scope-types";
}

function getRowId(row: AccessRow) {
  return String(row.id);
}

function formatValue(value: AccessRow[string]) {
  if (Array.isArray(value)) return `${value.length} permissions`;
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return String(value);
}

function getPermissionSummaries(row: AccessRow | null) {
  const permissions = row?.permissions;
  return Array.isArray(permissions) ? permissions : [];
}

function getDefaultPermissionSummaries(row: AccessRow | null) {
  const permissions = row?.default_permissions;
  return Array.isArray(permissions) ? permissions : [];
}

function getDeniedPermissionSummaries(row: AccessRow | null) {
  const permissions = row?.denied_permissions;
  return Array.isArray(permissions) ? permissions : [];
}

function uniquePermissionSummaries(permissions: PermissionSummary[]) {
  return Array.from(
    new Map(
      permissions.map((permission) => [permission.permission_id, permission])
    ).values()
  );
}

function PermissionCard({
  permission,
  tone = "neutral",
}: {
  permission: PermissionSummary;
  tone?: "default" | "override" | "removed" | "neutral";
}) {
  const toneClassName = {
    default: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100",
    override: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100",
    removed: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100",
    neutral: "border-border bg-card",
  }[tone];
  const badgeClassName = {
    default: "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
    override: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    removed: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
    neutral: "",
  }[tone];

  return (
    <div className={cn("rounded-md border p-3", toneClassName)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="outline" className={badgeClassName}>
          {permission.permission_code}
        </Badge>
        <span className={cn("text-xs", tone === "neutral" ? "text-muted-foreground" : "opacity-75")}>
          ID: {permission.permission_id}
        </span>
      </div>
      <p className="mt-2 font-medium">{permission.permission_name}</p>
    </div>
  );
}

function optionLabel(option: Option) {
  const email = option.email ? ` (${option.email})` : "";
  const code = option.code ? ` - ${option.code}` : "";
  return `${option.name ?? option.full_name ?? option.code ?? option.slug ?? option.id}${email}${code}`;
}

function optionDefaultPermissionIds(option: Option | undefined) {
  const ids = option?.default_permission_ids;
  if (!Array.isArray(ids)) return [];
  return ids
    .map((id) => String(id))
    .filter(Boolean);
}

function getAllowedPermissionIdsForRole(
  permissions: Option[],
  roleScope: string | null,
  roleCode?: string | null
) {
  return new Set(
    filterPermissionsForRoleScope(permissions, roleScope, roleCode)
      .map((permission) => String(permission.id))
  );
}

function findRoleOption(
  options: AccessOptions,
  roleId: string | number | boolean | string[] | undefined
) {
  return [...options.roles, ...options.institutionRoles].find((option) =>
    String(option.id) === String(roleId)
  );
}

function getRoleDefaultPermissionIdSet(
  options: AccessOptions,
  roleId: string | number | boolean | string[] | undefined
) {
  return new Set(optionDefaultPermissionIds(findRoleOption(options, roleId)));
}

function getPermissionScopeLabel(code: string, roleScope?: string | null) {
  if (code === FULL_ACCESS_PERMISSION) {
    return roleScope === "institution" ? "Full institution access" : "Full system access";
  }
  return isInstitutionScopedPermission(code) ? "Institution" : "Platform";
}

function toMultiSelectOption(option: Option, roleScope?: string | null): MultiSelectOption {
  const code = option.code ? String(option.code) : "";
  const scopeLabel = code ? getPermissionScopeLabel(code, roleScope) : null;

  return {
    value: String(option.id),
    label: code ? getPermissionName(code) : optionLabel(option),
    description: code,
    badge: scopeLabel,
  };
}

function getRoleScope(
  options: AccessOptions,
  roleId: string | number | boolean | string[] | undefined,
  fallbackRow: AccessRow | null,
  forceInstitutionScope = false
) {
  if (forceInstitutionScope) return "institution";
  const role = findRoleOption(options, roleId);
  const scope = role?.scope_code ?? fallbackRow?.scope_code;
  return typeof scope === "string" ? scope : null;
}

function getRoleCode(
  options: AccessOptions,
  roleId: string | number | boolean | string[] | undefined,
  fallbackRow: AccessRow | null
) {
  const role = findRoleOption(options, roleId);
  const code = role?.code ?? fallbackRow?.role_code;
  return typeof code === "string" ? code : null;
}

function filterPermissionsForRoleScope(
  permissions: Option[],
  roleScope: string | null,
  roleCode?: string | null
) {
  if (!roleScope) return permissions;

  return permissions.filter((permission) => {
    const code = permission.code ? String(permission.code) : "";
    if (!isPermissionAssignableToRole(code, roleCode, roleScope)) return false;
    return roleScope === "institution"
      ? !isPlatformOnlyPermission(code)
      : isPlatformOnlyPermission(code);
  });
}

function getPermissionOptionsForField(
  configTitle: string,
  permissions: Option[],
  roleScope: string | null,
  roleCode: string | null,
  defaultPermissionIds: Set<string>
) {
  const scopedPermissions = filterPermissionsForRoleScope(permissions, roleScope, roleCode);
  if (configTitle !== "Institution Role Permissions") return scopedPermissions;
  if (defaultPermissionIds.size === 0) return [];
  return scopedPermissions.filter((permission) => defaultPermissionIds.has(String(permission.id)));
}

function getPermissionCoverageForRow(
  configTitle: string,
  row: AccessRow,
  options: AccessOptions
) {
  const roleScope = configTitle === "Institution Role Permissions" || configTitle === "Personal Permissions"
    ? "institution"
    : typeof row.scope_code === "string"
      ? row.scope_code
      : null;
  const roleCode = typeof row.role_code === "string" ? row.role_code : null;
  const defaultPermissionIds = new Set(
    getDefaultPermissionSummaries(row).map((permission) => String(permission.permission_id))
  );
  const allowedPermissions = getPermissionOptionsForField(
    configTitle,
    options.permissions,
    roleScope,
    roleCode,
    defaultPermissionIds
  );
  const allowedPermissionIds = new Set(allowedPermissions.map((permission) => String(permission.id)));
  const assignedCount = getPermissionSummaries(row).filter((permission) =>
    allowedPermissionIds.has(String(permission.permission_id))
  ).length;

  return {
    assignedCount,
    totalCount: allowedPermissions.length,
  };
}

function getSelectedPermissionOptions(
  row: AccessRow | null,
  selectedValues: string[],
  options: AccessOptions,
  roleScope?: string | null
) {
  const rowOptions = getPermissionSummaries(row).map((permission) => ({
    value: String(permission.permission_id),
    label: getPermissionName(permission.permission_code),
    description: permission.permission_code,
    badge: getPermissionScopeLabel(permission.permission_code, roleScope),
  }));
  const optionMap = new Map<string, MultiSelectOption>();

  for (const option of [...rowOptions, ...options.permissions.map((item) => toMultiSelectOption(item, roleScope))]) {
    optionMap.set(option.value, option);
  }

  return selectedValues.map((value) => optionMap.get(value) ?? {
    value,
    label: `Permission ${value}`,
  });
}

function getSelectedLabel(field: Field, value: string | boolean | string[] | undefined, row: AccessRow | null, options: AccessOptions) {
  if (!field.optionKey || !value) return "";

  const local = options[field.optionKey].find((option) => String(option.id) === String(value));
  if (local) return optionLabel(local);

  const labelMap: Record<string, string[]> = {
    scope_id: ["scope_name", "scope_code"],
    role_id: ["role_name", "role_code"],
    permission_id: ["permission_name", "permission_code"],
    institution_id: ["institution_name"],
    user_id: ["user_name", "user_email"],
    id: ["institution_name", "slug"],
  };

  const labels = (labelMap[field.name] ?? [])
    .map((key) => row?.[key])
    .filter((item) => item != null && item !== "")
    .map(String);

  return labels.join(" - ");
}

function SortHeader({ label, column }: { label: string; column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" } }) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="-ml-3 h-8 px-3"
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
}

function buildInitialForm(config: ResourceConfig, row: AccessRow | null) {
  const next: Record<string, string | boolean | string[]> = {};
  for (const field of config.fields) {
    if (field.type === "checkbox") {
      next[field.name] = row ? Boolean(row[field.name]) : true;
    } else if (field.type === "multi-select") {
      const permissions =
        row && config.title === "Institution Role Permissions"
          ? [
              ...getDefaultPermissionSummaries(row).filter(
                (permission) =>
                  !getDeniedPermissionSummaries(row).some(
                    (denied) => denied.permission_id === permission.permission_id
                  )
              ),
              ...getPermissionSummaries(row),
            ]
          : row && config.title === "Personal Permissions"
            ? uniquePermissionSummaries([
                ...getDefaultPermissionSummaries(row),
                ...getPermissionSummaries(row),
              ])
          : row
            ? getPermissionSummaries(row)
            : [];
      next[field.name] = permissions
        .filter((permission) =>
          isPermissionAssignableToRole(
            permission.permission_code,
            typeof row?.role_code === "string" ? row.role_code : null,
            typeof row?.scope_code === "string" ? row.scope_code : null
          ) &&
          (
            row?.scope_code === "institution"
              ? !isPlatformOnlyPermission(permission.permission_code)
              : true
          )
        )
        .map((permission) => String(permission.permission_id));
    } else {
      next[field.name] = row?.[field.name] == null ? "" : String(row[field.name]);
    }
  }
  return next;
}

function shouldLockFieldInEdit(config: ResourceConfig, field: Field, row: AccessRow | null) {
  if (!row) return false;
  if (config.title === "Role Permissions") return field.name === "role_id";
  if (config.title === "Institution Role Permissions") return field.name === "institution_id" || field.name === "role_id";
  if (config.title === "Personal Permissions") return field.name === "institution_id" || field.name === "user_id";
  return false;
}

function getDialogSelectPlacement(config: ResourceConfig) {
  if (config.title !== "Institution Memberships") return {};

  return {
    side: "bottom" as const,
    avoidCollisions: false,
    popoverClassName: "max-h-none",
    commandClassName: "max-h-[min(260px,calc(100dvh-360px))]",
  };
}

function AccessFormDialog({
  config,
  options,
  optionsLoading,
  row,
  open,
  onOpenChange,
  onSubmit,
  fetchOptions,
  activeInstitution,
}: {
  config: ResourceConfig;
  options: AccessOptions;
  optionsLoading: boolean;
  row: AccessRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: BodyInitPayload) => Promise<void>;
  fetchOptions: (
    type: OptionKey,
    search: string,
    page: number,
    filters?: { institutionId?: string }
  ) => Promise<{ data: Option[]; hasMore: boolean }>;
  activeInstitution?: { id: number; name: string } | null;
}) {
  const [form, setForm] = useState<Record<string, string | boolean | string[]>>(() =>
    buildInitialForm(config, row)
  );
  const [saving, setSaving] = useState(false);
  const selectedPermissionValues = Array.isArray(form.permission_ids)
    ? form.permission_ids.map(String)
    : [];
  const selectedRoleScope = getRoleScope(
    options,
    form.role_id,
    row,
    config.title === "Institution Role Permissions" ||
      config.title === "Personal Permissions"
  );
  const selectedRoleCode = getRoleCode(options, form.role_id, row);
  const selectedRoleDefaultPermissionIds = getRoleDefaultPermissionIdSet(options, form.role_id);
  const allowedPermissionOptions = getPermissionOptionsForField(
    config.title,
    options.permissions,
    selectedRoleScope,
    selectedRoleCode,
    selectedRoleDefaultPermissionIds
  );
  const allowedPermissionIds = new Set(
    allowedPermissionOptions.map((permission) => String(permission.id))
  );
  const assignedPermissionCount = selectedPermissionValues.filter((permissionId) =>
    allowedPermissionIds.has(permissionId)
  ).length;
  const showPermissionCount = config.fields.some(
    (field) => field.type === "multi-select" && field.optionKey === "permissions"
  );
  const permissionOptionsLoading = optionsLoading && showPermissionCount;
  const shouldUseActiveInstitution =
    !row &&
    Boolean(activeInstitution) &&
    (
      config.title === "Institution Memberships" ||
      config.title === "Institution Role Permissions" ||
      config.title === "Personal Permissions"
    );

  useEffect(() => {
    if (!open || !shouldUseActiveInstitution || !activeInstitution) return;
    const timeout = window.setTimeout(() => {
      setForm((current) => ({
        ...current,
        institution_id: String(activeInstitution.id),
      }));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activeInstitution, open, shouldUseActiveInstitution]);

  const institutionOptions = useMemo(() => {
    if (!activeInstitution) return options.institutions;
    if (
      config.title !== "Institution Memberships" &&
      config.title !== "Institution Role Permissions" &&
      config.title !== "Personal Permissions"
    ) {
      return options.institutions;
    }
    return [{
      id: activeInstitution.id,
      name: activeInstitution.name,
      slug: null,
    }];
  }, [activeInstitution, config.title, options.institutions]);
  const scopedOptions = useMemo(
    () => ({ ...options, institutions: institutionOptions }),
    [institutionOptions, options]
  );
  const institutionDefaultPermissionIds = useMemo(() => {
    if (config.title !== "Institution Role Permissions") return [];
    const role = scopedOptions.institutionRoles.find((option) =>
      String(option.id) === String(form.role_id)
    );
    const allowedIds = getAllowedPermissionIdsForRole(
      options.permissions,
      "institution",
      typeof role?.code === "string" ? role.code : null
    );
    return optionDefaultPermissionIds(role).filter((permissionId) =>
      allowedIds.has(permissionId)
    );
  }, [config.title, form.role_id, options.permissions, scopedOptions.institutionRoles]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const payload: BodyInitPayload = {};

    for (const field of config.fields) {
      const value = form[field.name];
      if (field.type === "checkbox") {
        payload[field.name] = Boolean(value);
      } else if (field.type === "multi-select") {
        const roleScope = getRoleScope(
          options,
          form.role_id,
          row,
          config.title === "Institution Role Permissions" ||
            config.title === "Personal Permissions"
        );
        const roleCode = getRoleCode(options, form.role_id, row);
        const allowedPermissionIds = new Set(
          getPermissionOptionsForField(
            config.title,
            options.permissions,
            roleScope,
            roleCode,
            getRoleDefaultPermissionIdSet(options, form.role_id)
          )
            .map((permission) => Number(permission.id))
        );
        const selectedIds = Array.isArray(value)
          ? value
            .map(Number)
            .filter((permissionId) => allowedPermissionIds.has(permissionId))
          : [];
        if (
          field.required &&
          selectedIds.length === 0 &&
          config.title !== "Institution Role Permissions"
        ) {
          toast.error(`Select at least one ${field.label.toLowerCase()}`);
          return;
        }
        if (config.title === "Personal Permissions" && row) {
          const inheritedPermissionIds = new Set([
            ...getDefaultPermissionSummaries(row),
          ].map((permission) => permission.permission_id));
          payload[field.name] = selectedIds.filter(
            (permissionId) => !inheritedPermissionIds.has(permissionId)
          );
        } else {
          payload[field.name] = selectedIds;
        }
      } else if (field.type === "select") {
        payload[field.name] = value ? Number(value) : null;
      } else {
        payload[field.name] = typeof value === "string" ? value.trim() : "";
      }
    }

    if (row?.id != null && payload.id == null) {
      payload.id = typeof row.id === "object" ? String(row.id) : row.id;
    }

    setSaving(true);
    try {
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-3 pr-10">
            <DialogTitle className="min-w-0 truncate">
              {row ? `Edit ${config.title}` : config.addLabel}
            </DialogTitle>
            {showPermissionCount && (
              <Badge className="shrink-0 border-green-300 bg-green-100 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                {permissionOptionsLoading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="size-3 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  `${assignedPermissionCount} / ${allowedPermissionOptions.length} assigned`
                )}
              </Badge>
            )}
          </div>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {config.fields.map((field) => {
            const fieldValue = form[field.name];
            const selectedValues = Array.isArray(fieldValue) ? fieldValue.map(String) : [];
            const permissionRoleScope = getRoleScope(
              options,
              form.role_id,
              row,
              config.title === "Institution Role Permissions" ||
                config.title === "Personal Permissions"
            );
            const permissionRoleCode = getRoleCode(options, form.role_id, row);
            const scopedPermissionOptions = getPermissionOptionsForField(
              config.title,
              options.permissions,
              permissionRoleScope,
              permissionRoleCode,
              getRoleDefaultPermissionIdSet(options, form.role_id)
            );

            return (
            <div key={field.name} className="space-y-2">
              {field.type !== "checkbox" && <Label htmlFor={field.name}>{field.label}</Label>}
              {field.type === "text" && (
                <Input
                  id={field.name}
                  value={String(form[field.name] ?? "")}
                  required={field.required}
                  onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                />
              )}
              {field.type === "textarea" && (
                <Textarea
                  id={field.name}
                  value={String(form[field.name] ?? "")}
                  onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                />
              )}
              {field.type === "select" && field.optionKey && (
                <AsyncSearchPopover<Option>
                  value={String(form[field.name] ?? "")}
                  onChange={(value) => setForm((current) => {
                    const next = { ...current, [field.name]: value };
                    if (
                      config.title === "Personal Permissions" &&
                      field.name === "institution_id"
                    ) {
                      next.user_id = "";
                    }
                    if (
                      config.title === "Institution Role Permissions" &&
                      field.name === "role_id"
                    ) {
                      const role = scopedOptions.institutionRoles.find((option) =>
                        String(option.id) === String(value)
                      );
                      const allowedIds = getAllowedPermissionIdsForRole(
                        options.permissions,
                        "institution",
                        typeof role?.code === "string" ? role.code : null
                      );
                      next.permission_ids = optionDefaultPermissionIds(role).filter((permissionId) =>
                        allowedIds.has(permissionId)
                      );
                    }
                    return next;
                  })}
                  selectedLabel={getSelectedLabel(field, form[field.name], row, scopedOptions)}
                  disabled={
                    shouldLockFieldInEdit(config, field, row) ||
                    (field.name === "institution_id" && Boolean(activeInstitution)) ||
                    (config.title === "Personal Permissions" &&
                      field.optionKey === "users" &&
                      !form.institution_id)
                  }
                  placeholder={`Select ${field.label.toLowerCase()}`}
                  searchPlaceholder={`Search ${field.label.toLowerCase()}...`}
                  emptyText={`No ${field.label.toLowerCase()} found`}
                  items={
                    config.title === "Personal Permissions" && field.optionKey === "users"
                      ? []
                      : scopedOptions[field.optionKey]
                  }
                  fetcher={(search, page) => fetchOptions(
                    field.optionKey!,
                    search,
                    page,
                    field.optionKey === "users" || field.optionKey === "institutions"
                      ? { institutionId: String(form.institution_id ?? activeInstitution?.id ?? "") }
                      : undefined
                  )}
                  getValue={(item) => String(item.id)}
                  getLabel={optionLabel}
                  {...getDialogSelectPlacement(config)}
                  renderItem={(item) => (
                    <div className="min-w-0">
                      <div className="truncate font-medium">{optionLabel(item)}</div>
                    </div>
                  )}
                />
              )}
              {field.type === "multi-select" && field.optionKey === "permissions" && (
                <MultiSelect
                  value={selectedValues}
                  onValueChange={(value) => setForm((current) => {
                    if (config.title !== "Personal Permissions" || !row) {
                      return { ...current, [field.name]: value };
                    }
                    const inheritedPermissionIds = [
                      ...getDefaultPermissionSummaries(row),
                    ].map((permission) => String(permission.permission_id));
                    return {
                      ...current,
                      [field.name]: Array.from(new Set([...inheritedPermissionIds, ...value])),
                    };
                  })}
                  selectedOptions={getSelectedPermissionOptions(
                    row,
                    selectedValues,
                    options,
                    permissionRoleScope
                  )}
                  options={scopedPermissionOptions.map((option) =>
                    toMultiSelectOption(option, permissionRoleScope)
                  )}
                  placeholder={permissionOptionsLoading ? "Loading permissions..." : `Select ${field.label.toLowerCase()}`}
                  emptyIndicator={permissionOptionsLoading ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading permissions...
                    </span>
                  ) : `No ${field.label.toLowerCase()} found`}
                  loading={permissionOptionsLoading}
                  disabled={permissionOptionsLoading}
                  maxCount={4}
                  deduplicateOptions
                  className="w-full"
                  popoverClassName="w-[var(--radix-popover-trigger-width)]"
                />
              )}
              {config.title === "Institution Role Permissions" && field.type === "multi-select" && (
                <p className="text-xs text-muted-foreground">
                  {permissionOptionsLoading
                    ? "Loading role permissions..."
                    : "Platform defaults are pre-selected. Uncheck any permission to override it for this institution and role."}
                  {!permissionOptionsLoading && institutionDefaultPermissionIds.length > 0
                    ? ` ${institutionDefaultPermissionIds.length} default permission${institutionDefaultPermissionIds.length === 1 ? "" : "s"} loaded.`
                    : ""}
                </p>
              )}
              {field.type === "checkbox" && (
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={Boolean(form[field.name])}
                    onCheckedChange={(value) => setForm((current) => ({ ...current, [field.name]: Boolean(value) }))}
                  />
                  {field.label}
                </label>
              )}
            </div>
            );
          })}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {saving ? "Saving..." : row ? "Save Changes" : config.addLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type BodyInitPayload = Record<string, string | number | boolean | number[] | null>;

export default function AccessControlPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedResource = getResource(searchParams.get("section"));
  const { user, accessToken, hasPermission } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const isSuperAdmin = hasPermission(FULL_ACCESS_PERMISSION);
  const allowedResourceOrder = useMemo<ResourceKey[]>(
    () => {
      return resourceOrder.filter(
        (key) =>
          isAdminPathVisibleForRole(user, resourcePages[key]) &&
          (isSuperAdmin || hasPermission(getPageViewPermission(resourcePages[key])))
      );
    },
    [hasPermission, isSuperAdmin, user]
  );
  const canUseAccessControl = allowedResourceOrder.length > 0;
  const resource = allowedResourceOrder.includes(requestedResource)
    ? requestedResource
    : allowedResourceOrder[0] ?? "institution-memberships";
  const config = resources[resource];
  const activeInstitutionId =
    activeInstitution && institutionContextResources.has(resource)
      ? activeInstitution.id
      : null;
  const permissionModule = resourcePermissionModules[resource];
  const canCreateRecord = isSuperAdmin || hasPermission(`${permissionModule}.create`);
  const canEditRecord = isSuperAdmin || hasPermission(`${permissionModule}.edit`);
  const canDeleteRecord = isSuperAdmin || hasPermission(`${permissionModule}.delete`);
  const hasScopeFilter = resource === "permissions" || resource === "roles" || resource === "role-permissions";
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [remoteRows, setRemoteRows] = useState<AccessRow[] | null>(null);
  const [options, setOptions] = useState<AccessOptions>(defaultOptions);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AccessRow | null>(null);
  const [viewingPermissionsRow, setViewingPermissionsRow] = useState<AccessRow | null>(null);
  const [pageCount, setPageCount] = useState(-1);
  const [remotePageCount, setRemotePageCount] = useState(-1);
  const [totalCount, setTotalCount] = useState(0);
  const [remoteTotalCount, setRemoteTotalCount] = useState(0);
  const [remoteSearchLoading, setRemoteSearchLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchTerm, setSearchTerm] = useState("");
  const [permissionScopeFilter, setPermissionScopeFilter] = useState<"all" | "platform" | "institution">("all");
  const [permissionHelpOpen, setPermissionHelpOpen] = useState(false);
  const [tabScrollState, setTabScrollState] = useState({ left: false, right: false });
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedRowsRef = useRef(false);

  const authHeader = useCallback(() => ({
    Authorization: `Bearer ${accessToken}`,
  }), [accessToken]);

  const handleAuthError = useCallback(() => {
    toast.error("You do not have permission to access this section.");
  }, []);

  const fetchInitialOptions = useCallback(async () => {
    if (!accessToken || !canUseAccessControl) {
      setOptionsLoading(false);
      return;
    }
    const optionKeys = getResourceOptionKeys(config);
    if (optionKeys.length === 0) {
      setOptions(defaultOptions);
      setOptionsLoading(false);
      return;
    }

    setOptionsLoading(true);
    try {
      const entries = await Promise.all(
        optionKeys.map(async (type) => {
          const params = new URLSearchParams({
            type,
            search: "",
            page: "1",
            limit: type === "permissions" ? "2000" : "50",
            context: resource,
          });
          if (activeInstitutionId) {
            params.set("institutionId", String(activeInstitutionId));
          }
          const res = await fetch(`/api/admin/access-control/options?${params.toString()}`, {
            headers: authHeader(),
          });
          const json = await readJsonResponse(res);
          if (!res.ok) {
            throw new Error(getApiErrorMessage(json, "You don't have permission to view access options."));
          }
          return [type, json.data ?? []] as const;
        })
      );

      const nextOptions = {
        ...defaultOptions,
        ...Object.fromEntries(entries),
      };
      setOptions(nextOptions);
    } finally {
      setOptionsLoading(false);
    }
  }, [accessToken, activeInstitutionId, authHeader, canUseAccessControl, config, resource]);

  const fetchOptionPage = useCallback(async (
    type: OptionKey,
    search: string,
    page: number,
    filters: { institutionId?: string } = {}
  ) => {
    if (!accessToken || !canUseAccessControl) return { data: [], hasMore: false };

    const params = new URLSearchParams({
      type,
      search,
      page: String(page),
      limit: "50",
      context: resource,
    });
    if (filters.institutionId) {
      params.set("institutionId", filters.institutionId);
    } else if (activeInstitutionId) {
      params.set("institutionId", String(activeInstitutionId));
    }
    const res = await fetch(`/api/admin/access-control/options?${params.toString()}`, {
      headers: authHeader(),
    });
    const json = await readJsonResponse(res);
    if (!res.ok) {
      throw new Error(getApiErrorMessage(json, "You don't have permission to view access options."));
    }

    return {
      data: json.data ?? [],
      hasMore: Boolean(json.hasMore),
    };
  }, [accessToken, activeInstitutionId, authHeader, canUseAccessControl, resource]);

  const fetchRows = useCallback(async (search = "", target: "base" | "remote" = "base") => {
    if (!accessToken || !canUseAccessControl) return;
    if (target === "base" && !hasLoadedRowsRef.current) setLoading(true);
    if (target === "remote") setRemoteSearchLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (search.trim()) params.set("search", search.trim());
      if (hasScopeFilter && permissionScopeFilter !== "all") {
        params.set("scope", permissionScopeFilter);
      }
      if (activeInstitutionId) {
        params.set("institutionId", String(activeInstitutionId));
      }

      const res = await fetch(
        `/api/admin/access-control/${resource}?${params.toString()}`,
        { headers: authHeader() }
      );

      if (!res.ok) {
        const json = await readJsonResponse(res);
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        if (res.status === 403) {
          throw new Error(getApiErrorMessage(json, "You don't have permission to view access records."));
        }
        throw new Error(getApiErrorMessage(json, "Failed to fetch access records"));
      }

      const json = await readJsonResponse(res);
      if (target === "remote") {
        setRemoteRows(json.data ?? []);
        setRemotePageCount(json.pageCount ?? -1);
        setRemoteTotalCount(json.total ?? 0);
      } else {
        setRows(json.data ?? []);
        setPageCount(json.pageCount ?? -1);
        setTotalCount(json.total ?? 0);
        hasLoadedRowsRef.current = true;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      if (target === "base") setLoading(false);
      if (target === "remote") setRemoteSearchLoading(false);
    }
  }, [accessToken, activeInstitutionId, authHeader, canUseAccessControl, handleAuthError, hasScopeFilter, pagination.pageIndex, pagination.pageSize, permissionScopeFilter, resource]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchInitialOptions().catch((err) => toast.error(err instanceof Error ? err.message : "Failed to fetch options"));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchInitialOptions]);

  useEffect(() => {
    if (searchTerm.trim()) return;

    const timeout = window.setTimeout(() => {
      fetchRows();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchRows, searchTerm]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      hasLoadedRowsRef.current = false;
      setLoading(true);
      setPagination((current) => ({ ...current, pageIndex: 0 }));
      setSearchTerm("");
      setPermissionScopeFilter("all");
      setRows([]);
      setTotalCount(0);
      setPageCount(-1);
      setRemoteRows(null);
      setRemotePageCount(-1);
      setRemoteTotalCount(0);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [resource]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      hasLoadedRowsRef.current = false;
      setLoading(true);
      setPagination((current) => ({ ...current, pageIndex: 0 }));
      setSearchTerm("");
      setRows([]);
      setTotalCount(0);
      setPageCount(-1);
      setRemoteRows(null);
      setRemotePageCount(-1);
      setRemoteTotalCount(0);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activeInstitutionId]);

  useEffect(() => {
    if (!accessToken || !canUseAccessControl) return;

    const search = searchTerm.trim();
    if (!search) {
      const timeout = window.setTimeout(() => {
        setRemoteRows(null);
        setRemotePageCount(-1);
        setRemoteTotalCount(0);
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const timeout = window.setTimeout(() => {
      fetchRows(search, "remote");
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [accessToken, canUseAccessControl, fetchRows, searchTerm]);

  useEffect(() => {
    const activeTab = tabsContainerRef.current?.querySelector<HTMLElement>("[data-active-tab='true']");
    activeTab?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [resource]);

  useEffect(() => {
    const tabs = tabsContainerRef.current;
    if (!tabs) return;

    const updateScrollState = () => {
      const maxScrollLeft = tabs.scrollWidth - tabs.clientWidth;
      setTabScrollState({
        left: tabs.scrollLeft > 2,
        right: tabs.scrollLeft < maxScrollLeft - 2,
      });
    };

    updateScrollState();
    tabs.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      tabs.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [allowedResourceOrder.length, resource]);

  const saveRecord = useCallback(async (payload: BodyInitPayload) => {
    if (!accessToken) return;
    const res = await fetch(`/api/admin/access-control/${resource}`, {
      method: editingRow ? "PATCH" : "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await readJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        getApiErrorMessage(
          json,
          editingRow
            ? "You don't have permission to edit this record."
            : "You don't have permission to create this record."
        )
      );
    }

    toast.success(editingRow ? "Updated successfully" : "Created successfully");
    setDialogOpen(false);
    setEditingRow(null);
    fetchRows();
    fetchInitialOptions().catch(() => undefined);
  }, [accessToken, authHeader, editingRow, fetchInitialOptions, fetchRows, resource]);

  const deleteRecords = useCallback(async (ids: string[], reset?: () => void) => {
    if (!accessToken) return;
    const res = await fetch(`/api/admin/access-control/${resource}`, {
      method: "DELETE",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const json = await readJsonResponse(res);
    if (!res.ok) {
      toast.error(getApiErrorMessage(json, "You don't have permission to delete these records."));
      return;
    }
    toast.success("Deleted successfully");
    reset?.();
    fetchRows();
    fetchInitialOptions().catch(() => undefined);
  }, [accessToken, authHeader, fetchInitialOptions, fetchRows, resource]);

  const toggleRows = useCallback(async (ids: string[], isActive: boolean, reset: () => void) => {
    const res = await fetch(`/api/admin/access-control/${resource}`, {
      method: "PATCH",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ ids, is_active: isActive }),
    });
    const json = await readJsonResponse(res);
    if (!res.ok) {
      toast.error(getApiErrorMessage(json, "You don't have permission to edit these records."));
      return;
    }
    toast.success(isActive ? "Rows activated" : "Rows deactivated");
    reset();
    fetchRows();
  }, [authHeader, fetchRows, resource]);

  const columns = useMemo<ColumnDef<AccessRow>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    ...config.columns.map((column) => ({
      accessorKey: column.key,
      header: ({ column: tableColumn }) => <SortHeader label={column.label} column={tableColumn} />,
      cell: ({ row }) => {
        const value = row.original[column.key];
        if (column.kind === "badge") return <Badge variant="outline">{formatValue(value)}</Badge>;
        if (column.key === "permission_count") {
          const shouldShowCoverage =
            config.title === "Role Permissions" ||
            config.title === "Institution Role Permissions" ||
            config.title === "Personal Permissions";

          if (shouldShowCoverage) {
            if (optionsLoading) {
              return (
                <Badge variant="outline" className="border-green-300/70 bg-green-500/10 text-green-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="size-3 animate-spin" />
                    Loading...
                  </span>
                </Badge>
              );
            }

            const { assignedCount, totalCount } = getPermissionCoverageForRow(
              config.title,
              row.original,
              options
            );
            return (
              <Badge variant="outline" className="border-green-300/70 bg-green-500/10 text-green-300">
                {assignedCount} / {totalCount} assigned
              </Badge>
            );
          }
        }
        if (column.kind === "scope") {
          const scope = String(value ?? "");
          return (
            <Badge
              variant="outline"
              className={cn(
                "capitalize",
                scope === "platform"
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              )}
            >
              {scope || "-"}
            </Badge>
          );
        }
        if (column.kind === "boolean") {
          return (
            <Badge className={value ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>
              {value ? "Active" : "Inactive"}
            </Badge>
          );
        }
        return <span className="text-muted-foreground">{formatValue(value)}</span>;
      },
    } satisfies ColumnDef<AccessRow>)),
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {(resource === "role-permissions" || resource === "institution-role-permissions" || resource === "personal-permissions") && (
              <>
                <DropdownMenuItem onClick={() => setViewingPermissionsRow(row.original)}>
                  View permissions
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {config.canEdit && canEditRecord && (
              <DropdownMenuItem
                onClick={() => {
                  setEditingRow(row.original);
                  setDialogOpen(true);
                }}
              >
                Edit
              </DropdownMenuItem>
            )}
            {canDeleteRecord && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => deleteRecords([getRowId(row.original)])}>
                  {resource === "role-permissions"
                      ? "Delete all mappings"
                      : resource === "institution-role-permissions"
                        ? "Delete overrides"
                        : resource === "personal-permissions"
                          ? "Clear personal permissions"
                        : "Delete"}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [canDeleteRecord, canEditRecord, config, deleteRecords, options, optionsLoading, resource]);

  const hasSearch = searchTerm.trim().length > 0;
  const tableData = hasSearch ? (remoteRows ?? []) : rows;
  const tablePageCount = hasSearch ? remotePageCount : pageCount;
  const currentTotalCount = hasSearch ? remoteTotalCount : totalCount;

  if (!canUseAccessControl) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-2xl font-bold tracking-tight">Access Control</h1>
        <p className="mt-2 text-muted-foreground">You do not have permission to manage roles and permissions.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="hidden items-center justify-between sm:flex">
          <div>
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <div className="hidden sm:block">
          <Skeleton className="h-[420px] w-full rounded-md" />
        </div>
        <div className="space-y-4 sm:hidden">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
          <div className="flex gap-2 overflow-hidden">
            <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-20 shrink-0 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-md" />
          </div>
          <div className="rounded-md border bg-card">
            <div className="grid grid-cols-[1fr_1fr] gap-4 border-b p-3">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr] gap-4 border-b p-3 last:border-b-0">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
            <Badge variant="outline" className="rounded-md px-2.5 py-1 text-sm">
              {currentTotalCount} {currentTotalCount === 1 ? "record" : "records"}
            </Badge>
          </div>
          <div className="mt-1 hidden flex-wrap items-center gap-2 text-muted-foreground sm:flex">
            <p>{config.description}</p>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-6 rounded-full"
              onClick={() => setPermissionHelpOpen(true)}
              aria-label="Permission help"
              title="Permission help"
            >
              <Info className="size-3.5" />
            </Button>
          </div>
        </div>
        {canCreateRecord && (
          <Button onClick={() => { setEditingRow(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            {config.addLabel}
          </Button>
        )}
      </div>

      <div className="relative">
        <div
          ref={tabsContainerRef}
          className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {allowedResourceOrder.map((key) => (
            <Button
              key={key}
              variant={key === resource ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              data-active-tab={key === resource ? "true" : undefined}
              onClick={(event) => {
                event.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });
                if (key !== resource) {
                  router.push(toRoleRoutePath(`/admin/access-control?section=${key}`, user), { scroll: false });
                }
              }}
            >
              {resources[key].title}
            </Button>
          ))}
          </div>
        </div>
        {tabScrollState.left && (
          <div className="pointer-events-none absolute inset-y-0 -left-3 z-10 flex items-center sm:hidden">
            <div className="flex size-8 animate-pulse items-center justify-center rounded-full border bg-background/95 text-primary shadow-lg shadow-background">
              <ChevronLeft className="size-4" />
            </div>
          </div>
        )}
        {tabScrollState.right && (
        <div className="pointer-events-none absolute inset-y-0 -right-3 z-10 flex items-center sm:hidden">
          <div className="flex size-8 animate-pulse items-center justify-center rounded-full border bg-background/95 text-primary shadow-lg shadow-background">
            <ChevronRight className="size-4" />
          </div>
        </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={tableData}
        filterPlaceholder={`Filter ${config.title.toLowerCase()}...`}
        loading={hasSearch && remoteSearchLoading}
        manualPagination
        pageCount={tablePageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        hideMobileColumnsButton
        onRowClick={
          config.canEdit && canEditRecord
            ? (row) => {
                setEditingRow(row);
                setDialogOpen(true);
              }
            : undefined
        }
        toolbarLeft={({ columnsButton }) => (
          <>
            <div className="flex w-full min-w-0 gap-2 sm:w-auto">
              <Input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                  setRemoteRows(null);
                  setRemotePageCount(-1);
                  setRemoteTotalCount(0);
                }}
                placeholder={`Filter ${config.title.toLowerCase()}...`}
                className="min-w-0 flex-1 sm:w-72 sm:flex-none"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => {
                  const search = searchTerm.trim();
                  void fetchRows(search, search ? "remote" : "base");
                }}
                disabled={loading || remoteSearchLoading}
                aria-label={`Refresh ${config.title.toLowerCase()}`}
                title={`Refresh ${config.title.toLowerCase()}`}
              >
                <RefreshCw className={cn("size-4", (loading || remoteSearchLoading) && "animate-spin")} />
              </Button>
            </div>
            <div
              className={cn(
                "grid w-full min-w-0 grid-cols-2 gap-2 sm:w-auto sm:flex sm:items-center",
                !hasScopeFilter && "sm:hidden"
              )}
            >
              {hasScopeFilter && (
                <Select
                  value={permissionScopeFilter}
                  onValueChange={(value: "all" | "platform" | "institution") => {
                    setPermissionScopeFilter(value);
                    setPagination((current) => ({ ...current, pageIndex: 0 }));
                    setRemoteRows(null);
                    setRemotePageCount(-1);
                    setRemoteTotalCount(0);
                  }}
                >
                  <SelectTrigger className="w-full min-w-0 sm:w-44">
                    <SelectValue placeholder="All scopes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All scopes</SelectItem>
                    <SelectItem value="platform">Platform</SelectItem>
                    <SelectItem value="institution">Institution</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <div className={cn("min-w-0 sm:hidden [&>button]:w-full", !hasScopeFilter && "col-span-2")}>
                {columnsButton("w-full")}
              </div>
            </div>
          </>
        )}
        getRowId={(row) => getRowId(row)}
        selectedActions={(selectedRows, resetSelection) => {
          const ids = selectedRows.map(getRowId);
          return (
            <>
              {config.canToggle && canEditRecord && (
                <>
                  <Button size="sm" variant="outline" onClick={() => toggleRows(ids, true, resetSelection)}>
                    Activate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleRows(ids, false, resetSelection)}>
                    Deactivate
                  </Button>
                </>
              )}
              {canDeleteRecord && (
                <Button size="sm" variant="destructive" onClick={() => deleteRecords(ids, resetSelection)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              )}
            </>
          );
        }}
      />

      <AccessFormDialog
        key={`${resource}-${editingRow?.id ?? "new"}-${dialogOpen ? "open" : "closed"}`}
        config={config}
        options={options}
        optionsLoading={optionsLoading}
        row={editingRow}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingRow(null);
        }}
        onSubmit={saveRecord}
        fetchOptions={fetchOptionPage}
        activeInstitution={activeInstitution}
      />

      <Dialog open={permissionHelpOpen} onOpenChange={setPermissionHelpOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Permission Guide</DialogTitle>
            <DialogDescription>
              Permission codes tell the admin panel which page and action a role can use.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-md border p-3">
              <p className="font-medium">Action suffixes</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <p><Badge variant="outline">.view</Badge> Opens and views a page.</p>
                <p><Badge variant="outline">.create</Badge> Adds new records.</p>
                <p><Badge variant="outline">.edit</Badge> Updates existing records.</p>
                <p><Badge variant="outline">.delete</Badge> Deletes or deactivates records.</p>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="font-medium">Scope</p>
              <div className="mt-2 space-y-2 text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Platform scope</span> applies across the whole admin panel. Example: <Badge variant="outline">analytics.overview.view</Badge> opens analytics overview globally.
                </p>
                <p>
                  <span className="font-medium text-foreground">Institution scope</span> applies only inside the assigned institution membership. Example: <Badge variant="outline">managestudents.attendance.view</Badge> opens attendance only for that institution scope.
                </p>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="font-medium">Naming pattern</p>
              <p className="mt-2 text-muted-foreground">
                Use <Badge variant="outline">module.page.action</Badge> with one of the four action suffixes. Example:
                <Badge variant="outline" className="ml-2">content.category_tree.view</Badge>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet
        open={Boolean(viewingPermissionsRow)}
        onOpenChange={(open) => {
          if (!open) setViewingPermissionsRow(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {(() => {
            const defaultPermissions = getDefaultPermissionSummaries(viewingPermissionsRow);
            const overridePermissions = getPermissionSummaries(viewingPermissionsRow);
            const deniedPermissions = getDeniedPermissionSummaries(viewingPermissionsRow);
            const deniedPermissionIds = new Set(
              deniedPermissions.map((permission) => permission.permission_id)
            );
            const effectivePermissionCount =
              resource === "personal-permissions"
                ? new Set([
                    ...defaultPermissions.map((permission) => permission.permission_id),
                    ...overridePermissions.map((permission) => permission.permission_id),
                  ]).size
                : new Set([
                    ...defaultPermissions
                      .filter((permission) => !deniedPermissionIds.has(permission.permission_id))
                      .map((permission) => permission.permission_id),
                    ...overridePermissions.map((permission) => permission.permission_id),
                  ]).size;
            const canResetInstitutionOverrides =
              resource === "institution-role-permissions" &&
              canDeleteRecord &&
              viewingPermissionsRow?.id != null &&
              (overridePermissions.length > 0 || deniedPermissions.length > 0);

            return (
              <>
          <SheetHeader>
            <SheetTitle>
              {resource === "personal-permissions"
                ? String(viewingPermissionsRow?.user_name ?? "Personal Permissions")
                : String(viewingPermissionsRow?.role_name ?? "Permissions")}
            </SheetTitle>
            <SheetDescription>
              {resource === "personal-permissions" && viewingPermissionsRow?.institution_name
                ? `${viewingPermissionsRow.institution_name} personal grants for ${viewingPermissionsRow.user_email ?? "this user"}`
                : resource === "institution-role-permissions" && viewingPermissionsRow?.institution_name
                  ? `${viewingPermissionsRow.institution_name} overrides for ${viewingPermissionsRow.role_code}`
                  : `Default permissions for ${viewingPermissionsRow?.role_code ?? "this role"}`}
            </SheetDescription>
            {canResetInstitutionOverrides && (
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full justify-center border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-200"
                onClick={() => {
                  const rowId = viewingPermissionsRow?.id;
                  if (rowId == null) return;
                  void deleteRecords([String(rowId)], () => setViewingPermissionsRow(null));
                }}
              >
                <RotateCcw className="size-4" />
                Restore to Default Permissions
              </Button>
            )}
          </SheetHeader>

          <div className="space-y-3 px-4 pb-6">
            <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/25 dark:text-sky-100">
              <p className="text-sm font-medium">
                {resource === "institution-role-permissions"
                  ? `${effectivePermissionCount} effective permissions`
                  : resource === "personal-permissions"
                    ? `${effectivePermissionCount} effective permissions`
                  : `${overridePermissions.length} permissions`}
              </p>
              <p className="mt-1 text-xs opacity-75">
                {resource === "institution-role-permissions"
                  ? `${defaultPermissions.length} default + ${overridePermissions.length} extra override${overridePermissions.length === 1 ? "" : "s"}${deniedPermissions.length ? ` - ${deniedPermissions.length} removed` : ""}.`
                  : resource === "personal-permissions"
                    ? `${defaultPermissions.length} platform default + ${overridePermissions.length} personal.`
                  : "Use Add Mapping or Add Override to add more permissions."}
              </p>
            </div>

            {(resource === "institution-role-permissions" || resource === "personal-permissions") && (
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Default role permissions</h3>
                  <p className="text-xs text-muted-foreground">
                    These come from Role Permissions for {String(viewingPermissionsRow?.role_code ?? "this role")}.
                  </p>
                </div>

                {defaultPermissions.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No default permissions found.
                  </div>
                ) : (
                  defaultPermissions.map((permission) => (
                    <PermissionCard key={`default-${permission.permission_id}`} permission={permission} tone="default" />
                  ))
                )}

                {resource === "institution-role-permissions" && (
                  <div className="pt-3">
                    <h3 className="text-sm font-semibold">Institution overrides</h3>
                    <p className="text-xs text-muted-foreground">
                      These are extra permissions added for {String(viewingPermissionsRow?.institution_name ?? "this institution")}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {resource === "personal-permissions" && (
              <div className="space-y-3 pt-3">
                <div>
                  <h3 className="text-sm font-semibold">Personal permissions</h3>
                  <p className="text-xs text-muted-foreground">
                    These are extra permissions granted directly to this user.
                  </p>
                </div>
              </div>
            )}

            {overridePermissions.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                {resource === "personal-permissions"
                  ? "No personal permissions found."
                  : "No extra override permissions found."}
              </div>
            ) : (
              overridePermissions.map((permission) => (
                <PermissionCard
                  key={`permission-${permission.permission_id}`}
                  permission={permission}
                  tone={resource === "institution-role-permissions" || resource === "personal-permissions" ? "override" : "neutral"}
                />
              ))
            )}

            {resource === "institution-role-permissions" && (
              <div className="space-y-3 pt-3">
                <div>
                  <h3 className="text-sm font-semibold">Removed default permissions</h3>
                  <p className="text-xs text-muted-foreground">
                    These platform defaults are blocked for this institution and role.
                  </p>
                </div>
                {deniedPermissions.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No default permissions removed.
                  </div>
                ) : (
                  deniedPermissions.map((permission) => (
                    <PermissionCard key={`denied-${permission.permission_id}`} permission={permission} tone="removed" />
                  ))
                )}
              </div>
            )}
          </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
