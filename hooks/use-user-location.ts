"use client";

import { useEffect, useState, useCallback } from "react";
import { detectCityFromCoordinates, ALL_AVAILABLE_LOCATIONS } from "@/lib/utils/geo-location";
import { toast } from "sonner";

const STORAGE_KEY_LOCATION = "edubird_user_location";
const STORAGE_KEY_DETECTED = "edubird_location_detected";
const STORAGE_KEY_PROMPTED = "edubird_location_prompted";

export function useUserLocation() {
  const [location, setLocationState] = useState<string>("All Locations");
  const [isDetected, setIsDetected] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const savedLoc = localStorage.getItem(STORAGE_KEY_LOCATION);
      const savedDet = localStorage.getItem(STORAGE_KEY_DETECTED) === "true";
      const hasPrompted = localStorage.getItem(STORAGE_KEY_PROMPTED) === "true";

      if (savedLoc) {
        setLocationState(savedLoc);
        setIsDetected(savedDet);
      } else if (!hasPrompted) {
        // Automatically show permission request banner after short delay on first visit
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage security errors in sandbox
    }
  }, []);

  const setLocation = useCallback((newLoc: string, detected: boolean = false) => {
    setLocationState(newLoc);
    setIsDetected(detected);
    setShowPrompt(false);
    try {
      localStorage.setItem(STORAGE_KEY_LOCATION, newLoc);
      localStorage.setItem(STORAGE_KEY_DETECTED, String(detected));
      localStorage.setItem(STORAGE_KEY_PROMPTED, "true");
    } catch {}
  }, []);

  const requestLocation = useCallback(async (autoPrompt: boolean = false) => {
    if (!navigator.geolocation) {
      if (!autoPrompt) {
        toast.error("Geolocation is not supported by your browser.");
      }
      setShowPrompt(false);
      return;
    }

    setIsDetecting(true);
    try {
      localStorage.setItem(STORAGE_KEY_PROMPTED, "true");
    } catch {}

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const detectedCity = await detectCityFromCoordinates(lat, lng);

          setLocation(detectedCity, true);
          toast.success(`Location detected: ${detectedCity}`, {
            description: "Showing institutions and courses near you.",
          });
        } catch {
          setLocation("Varanasi", true);
        } finally {
          setIsDetecting(false);
          setShowPrompt(false);
        }
      },
      (err) => {
        setIsDetecting(false);
        setShowPrompt(false);
        if (!autoPrompt) {
          if (err.code === err.PERMISSION_DENIED) {
            toast.info("Location permission denied. You can select your city manually.");
          } else {
            toast.error("Unable to retrieve your location.");
          }
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [setLocation]);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    try {
      localStorage.setItem(STORAGE_KEY_PROMPTED, "true");
    } catch {}
  }, []);

  return {
    location: mounted ? location : "All Locations",
    isDetected,
    isDetecting,
    showPrompt,
    setLocation,
    requestLocation,
    dismissPrompt,
    availableLocations: ALL_AVAILABLE_LOCATIONS,
  };
}
