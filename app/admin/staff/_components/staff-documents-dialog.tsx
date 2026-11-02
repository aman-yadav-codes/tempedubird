"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  FileCheck,
  Download,
  ExternalLink,
  ShieldCheck,
  Clock,
  Plus,
  Trash2,
  Loader2,
  FolderOpen,
  Eye,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentFileUpload } from "@/components/shared/document-file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserDocument = {
  id?: number;
  document_type: string;
  document_number?: string | null;
  file_url: string;
  is_verified?: boolean;
};

type GeneratedLetter = {
  id: number;
  title: string;
  letter_type: string;
  template_name?: string;
  created_at?: string;
  file_url?: string;
};

type StaffDocumentsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffUser: { id: number; full_name: string; email?: string } | null;
  accessToken: string | null;
};

export function StaffDocumentsDialog({
  open,
  onOpenChange,
  staffUser,
  accessToken,
}: StaffDocumentsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [profileDocs, setProfileDocs] = useState<UserDocument[]>([]);
  const [generatedLetters, setGeneratedLetters] = useState<GeneratedLetter[]>([]);
  const [activeTab, setActiveTab] = useState("profile-docs");

  // New doc form state
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocType, setNewDocType] = useState("RESUME");
  const [newDocNumber, setNewDocNumber] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");
  const [savingDoc, setSavingDoc] = useState(false);

  useEffect(() => {
    if (!open || !staffUser || !accessToken) return;

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        // 1. Fetch user details which includes uploaded documents
        const resUser = await fetch(`/api/admin/users/detail?id=${staffUser.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userJson = await resUser.json();
        if (isMounted && resUser.ok && userJson.data) {
          setProfileDocs(userJson.data.documents || []);
        }

        // 2. Fetch generated official letters for this staff
        const resLetters = await fetch(`/api/admin/staff/documents?staffUserId=${staffUser.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const lettersJson = await resLetters.json();
        if (isMounted && resLetters.ok && Array.isArray(lettersJson.data)) {
          setGeneratedLetters(lettersJson.data);
        }
      } catch (err) {
        console.error("Failed to load staff documents:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [open, staffUser, accessToken]);

  const handleAddDocument = async () => {
    if (!newDocUrl.trim()) {
      toast.error("Please upload or enter a document URL");
      return;
    }
    if (!staffUser || !accessToken) return;

    setSavingDoc(true);
    try {
      // Fetch full current user data to append the new document
      const getRes = await fetch(`/api/admin/users/detail?id=${staffUser.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const getJson = await getRes.json();
      if (!getRes.ok || !getJson.data) {
        throw new Error("Failed to read user details");
      }

      const existingDocs = getJson.data.documents || [];
      const updatedDocs = [
        ...existingDocs,
        {
          document_type: newDocType.toUpperCase(),
          document_number: newDocNumber.trim() || null,
          file_url: newDocUrl.trim(),
          is_verified: true,
        },
      ];

      const patchRes = await fetch(`/api/admin/users/detail?id=${staffUser.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...getJson.data,
          documents: updatedDocs,
        }),
      });

      if (!patchRes.ok) {
        const patchJson = await patchRes.json();
        throw new Error(patchJson.error || "Failed to save document");
      }

      setProfileDocs(updatedDocs);
      setNewDocUrl("");
      setNewDocNumber("");
      setShowAddDoc(false);
      toast.success("Document added successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add document");
    } finally {
      setSavingDoc(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Documents: {staffUser?.full_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Employee verification files, uploaded IDs, and generated official letters
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-medium">Loading documents...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pt-2 space-y-4 pr-1 pb-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between pb-3">
                <TabsList className="grid grid-cols-2 w-72">
                  <TabsTrigger value="profile-docs" className="text-xs">
                    Uploaded Files ({profileDocs.length})
                  </TabsTrigger>
                  <TabsTrigger value="letters" className="text-xs">
                    Official Letters ({generatedLetters.length})
                  </TabsTrigger>
                </TabsList>

                {activeTab === "profile-docs" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddDoc((v) => !v)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {showAddDoc ? "Cancel" : "Upload Document"}
                  </Button>
                )}
              </div>

              {/* TAB 1: Uploaded Profile Documents */}
              <TabsContent value="profile-docs" className="space-y-3 mt-0">
                {showAddDoc && (
                  <div className="rounded-xl border bg-card p-4 space-y-3.5 shadow-xs animate-in fade-in-50">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Upload New Document
                    </h5>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Document Type</Label>
                        <Input
                          placeholder="e.g. AADHAAR, PAN, RESUME, DEGREE"
                          value={newDocType}
                          onChange={(e) => setNewDocType(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Document / ID Number (Optional)</Label>
                        <Input
                          placeholder="e.g. 1234-5678-9012"
                          value={newDocNumber}
                          onChange={(e) => setNewDocNumber(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">File Upload or URL</Label>
                      <DocumentFileUpload
                        accessToken={accessToken}
                        files={
                          newDocUrl
                            ? [
                                {
                                  url: newDocUrl,
                                  publicId: "",
                                  resourceType: "raw",
                                  fileType: "application/pdf",
                                  name: "Selected Document",
                                },
                              ]
                            : []
                        }
                        onFilesChange={(files) => {
                          setNewDocUrl(files[0]?.url || "");
                        }}
                        maxFiles={1}
                        maxSize={10 * 1024 * 1024}
                        compact
                        buttonLabel="Upload file"
                        emptyText="Drop document PDF or image here"
                      />
                      <Input
                        placeholder="Or paste direct file URL..."
                        value={newDocUrl}
                        onChange={(e) => setNewDocUrl(e.target.value)}
                        className="h-7 text-[11px]"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowAddDoc(false)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={savingDoc || !newDocUrl}
                        onClick={handleAddDocument}
                        className="h-7 text-xs gap-1"
                      >
                        {savingDoc && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save Document
                      </Button>
                    </div>
                  </div>
                )}

                {profileDocs.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center bg-muted/5">
                    <FolderOpen className="mx-auto h-9 w-9 text-muted-foreground/40 mb-2" />
                    <p className="text-xs font-medium text-foreground">No documents uploaded</p>
                    <p className="text-[11px] text-muted-foreground mb-3">
                      This staff member does not have any verification documents on file yet.
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowAddDoc(true)}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Upload First Document
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {profileDocs.map((doc, idx) => (
                      <div
                        key={doc.id || idx}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                            <FileCheck className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-foreground truncate">
                                {doc.document_type}
                              </span>
                              {doc.is_verified ? (
                                <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-500/20 font-medium">
                                  Unverified
                                </Badge>
                              )}
                            </div>
                            {doc.document_number && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                Number: <span className="font-mono">{doc.document_number}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {doc.file_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              className="h-7 px-2 text-xs gap-1"
                            >
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open document"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: Generated Official Letters */}
              <TabsContent value="letters" className="space-y-3 mt-0">
                {generatedLetters.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center bg-muted/5">
                    <FileText className="mx-auto h-9 w-9 text-muted-foreground/40 mb-2" />
                    <p className="text-xs font-medium text-foreground">No official letters generated</p>
                    <p className="text-[11px] text-muted-foreground">
                      No certificates or formal letters have been generated for this employee yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {generatedLetters.map((letter) => (
                      <div
                        key={letter.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-md bg-purple-500/10 text-purple-600 shrink-0">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-foreground block truncate">
                              {letter.title || letter.template_name || "Official Document"}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                                {letter.letter_type.replace(/_/g, " ")}
                              </Badge>
                              {letter.created_at && (
                                <span>{new Date(letter.created_at).toLocaleDateString()}</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {letter.file_url && (
                          <Button size="sm" variant="ghost" asChild className="h-7 px-2 text-xs gap-1">
                            <a href={letter.file_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" /> View
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
