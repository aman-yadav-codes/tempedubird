"use client";

import { useMemo, useState } from "react";
import { CircleAlertIcon, FileIcon, Loader2, PlusIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes, useFileUpload, type FileMetadata, type FileWithPreview } from "@/hooks/use-file-upload";

export type UploadedDocumentFile = {
  url: string;
  publicId: string;
  resourceType: string;
  fileType: string;
  name?: string;
  size?: number;
};

type DocumentFileUploadProps = {
  accessToken: string | null;
  files: UploadedDocumentFile[];
  onFilesChange: (files: UploadedDocumentFile[]) => void;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
  buttonLabel?: string;
  emptyText?: string;
  compact?: boolean;
  disabled?: boolean;
  accept?: string;
};

const ACCEPT = "image/*";
const DEFAULT_MAX_FILES = 3;
const DEFAULT_MAX_SIZE = 2 * 1024 * 1024;

function getFileName(url?: string) {
  if (!url) return "Uploaded image";
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || "Uploaded image");
  } catch {
    return url.split("/").pop() || "Uploaded image";
  }
}

function toMetadata(files: UploadedDocumentFile[]): FileMetadata[] {
  return files.map((file) => ({
    id: file.publicId || file.url,
    name: file.name || getFileName(file.url),
    size: file.size || 0,
    type: file.fileType || "image/*",
    url: file.url,
  }));
}

async function deleteCloudinaryDocument(accessToken: string | null, publicId?: string, resourceType?: string) {
  if (!accessToken || !publicId) return;
  await fetch("/api/admin/uploads/documents/delete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publicId, resourceType }),
  });
}

export function DocumentFileUpload({
  accessToken,
  files = [],
  onFilesChange,
  maxFiles = DEFAULT_MAX_FILES,
  maxSize = DEFAULT_MAX_SIZE,
  className,
  buttonLabel = "Add images",
  emptyText,
  compact = false,
  disabled = false,
  accept = ACCEPT,
}: DocumentFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const initialFiles = useMemo(() => toMetadata(files), [files]);

  const [
    { isDragging, errors },
    {
      removeFile,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles: Number.POSITIVE_INFINITY,
    maxSize,
    accept,
    multiple: true,
    initialFiles,
    onFilesAdded: async (addedFiles: FileWithPreview[]) => {
      if (disabled) return;
      if (!accessToken) {
        setUploadError("Session expired. Please log in again.");
        return;
      }

      const availableSlots = Math.max(maxFiles - files.length, 0);
      if (availableSlots <= 0) {
        setUploadError(`You can only upload a maximum of ${maxFiles} images.`);
        return;
      }

      const uploadableFiles = addedFiles
        .map((item) => item.file)
        .filter((file): file is File => file instanceof File)
        .slice(0, availableSlots);

      if (uploadableFiles.length === 0) return;

      setUploading(true);
      setUploadError("");
      try {
        const uploaded = await Promise.all(
          uploadableFiles.map(async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/admin/uploads/documents", {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}` },
              body: formData,
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Failed to upload image");
            return {
              url: json.data.url,
              publicId: json.data.public_id,
              resourceType: json.data.resource_type,
              fileType: json.data.file_type,
              name: file.name,
              size: file.size,
            } satisfies UploadedDocumentFile;
          })
        );
        onFilesChange([...files, ...uploaded]);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Failed to upload image");
      } finally {
        setUploading(false);
      }
    },
  });

  const isImage = (file: UploadedDocumentFile) => file.fileType.startsWith("image/") || file.url;
  const isFull = files.length >= maxFiles;

  return (
    <div className={cn("w-full max-w-full space-y-2", className)}>
      <div
        className={cn(
          "flex flex-col rounded-lg border border-dashed transition-colors sm:flex-row sm:items-center",
          compact ? "min-h-14 gap-2 p-2" : "min-h-20 gap-3 p-3",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragEnter={disabled ? undefined : handleDragEnter}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onDragOver={disabled ? undefined : handleDragOver}
        onDrop={disabled ? undefined : handleDrop}
      >
        <input {...getInputProps()} className="sr-only" />

        <Button
          type="button"
          onClick={openFileDialog}
          size="sm"
          disabled={disabled || uploading || isFull}
          className={cn("shrink-0", isDragging && "animate-bounce")}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
          {buttonLabel}
        </Button>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {emptyText ?? `Drop images here or click to browse (max ${maxFiles})`}
            </p>
          ) : (
            files.map((file) => (
              <div key={file.publicId || file.url} className="group/item relative shrink-0">
                {isImage(file) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.url}
                    alt={file.name || "Uploaded document image"}
                    className="size-12 rounded-lg border object-cover"
                    title={`${file.name || getFileName(file.url)}${file.size ? ` (${formatBytes(file.size)})` : ""}`}
                  />
                ) : (
                  <div
                    className="flex size-12 items-center justify-center rounded-lg border bg-muted"
                    title={file.name || getFileName(file.url)}
                  >
                    <FileIcon className="size-5 text-muted-foreground" />
                  </div>
                )}

                <Button
                  type="button"
                  onClick={async () => {
                    const fileId = file.publicId || file.url;
                    setDeletingFileId(fileId);
                    try {
                      await deleteCloudinaryDocument(accessToken, file.publicId, file.resourceType);
                      removeFile(fileId);
                      onFilesChange(files.filter((item) => (item.publicId || item.url) !== fileId));
                    } finally {
                      setDeletingFileId((current) => (current === fileId ? null : current));
                    }
                  }}
                  variant="outline"
                  size="icon"
                  disabled={disabled || deletingFileId === (file.publicId || file.url)}
                  className="absolute -right-2 -top-2 size-5 rounded-full opacity-100 shadow-md sm:opacity-0 sm:transition-opacity sm:group-hover/item:opacity-100"
                >
                  {deletingFileId === (file.publicId || file.url) ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <XIcon className="size-3" />
                  )}
                  <span className="sr-only">Remove image</span>
                </Button>
              </div>
            ))
          )}
        </div>

        {files.length > 0 && (
          <div className="shrink-0 text-xs text-muted-foreground">
            {files.length}/{maxFiles}
          </div>
        )}
      </div>

      {[...errors, uploadError].filter(Boolean).length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <div className="mb-1 flex items-center gap-2 font-medium">
            <CircleAlertIcon className="size-4" />
            File upload error
          </div>
          {[...errors, uploadError].filter(Boolean).map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
    </div>
  );
}
