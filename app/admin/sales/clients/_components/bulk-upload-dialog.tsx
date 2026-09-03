"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Check,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface BulkUploadClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId?: number | null;
  accessToken?: string | null;
  onSuccess: () => void;
}

export type ParsedClientRow = {
  company_name: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  description: string;
  isValid: boolean;
  validationError?: string;
};

// Robust CSV Line Parser supporting quotes and commas inside quotes
function parseCsv(csvText: string): ParsedClientRow[] {
  const lines = csvText.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Helper to split a CSV line into cells
  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  // Find column indices
  const getIndex = (keys: string[]) => {
    return headers.findIndex((h) => keys.some((k) => h.includes(k)));
  };

  const companyIdx = getIndex(["company", "business", "org"]);
  const contactIdx = getIndex(["contact", "person", "owner", "clientname"]);
  const nameIdx = getIndex(["name"]);
  const phoneIdx = getIndex(["phone", "mobile", "contactno", "tel"]);
  const emailIdx = getIndex(["email", "mail"]);
  const websiteIdx = getIndex(["website", "web", "url", "link"]);
  const addressIdx = getIndex(["address", "street", "location"]);
  const cityIdx = getIndex(["city"]);
  const stateIdx = getIndex(["state"]);
  const pincodeIdx = getIndex(["pincode", "zip", "postal"]);
  const descIdx = getIndex(["desc", "services", "notes"]);

  const parsed: ParsedClientRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    if (cells.length === 0 || cells.every((c) => !c)) continue;

    const companyName = (companyIdx >= 0 ? cells[companyIdx] : "") || (nameIdx >= 0 ? cells[nameIdx] : "");
    const contactPerson = (contactIdx >= 0 ? cells[contactIdx] : "") || companyName;
    const phone = (phoneIdx >= 0 ? cells[phoneIdx] : "");
    const email = (emailIdx >= 0 ? cells[emailIdx] : "");
    const website = (websiteIdx >= 0 ? cells[websiteIdx] : "");
    const address = (addressIdx >= 0 ? cells[addressIdx] : "");
    const city = (cityIdx >= 0 ? cells[cityIdx] : "");
    const state = (stateIdx >= 0 ? cells[stateIdx] : "");
    const pincode = (pincodeIdx >= 0 ? cells[pincodeIdx] : "");
    const description = (descIdx >= 0 ? cells[descIdx] : "");

    const isValid = Boolean(companyName || contactPerson);
    const validationError = !isValid ? "Missing Business or Contact Name" : undefined;

    parsed.push({
      company_name: companyName,
      name: contactPerson || companyName,
      contact_person: contactPerson,
      phone,
      email,
      website,
      address,
      city,
      state,
      pincode,
      description,
      isValid,
      validationError,
    });
  }

  return parsed;
}

