"use client";

declare global {
  interface Window {
    google?: any;
    L?: any;
  }
}

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PickedLocation = {
  latitude: string;
  longitude: string;
  country: string;
  state: string;
  city: string;
  area: string;
  pincode: string;
  full_address: string;
  formatted_address: string;
  place_id?: string;
};

export type StandardLocationProps = {
  value: PickedLocation | null | undefined;
  onChange: (location: PickedLocation) => void;
  apiKey?: string;
  countryRestriction?: string;
  showStructuredInputs?: boolean;
  className?: string;
};

const DEFAULT_CENTER = {
  lat: 25.3176, // Varanasi / Central India default
  lng: 82.9739,
};

export function GoogleLocationPicker({
  value,
  onChange,
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  countryRestriction = "in",
  showStructuredInputs = true,
  className = "",
}: StandardLocationProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Map instance references
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const isGoogleInstance = useRef(false);

  const latNum = value?.latitude ? parseFloat(String(value.latitude)) : DEFAULT_CENTER.lat;
  const lngNum = value?.longitude ? parseFloat(String(value.longitude)) : DEFAULT_CENTER.lng;

  // 1. Try loading Google Maps if API key is present
  useEffect(() => {
    if (!apiKey) {
      setGoogleError(true);
      return;
    }

    if (typeof window !== "undefined" && typeof window.google?.maps?.Map === "function") {
      setGoogleReady(true);
    } else {
      setGoogleError(true);
    }
  }, [apiKey]);

  // 2. Load Leaflet as reliable fallback / default engine
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).L) {
      setLeafletReady(true);
      return;
    }

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setLeafletReady(true);
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if ((window as any).L) {
          clearInterval(interval);
          setLeafletReady(true);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // Reverse geocoding helper (OpenStreetMap Nominatim)
  const reverseGeocode = useCallback(
    async (lat: string, lng: string, placeId = "") => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        const data = await res.json();
        const address = data?.address || {};

        const area =
          address.suburb ||
          address.neighbourhood ||
          address.residential ||
          address.road ||
          address.quarter ||
          "";
        const city =
          address.city ||
          address.town ||
          address.village ||
          address.state_district ||
          address.county ||
          "";
        const state = address.state || "";
        const country = address.country || value?.country || "India";
        const pincode = address.postcode || "";
        const formatted = data?.display_name || "";

        onChange({
          latitude: lat,
          longitude: lng,
          country,
          state,
          city,
          area,
          pincode,
          full_address: value?.full_address || formatted,
          formatted_address: formatted,
          place_id: placeId || String(data?.place_id || ""),
        });
      } catch {
        onChange({
          latitude: lat,
          longitude: lng,
          country: value?.country || "India",
          state: value?.state || "",
          city: value?.city || "",
          area: value?.area || "",
          pincode: value?.pincode || "",
          full_address: value?.full_address || "",
          formatted_address: value?.formatted_address || "",
          place_id: placeId,
        });
      }
    },
    [onChange, value]
  );

  // Initialize Map Engine (Google Maps or Leaflet)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // A) If Google Maps is available, functional, and no error
    if (
      googleReady &&
      !googleError &&
      typeof window !== "undefined" &&
      typeof window.google?.maps?.Map === "function" &&
      typeof window.google?.maps?.Marker === "function"
    ) {
      try {
        const google = window.google;
        const initialPos = { lat: latNum, lng: lngNum };

        const map = new google.maps.Map(mapRef.current, {
          center: initialPos,
          zoom: value?.latitude && value?.longitude ? 15 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const marker = new google.maps.Marker({
          position: initialPos,
          map,
          draggable: true,
          visible: Boolean(value?.latitude && value?.longitude),
        });

        isGoogleInstance.current = true;
        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;

        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (pos) {
            const lat = typeof pos.lat === "function" ? pos.lat().toFixed(4) : Number(pos.lat).toFixed(4);
            const lng = typeof pos.lng === "function" ? pos.lng().toFixed(4) : Number(pos.lng).toFixed(4);
            reverseGeocode(lat, lng);
          }
        });

        map.addListener("click", (e: any) => {
          if (!e.latLng) return;
          const lat = typeof e.latLng.lat === "function" ? e.latLng.lat().toFixed(4) : Number(e.latLng.lat).toFixed(4);
          const lng = typeof e.latLng.lng === "function" ? e.latLng.lng().toFixed(4) : Number(e.latLng.lng).toFixed(4);

          marker.setPosition(e.latLng);
          marker.setVisible(true);
          reverseGeocode(lat, lng);
        });

        setMapLoaded(true);
        return;
      } catch (err) {
        console.warn("Google Maps init failed, falling back to Leaflet:", err);
        setGoogleError(true);
      }
    }

    // B) Leaflet Map Engine
    if (leafletReady) {
      const L = (window as any).L;
      if (!L) return;

      const map = L.map(mapRef.current, {
        center: [latNum, lngNum],
        zoom: value?.latitude && value?.longitude ? 14 : 11,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "custom-pin",
        html: `
          <div style="
            width: 32px;
            height: 32px;
            background: #e11d48;
            border: 2.5px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 10px; height: 10px; background: #ffffff; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      if (value?.latitude && value?.longitude) {
        const marker = L.marker([latNum, lngNum], { icon: pinIcon, draggable: true }).addTo(map);
        markerInstanceRef.current = marker;

        marker.on("dragend", (e: any) => {
          const pos = e.target.getLatLng();
          reverseGeocode(pos.lat.toFixed(4), pos.lng.toFixed(4));
        });
      }

      map.on("click", (e: any) => {
        const lat = e.latlng.lat.toFixed(4);
        const lng = e.latlng.lng.toFixed(4);

        if (markerInstanceRef.current) {
          markerInstanceRef.current.setLatLng(e.latlng);
        } else {
          const marker = L.marker(e.latlng, { icon: pinIcon, draggable: true }).addTo(map);
          markerInstanceRef.current = marker;

          marker.on("dragend", (ev: any) => {
            const p = ev.target.getLatLng();
            reverseGeocode(p.lat.toFixed(4), p.lng.toFixed(4));
          });
        }

        reverseGeocode(lat, lng);
      });

      isGoogleInstance.current = false;
      mapInstanceRef.current = map;
      setMapLoaded(true);

      return () => {
        map.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      };
    }
  }, [googleReady, googleError, leafletReady, latNum, lngNum, reverseGeocode, value?.latitude, value?.longitude]);

  // Sync marker position when coordinates change externally
  useEffect(() => {
    if (!mapInstanceRef.current || !value?.latitude || !value?.longitude) return;
    const lat = parseFloat(String(value.latitude));
    const lng = parseFloat(String(value.longitude));
    if (isNaN(lat) || isNaN(lng)) return;

    if (isGoogleInstance.current && window.google?.maps) {
      const pos = { lat, lng };
      markerInstanceRef.current?.setPosition(pos);
      markerInstanceRef.current?.setVisible(true);
      mapInstanceRef.current?.panTo(pos);
    } else {
      mapInstanceRef.current?.panTo([lat, lng]);
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng([lat, lng]);
      }
    }
  }, [value?.latitude, value?.longitude]);

  // Search Address / Landmark
  const handleSearchSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=1&addressdetails=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat).toFixed(4);
        const lng = parseFloat(item.lon).toFixed(4);

        if (mapInstanceRef.current) {
          if (isGoogleInstance.current && typeof mapInstanceRef.current.panTo === "function") {
            const pos = { lat: parseFloat(lat), lng: parseFloat(lng) };
            mapInstanceRef.current.panTo(pos);
            mapInstanceRef.current.setZoom(15);
            markerInstanceRef.current?.setPosition(pos);
            markerInstanceRef.current?.setVisible(true);
          } else if ((window as any).L) {
            const L = (window as any).L;
            mapInstanceRef.current.panTo([parseFloat(lat), parseFloat(lng)]);
            mapInstanceRef.current.setZoom(15);

            if (markerInstanceRef.current) {
              markerInstanceRef.current.setLatLng([parseFloat(lat), parseFloat(lng)]);
            } else {
              const pinIcon = L.divIcon({
                className: "custom-pin",
                html: `
                  <div style="
                    width: 32px;
                    height: 32px;
                    background: #e11d48;
                    border: 2.5px solid #ffffff;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  ">
                    <div style="width: 10px; height: 10px; background: #ffffff; border-radius: 50%;"></div>
                  </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
              });
              const marker = L.marker([parseFloat(lat), parseFloat(lng)], {
                icon: pinIcon,
                draggable: true,
              }).addTo(mapInstanceRef.current);
              markerInstanceRef.current = marker;
            }
          }
        }

        const address = item.address || {};
        const area =
          address.suburb ||
          address.neighbourhood ||
          address.residential ||
          address.road ||
          address.quarter ||
          "";
        const city =
          address.city ||
          address.town ||
          address.village ||
          address.state_district ||
          address.county ||
          "";
        const state = address.state || "";
        const country = address.country || value?.country || "India";
        const pincode = address.postcode || "";

        onChange({
          latitude: lat,
          longitude: lng,
          country,
          state,
          city,
          area,
          pincode,
          full_address: item.display_name || value?.full_address || "",
          formatted_address: item.display_name || "",
          place_id: String(item.place_id || ""),
        });
      }
    } catch (err) {
      console.error("Geocoding failed", err);
    } finally {
      setSearching(false);
    }
  };

  const handleFieldChange = (field: keyof PickedLocation, val: string) => {
    onChange({
      latitude: value?.latitude || "",
      longitude: value?.longitude || "",
      country: value?.country || "India",
      state: value?.state || "",
      city: value?.city || "",
      area: value?.area || "",
      pincode: value?.pincode || "",
      full_address: value?.full_address || "",
      formatted_address: value?.formatted_address || "",
      place_id: value?.place_id || "",
      [field]: val,
    });
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Standard Header */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0" />
          <span>Address & Map Pin Location</span>
        </Label>
        <span className="text-[11px] text-muted-foreground">Select on map or search address</span>
      </div>

      {/* Embedded Map Surface with Floating Search */}
      <div className="space-y-2">
        <div className="relative rounded-2xl overflow-hidden border border-border/80 shadow-xs h-64 bg-muted/30">
          <div
            className="absolute left-3 right-3 top-3 z-500 sm:left-4 sm:right-auto sm:w-[380px] flex items-center shadow-lg rounded-xl overflow-hidden border bg-white dark:bg-slate-900"
          >
            <div className="pl-3 text-muted-foreground">
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Search className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSearchSubmit(e);
                }
              }}
              placeholder="Search location..."
              className="w-full pl-2.5 pr-3 py-2 text-xs bg-transparent text-foreground outline-none font-medium placeholder:text-muted-foreground/70"
            />
          </div>

          <div ref={mapRef} className="w-full h-full z-0 cursor-crosshair" />

          {!mapLoaded && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center gap-2 z-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Loading interactive map...</span>
            </div>
          )}
        </div>

        {/* Location Info Banner */}
        {value?.latitude && value?.longitude ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl border bg-muted/20 text-xs text-foreground">
            <MapPin className="h-4 w-4 text-rose-600 shrink-0" />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0 flex-1">
              <span className="font-bold text-foreground truncate">
                {[value.area, value.city, value.state, value.country].filter(Boolean).join(", ") || "Pinned Location"}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                ({value.latitude}, {value.longitude})
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed text-xs text-muted-foreground bg-muted/10">
            <MapPin className="h-4 w-4 text-muted-foreground/60 shrink-0" />
            <span>Pick a location from search or the map.</span>
          </div>
        )}
      </div>

      {/* Structured Address Fields */}
      {showStructuredInputs && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Country</Label>
              <Input
                value={value?.country || ""}
                onChange={(e) => handleFieldChange("country", e.target.value)}
                placeholder="e.g. India"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input
                value={value?.state || ""}
                onChange={(e) => handleFieldChange("state", e.target.value)}
                placeholder="e.g. Madhya Pradesh, Uttar Pradesh"
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">City *</Label>
              <Input
                value={value?.city || ""}
                onChange={(e) => handleFieldChange("city", e.target.value)}
                placeholder="e.g. Indore, Varanasi, Delhi"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Area / Locality *</Label>
              <Input
                value={value?.area || ""}
                onChange={(e) => handleFieldChange("area", e.target.value)}
                placeholder="e.g. Bhawarkua, Mahmoorganj"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pincode / Postal Code</Label>
              <Input
                value={value?.pincode || ""}
                onChange={(e) => handleFieldChange("pincode", e.target.value)}
                placeholder="e.g. 452001, 221010"
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Full Street Address & Landmark</Label>
            <Input
              value={value?.full_address || value?.formatted_address || ""}
              onChange={(e) => handleFieldChange("full_address", e.target.value)}
              placeholder="e.g. Building 4B, Near City Library, University Road"
              className="text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-0.5">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-mono">Latitude (auto-filled)</Label>
              <Input
                type="number"
                step="0.0001"
                value={value?.latitude || ""}
                onChange={(e) => handleFieldChange("latitude", e.target.value)}
                placeholder="e.g. 25.3176"
                className="text-xs font-mono h-8 bg-muted/20"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-mono">Longitude (auto-filled)</Label>
              <Input
                type="number"
                step="0.0001"
                value={value?.longitude || ""}
                onChange={(e) => handleFieldChange("longitude", e.target.value)}
                placeholder="e.g. 82.9739"
                className="text-xs font-mono h-8 bg-muted/20"
              />
            </div>
          </div>
        </div>
      )}

      {apiKey && !googleReady && !googleError && (
        <Script
          id="google-maps-places"
          src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`}
          strategy="afterInteractive"
          onReady={() => setGoogleReady(true)}
          onError={() => setGoogleError(true)}
        />
      )}
    </div>
  );
}
