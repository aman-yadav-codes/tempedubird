"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Navigation,
  Play,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Layers,
} from "lucide-react";
import { captureBrowserLocation, BrowserLocation } from "@/app/lib/geolocation";

interface CheckInLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  subtaskTitle?: string | null;
  urgency?: string;
  onConfirm: (locationData: BrowserLocation | null) => void;
  isStarting?: boolean;
}

export function CheckInLocationDialog({
  open,
  onOpenChange,
  taskTitle,
  subtaskTitle,
  urgency,
  onConfirm,
  isStarting = false,
}: CheckInLocationDialogProps) {
  const [isDetecting, setIsDetecting] = useState<boolean>(true);
  const [location, setLocation] = useState<BrowserLocation | null>(null);
  const [address, setAddress] = useState<string>("");
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestLocation = async () => {
    setIsDetecting(true);
    setErrorMsg(null);
    setAddress("");

    try {
      const loc = await captureBrowserLocation(8000);
      setLocation(loc);

      if (loc.source === "unavailable" || loc.error) {
        setErrorMsg(loc.error || "Location access unavailable. Please allow browser location permissions.");
      } else if (loc.latitude && loc.longitude) {
        // Try reverse geocoding via Nominatim with short timeout
        setIsReverseGeocoding(true);
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}&zoom=18&addressdetails=1`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            const addr = data.display_name || data.name || "";
            if (addr) {
              setAddress(addr);
              loc.address = addr;
            }
          }
        } catch {
          // Soft fail - coordinates are already verified
        } finally {
          setIsReverseGeocoding(false);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to detect location.");
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    if (open) {
      requestLocation();
    } else {
      setLocation(null);
      setErrorMsg(null);
      setAddress("");
    }
  }, [open]);

  const hasCoordinates = Boolean(location?.latitude && location?.longitude);
  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${location!.latitude},${location!.longitude}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl border bg-background">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 sm:p-5 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold text-white tracking-tight truncate">
                Task Check-In & Geo-Location
              </DialogTitle>
              <DialogDescription className="text-xs text-emerald-100 mt-0.5 truncate">
                Share your location to verify and timestamp your check-in
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5 flex-1 min-h-0 overflow-y-auto">
          {/* Target Task Summary */}
          <div className="p-3 bg-muted/50 rounded-xl border border-border/60">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Task to Start (Punch In)
            </span>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-foreground leading-snug break-words line-clamp-2">
                  {taskTitle}
                </h4>
                {subtaskTitle && (
                  <p className="text-xs text-primary font-medium flex items-center gap-1 mt-0.5 break-words line-clamp-2">
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>Deliverable: {subtaskTitle}</span>
                  </p>
                )}
              </div>
              {urgency && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold uppercase shrink-0 border-primary/30"
                >
                  {urgency}
                </Badge>
              )}
            </div>
          </div>

          {/* Location Verification Box */}
          <div className="p-4 rounded-xl border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Detected Location
              </span>
              {!isDetecting && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={requestLocation}
                  disabled={isStarting}
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry GPS
                </Button>
              )}
            </div>

            {isDetecting ? (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-60"></span>
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600 relative" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  Detecting your GPS location...
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Please grant browser permission when prompted
                </p>
              </div>
            ) : hasCoordinates ? (
              <div className="space-y-2.5">
                <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      GPS Location Acquired
                    </span>
                    {location?.accuracy && (
                      <span className="text-[10px] text-emerald-600 font-mono font-semibold bg-emerald-500/15 px-1.5 py-0.5 rounded">
                        ±{location.accuracy}m accuracy
                      </span>
                    )}
                  </div>

                  <div className="font-mono text-xs text-foreground font-semibold flex items-center justify-between">
                    <span>
                      {location!.latitude.toFixed(6)}° N, {location!.longitude.toFixed(6)}° E
                    </span>
                    {googleMapsUrl && (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-sans font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
                      >
                        View Map <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {address ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      📍 {address}
                    </p>
                  ) : isReverseGeocoding ? (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 italic">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Resolving landmark address...
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span>
                    Timestamped at: <strong className="text-foreground">{new Date().toLocaleTimeString()}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>GPS Location Unavailable</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {errorMsg || "Could not retrieve exact GPS coordinates. You can still proceed with standard check-in."}
                </p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-tight px-1">
            ℹ️ This location will be saved to your task session history and counted as your official Check-In on the daily attendance register.
          </p>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-3.5 sm:p-4 bg-muted/40 border-t shrink-0 flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isStarting}
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold h-9 rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={isStarting}
            onClick={() => onConfirm(hasCoordinates ? location : null)}
            className="text-xs font-bold h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Checking In...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Confirm Check-In & Start</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