export function BulkUploadClientsDialog({
  open,
  onOpenChange,
  institutionId,
  accessToken,
  onSuccess,
}: BulkUploadClientsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedClientRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDownloadSample = () => {
    const headers = "Company Name,Contact Person,Phone Number,Email Address,Website,Full Address,City,State,Pincode,Description";
    const sampleRows = [
      '"Apex Technologies Pvt Ltd","Rajesh Sharma","+91 98765 43210","contact@apextech.in","https://apextech.in","Plot 42, Cyber City, Sector 62","Noida","Uttar Pradesh","201309","Leading IT corporate training partner"',
      '"Global Edu Solutions","Anita Sharma","+91 98123 45678","info@globaledu.org","https://globaledu.org","15 MG Road, Trinity Metro","Bengaluru","Karnataka","560001","Academic and university recruitment partner"',
      '"Quantum Staffing Services","Vikram Mehta","+91 99887 76655","hr@quantumstaff.com","https://quantumstaff.com","Tower B, Cyber Hub","Gurugram","Haryana","122002","Campus hiring & internship client"',
    ];
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...sampleRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "clients_sample_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sample template downloaded");
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv") && !selectedFile.name.endsWith(".txt")) {
      toast.error("Please upload a .csv file");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast.error("File is empty");
        return;
      }
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast.error("No valid client rows detected. Please check headers.");
        return;
      }
      setParsedRows(rows);
      toast.success(`Parsed ${rows.length} client records from file`);
    };
    reader.readAsText(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid client records to import");
      return;
    }

    setUploading(true);
    try {
      const payload = {
        bulk: true,
        clients: validRows.map((r) => ({
          name: r.name,
          company_name: r.company_name,
          contact_person: r.contact_person,
          phone: r.phone || null,
          email: r.email || null,
          website: r.website || null,
          address: r.address || null,
          city: r.city || null,
          state: r.state || null,
          pincode: r.pincode || null,
          description: r.description || null,
          institution_id: institutionId || null,
          phones: r.phone ? [{ number: r.phone, label: "Primary", is_primary: true }] : [],
          emails: r.email ? [{ email: r.email, label: "Work", is_primary: true }] : [],
        })),
        institution_id: institutionId || null,
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/sales/clients", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import clients in bulk");

      toast.success(data.message || `Successfully imported ${validRows.length} clients!`);
      setFile(null);
      setParsedRows([]);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Building2 className="w-5 h-5" />
            <DialogTitle className="text-lg font-bold">Bulk Upload Clients</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Import multiple client records, corporate partners, and contact directories at once using a CSV file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Step 1: Download Template */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border bg-muted/30">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Step 1: Download Sample CSV Template
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Get the pre-structured template with example corporate partner and recruiter records.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              className="text-xs h-8 gap-1.5 font-semibold shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template (.CSV)
            </Button>
          </div>

          {/* Step 2: Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border/70 hover:border-primary/50 hover:bg-muted/20"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              {file ? file.name : "Click to choose or drag & drop CSV file here"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Supports .csv files with header columns (e.g., Company Name, Phone, Email, Address, etc.)
            </p>
          </div>

          {/* Step 3: Parsed Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-foreground">Preview Records ({parsedRows.length})</h4>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> {validCount} Valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300">
                      <AlertCircle className="w-3 h-3 mr-1" /> {invalidCount} Incomplete
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setParsedRows([]);
                  }}
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Clear
                </Button>
              </div>

              {/* Table Preview */}
              <div className="border rounded-xl overflow-hidden max-h-56 overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted/60 sticky top-0 border-b text-[11px] font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="p-2.5 pl-3">#</th>
                      <th className="p-2.5">Company / Business</th>
                      <th className="p-2.5">Contact Person</th>
                      <th className="p-2.5">Phone</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">City</th>
                      <th className="p-2.5 pr-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-[11px]">
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className={row.isValid ? "hover:bg-muted/20" : "bg-rose-500/5"}>
                        <td className="p-2 pl-3 font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="p-2 font-semibold text-foreground">{row.company_name || "-"}</td>
                        <td className="p-2 text-muted-foreground">{row.contact_person || "-"}</td>
                        <td className="p-2 font-mono text-muted-foreground">{row.phone || "-"}</td>
                        <td className="p-2 text-muted-foreground truncate max-w-[140px]">{row.email || "-"}</td>
                        <td className="p-2 text-muted-foreground">{row.city || "-"}</td>
                        <td className="p-2 pr-3">
                          {row.isValid ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <span className="text-rose-600 font-semibold flex items-center gap-1" title={row.validationError}>
                              <AlertCircle className="w-3 h-3" /> Invalid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Showing first 50 rows of {parsedRows.length} total rows parsed.
                </p>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={validCount === 0 || uploading}
              onClick={handleImport}
              className="text-xs h-9 font-semibold rounded-xl gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Importing Records...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Import {validCount > 0 ? `${validCount} Clients` : "Clients"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
