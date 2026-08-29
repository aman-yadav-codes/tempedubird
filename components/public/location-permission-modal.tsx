"use client";

import React, { useState } from "react";
import { MapPin, Navigation, X, Check, Loader2, Compass, Sparkles } from "lucide-react";
import { useUserLocation } from "@/hooks/use-user-location";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function LocationPermissionBanner() {
  const {
    location,
    isDetected,
    isDetecting,
    showPrompt,
    setLocation,
    requestLocation,
    dismissPrompt,
    availableLocations,
  } = useUserLocation();

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-rose-200/80 p-4 shadow-2xl space-y-3 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -left-12 w-28 h-28 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md shrink-0 animate-pulse">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-gray-900 leading-snug flex items-center gap-1.5">
                <span>Find Nearby Institutes & Courses</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              </h4>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Allow location to discover verified colleges, teachers & programs in your city.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissPrompt}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss location banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={() => requestLocation(false)}
            disabled={isDetecting}
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 shadow-sm rounded-xl flex-1 cursor-pointer"
          >
            {isDetecting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Detecting City...</span>
              </>
            ) : (
              <>
                <Navigation className="h-3.5 w-3.5" />
                <span>Allow Live Location</span>
              </>
            )}
          </Button>

          {/* Quick city dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer"
              >
                <MapPin className="h-3.5 w-3.5 mr-1 text-gray-500" />
                <span>Choose City</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 max-h-60 overflow-y-auto">
              <DropdownMenuLabel className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Select Your City
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableLocations.map((city) => (
                <DropdownMenuItem
                  key={city}
                  onClick={() => setLocation(city, false)}
                  className={cn(
                    "cursor-pointer text-xs font-medium",
                    location === city && "font-bold text-rose-700 bg-rose-50"
                  )}
                >
                  {city}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
