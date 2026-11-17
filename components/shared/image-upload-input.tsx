"use client";

import React, { useRef, useState } from "react";
import { Upload, X, Loader2, Image as ImageIcon, Link as LinkIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  helperText?: string;
  placeholder?: string;
  folder?: string;
  className?: string;
  compact?: boolean;
}

export function ImageUploadInput({
  value,
  onChange,
  label,
  helperText,
  placeholder = "https://...",
  folder = "uploads",
  className = "",
  compact = false,
}: ImageUploadInputProps) {
  const { accessToken } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [directUrl, setDirectUrl] = useState(value || "");

  async function handleFileSelect(file: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP, SVG, GIF)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      const uploadedUrl = data.data?.url || data.url || "";
      if (!uploadedUrl) {
        throw new Error("No URL returned from upload");
      }

      onChange(uploadedUrl);
      setDirectUrl(uploadedUrl);
      setShowUrlInput(false);
      toast.success("Image uploaded successfully");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">{label}</Label>
          {!value && (
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-[11px] text-muted-foreground hover:text-foreground hover:underline transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LinkIcon className="size-2.5" />
              <span>{showUrlInput ? "Use File Upload" : "Paste URL"}</span>
            </button>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />

      {/* State A: Image already uploaded or set */}
      {value ? (
        <div className="flex items-center gap-3 p-2 rounded-xl border bg-card/60 shadow-2xs group">
          <div className="relative size-12 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Preview"
              className="size-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <ImageIcon className="size-5 text-muted-foreground/40 absolute -z-10" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate flex items-center gap-1">
              <Check className="size-3 text-emerald-600 shrink-0" />
              <span>Image Attached</span>
            </p>
            <p className="text-[10px] text-muted-foreground font-mono truncate" title={value}>
              {value}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-[11px] px-2.5 font-semibold cursor-pointer"
            >
              {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3 mr-1" />}
              <span>Change</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => {
                onChange("");
                setDirectUrl("");
              }}
              className="size-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
              title="Remove Image"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : showUrlInput ? (
        /* State B: Direct URL Input fallback */
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Input
              placeholder={placeholder}
              value={directUrl}
              onChange={(e) => setDirectUrl(e.target.value)}
              className="h-9 text-xs font-mono"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (directUrl.trim()) {
                  onChange(directUrl.trim());
                  setShowUrlInput(false);
                }
              }}
              className="h-9 text-xs px-3 font-bold"
            >
              Apply
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="text-[10px] text-muted-foreground hover:underline cursor-pointer"
          >
            &larr; Back to Image Upload
          </button>
        </div>
      ) : (
        /* State C: Direct File Upload Trigger (Default) */
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className={`flex items-center justify-between p-2.5 rounded-xl border border-dashed border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer group ${
            compact ? "py-2" : "py-3"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {uploading ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <Upload className="size-4" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                {uploading ? "Uploading Image..." : "Click to Upload Image"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                PNG, JPG, WebP, SVG or GIF up to 10MB
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            className="h-7 text-xs px-2.5 font-bold pointer-events-none shadow-2xs"
          >
            {uploading ? "Uploading..." : "Browse"}
          </Button>
        </div>
      )}

      {helperText && <p className="text-[10px] text-muted-foreground">{helperText}</p>}
    </div>
  );
}

