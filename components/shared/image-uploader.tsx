"use client";

import { ChangeEvent, DragEvent, useCallback, useMemo, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { ImageIcon, Loader2, Minus, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ImageUploaderProps = {
  value: string;
  onChange: (url: string) => void;
  accessToken: string | null;
  label?: string;
  className?: string;
  maxSize?: number;
  acceptedFileTypes?: string[];
  aspectRatio?: number;
};

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;
const DEFAULT_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function initialsFromUrl(url: string) {
  if (!url) return "IMG";
  try {
    const parsed = new URL(url);
    return parsed.hostname.slice(0, 2).toUpperCase();
  } catch {
    return "IMG";
  }
}

function createImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = src;
  });
}

async function getCroppedImageBlob(imageSrc: string, crop: Area) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not prepare image crop");
  }

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not crop image"));
        return;
      }

      resolve(blob);
    }, "image/jpeg", 0.92);
  });
}

export function ImageUploader({
  value,
  onChange,
  accessToken,
  label = "Image",
  className,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  aspectRatio = 1,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState("avatar.jpg");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const accept = useMemo(
    () => acceptedFileTypes.join(","),
    [acceptedFileTypes]
  );

  const uploadFile = async (file: File) => {
    if (!accessToken) {
      toast.error("Session expired. Please log in again.");
      setUploading(false);
      return;
    }

    if (!acceptedFileTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed.");
      return;
    }

    if (file.size > maxSize) {
      toast.error("Image must be 5MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Image upload failed");
      }

      onChange(json.data.url);
      toast.success("Image uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openCropDialog = (file: File) => {
    if (!acceptedFileTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed.");
      return;
    }

    if (file.size > maxSize) {
      toast.error("Image must be 5MB or smaller.");
      return;
    }

    if (pendingImage) {
      URL.revokeObjectURL(pendingImage);
    }

    setPendingImage(URL.createObjectURL(file));
    setPendingFileName(file.name || "avatar.jpg");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropDialogOpen(true);
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleApplyCrop = async () => {
    if (!pendingImage || !croppedAreaPixels) return;

    if (!accessToken) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    setUploading(true);
    try {
      const blob = await getCroppedImageBlob(pendingImage, croppedAreaPixels);
      const croppedFile = new File([blob], pendingFileName, {
        type: "image/jpeg",
      });

      setCropDialogOpen(false);
      await uploadFile(croppedFile);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not crop image");
      setUploading(false);
    } finally {
      if (pendingImage) {
        URL.revokeObjectURL(pendingImage);
      }
      setPendingImage(null);
    }
  };

  const closeCropDialog = () => {
    setCropDialogOpen(false);
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage);
    }
    setPendingImage(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      openCropDialog(file);
    }
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      openCropDialog(file);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            disabled={uploading}
          >
            <X className="size-4" />
            Remove
          </Button>
        )}
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col gap-4 rounded-md border border-dashed p-4 sm:flex-row sm:items-center",
          dragging && "border-primary bg-muted/40"
        )}
      >
        <Avatar className="size-20 rounded-md" size="lg">
          <AvatarImage src={value || undefined} className="rounded-md" />
          <AvatarFallback className="rounded-md">
            {value ? initialsFromUrl(value) : <ImageIcon className="size-6" />}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Drag an image here or upload from device
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, or WebP. Max 5MB.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="https://example.com/avatar.jpg"
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="shrink-0"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      <Dialog open={cropDialogOpen} onOpenChange={(open) => !open && closeCropDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>

          <div className="relative h-[320px] overflow-hidden rounded-md bg-muted">
            {pendingImage && (
              <Cropper
                image={pendingImage}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <Minus className="size-4 text-muted-foreground" />
            <Input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
            <Plus className="size-4 text-muted-foreground" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCropDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={handleApplyCrop} disabled={uploading}>
              {uploading && <Loader2 className="size-4 animate-spin" />}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
