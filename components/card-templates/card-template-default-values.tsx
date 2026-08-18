"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/shared/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isCertificateNumberField } from "@/lib/card-templates/institution-defaults";
import type { DocumentTemplateField, DocumentTemplateRow } from "@/lib/types/document-template";

type DefaultsPayload = {
  institutionId: number;
  institutions: Array<{ id: number; name: string }>;
  fields: DocumentTemplateField[];
  fieldValues: Record<string, string>;
  autoGenerateFields: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplateRow | null;
  accessToken: string | null;
};

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

function templateInputType(fieldType: string) {
  return fieldType === "number" ? "text" : fieldType;
}

export function CardTemplateDefaultValues({
  open,
  onOpenChange,
  template,
  accessToken,
}: Props) {
  const [data, setData] = useState<DefaultsPayload | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [autoGenerateFields, setAutoGenerateFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const loadDefaults = useCallback(async (institutionId?: number) => {
    if (!template || !accessToken) return;
    setLoading(true);
    try {
      const params = institutionId
        ? `?institutionId=${encodeURIComponent(String(institutionId))}`
        : "";
      const response = await fetch(
        `/api/admin/master-data/card-templates/${template.id}/defaults${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const json = await readJson(response);
      if (!response.ok) throw new Error(json.error ?? "Failed to load default values");
      const nextData = json.data as DefaultsPayload;
      setData(nextData);
      setValues(
        Object.fromEntries(
          nextData.fields.map((field) => [
            field.field_name,
            nextData.fieldValues[field.field_name] ?? "",
          ])
        )
      );
      setAutoGenerateFields(nextData.autoGenerateFields ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load default values");
    } finally {
      setLoading(false);
    }
  }, [accessToken, template]);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => void loadDefaults(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadDefaults, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setData(null);
      setValues({});
      setAutoGenerateFields([]);
      setClearConfirmOpen(false);
    }
    onOpenChange(nextOpen);
  }

  function selectImage(field: DocumentTemplateField, file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setValues((current) => ({ ...current, [field.field_name]: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  async function saveDefaults() {
    if (!template || !accessToken || !data) return;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/admin/master-data/card-templates/${template.id}/defaults`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            institution_id: data.institutionId,
            field_values: values,
            auto_generate_fields: autoGenerateFields,
          }),
        }
      );
      const json = await readJson(response);
      if (!response.ok) throw new Error(json.error ?? "Failed to save default values");
      toast.success("Institution default values saved");
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save default values");
    } finally {
      setSaving(false);
    }
  }

  async function clearDefaults() {
    if (!template || !accessToken || !data) return;
    setClearing(true);
    try {
      const params = new URLSearchParams({
        action: "clear-defaults",
        id: String(template.id),
        institutionId: String(data.institutionId),
      });
      const response = await fetch(
        `/api/admin/master-data/card-templates?${params.toString()}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const json = await readJson(response);
      if (!response.ok) throw new Error(json.error ?? "Failed to clear default values");
      toast.success("Institution default values cleared");
      setClearConfirmOpen(false);
      await loadDefaults(data.institutionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear default values");
    } finally {
      setClearing(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[88dvh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set Default Values</DialogTitle>
          <DialogDescription>
            Save institution-specific values for fields that are not connected to the database mapper.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading fields...
          </div>
        ) : data ? (
          <>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
              {data.institutions.length > 1 && (
                <div className="space-y-2">
                  <Label>Institution</Label>
                  <Select
                    value={String(data.institutionId)}
                    onValueChange={(value) => void loadDefaults(Number(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {data.institutions.map((institution) => (
                        <SelectItem key={institution.id} value={String(institution.id)}>
                          {institution.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {data.fields.length > 0 && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                  Leave fields empty when you do not want a default value. For optional values that should be hidden in supported templates, enter <span className="font-semibold text-foreground">NA</span>, <span className="font-semibold text-foreground">N/A</span>, <span className="font-semibold text-foreground">NULL</span>, or <span className="font-semibold text-foreground">-</span>. Subject rows marked this way will not appear in generated result cards.
                </div>
              )}

              {data.fields.map((field) => (
                <div key={field.field_name} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={`default-${field.field_name}`}>{field.label}</Label>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {`{{${field.field_name}}}`}
                    </span>
                  </div>
                  {isCertificateNumberField(field) && (
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                      <Checkbox
                        checked={autoGenerateFields.includes(field.field_name)}
                        onCheckedChange={(checked) => {
                          setAutoGenerateFields((current) =>
                            checked
                              ? Array.from(new Set([...current, field.field_name]))
                              : current.filter((name) => name !== field.field_name)
                          );
                          if (checked) {
                            setValues((current) => ({
                              ...current,
                              [field.field_name]: "",
                            }));
                          }
                        }}
                      />
                      Auto-generate a unique certificate number
                    </label>
                  )}
                  {field.field_type === "image" ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          id={`default-${field.field_name}`}
                          type="url"
                          value={
                            values[field.field_name]?.startsWith("data:image/")
                              ? ""
                              : values[field.field_name] ?? ""
                          }
                          placeholder="Paste image URL"
                          onChange={(event) =>
                            setValues((current) => ({
                              ...current,
                              [field.field_name]: event.target.value,
                            }))
                          }
                        />
                        <Button type="button" variant="outline" className="relative shrink-0">
                          <Upload className="size-4" />
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 cursor-pointer opacity-0"
                            aria-label={`Upload ${field.label}`}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) selectImage(field, file);
                              event.currentTarget.value = "";
                            }}
                          />
                        </Button>
                      </div>
                      {values[field.field_name] && (
                        <div className="flex h-28 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={values[field.field_name]}
                            alt={`${field.label} preview`}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ) : field.field_type === "date" ? (
                    <DatePicker
                      value={values[field.field_name] ?? ""}
                      onChange={(value) =>
                        setValues((current) => ({
                          ...current,
                          [field.field_name]: value,
                        }))
                      }
                      placeholder="Select date"
                      disabled={autoGenerateFields.includes(field.field_name)}
                    />
                  ) : field.field_type === "textarea" ? (
                    <Textarea
                      id={`default-${field.field_name}`}
                      value={values[field.field_name] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.field_name]: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <Input
                      id={`default-${field.field_name}`}
                      type={templateInputType(field.field_type)}
                      value={values[field.field_name] ?? ""}
                      disabled={autoGenerateFields.includes(field.field_name)}
                      placeholder={
                        autoGenerateFields.includes(field.field_name)
                          ? "Generated automatically when used"
                          : "Leave empty, or use NA / N/A / NULL / - to hide when supported"
                      }
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.field_name]: event.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}

              {data.fields.length === 0 && (
                <div className="flex min-h-44 flex-col items-center justify-center rounded-md border p-6 text-center">
                  <ImageIcon className="mb-3 size-8 text-muted-foreground" />
                  <p className="font-medium">All fields are mapped</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This template has no remaining fields that need institution defaults.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setClearConfirmOpen(true)}
                disabled={saving || clearing}
              >
                {clearing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Clear Defaults
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void saveDefaults()} disabled={saving || clearing}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save Defaults
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear default values?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes all saved default values for this institution and template.
              Mapped fields will not be changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={clearing}
              onClick={(event) => {
                event.preventDefault();
                void clearDefaults();
              }}
            >
              {clearing && <Loader2 className="size-4 animate-spin" />}
              Clear Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
