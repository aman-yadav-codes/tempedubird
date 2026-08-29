"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type StandardLocationValue = {
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  pincode?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
};

interface UniversalLocationPickerProps {
  value: StandardLocationValue;
  onChange: (updated: StandardLocationValue) => void;
  showMap?: boolean;
  showCoordinates?: boolean;
  showStructuredFields?: boolean;
  showAddressAndPincode?: boolean;
  className?: string;
}

export function UniversalLocationPicker({
  value,
  onChange,
  showMap = true,
  showCoordinates = true,
  showStructuredFields = true,
  showAddressAndPincode = false,
  className = "",
}: UniversalLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const latNum = value?.latitude ? parseFloat(String(value.latitude)) : 25.3176; // Default to Varanasi / India center
  const lngNum = value?.longitude ? parseFloat(String(value.longitude)) : 82.9739;

  // Load Leaflet resources dynamically
  useEffect(() => {
    if (typeof window === "undefined" || !showMap) return;

    if ((window as any).L) {
      setLeafletLoaded(true);
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
      script.onload = () => setLeafletLoaded(true);
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if ((window as any).L) {
          clearInterval(interval);
          setLeafletLoaded(true);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [showMap]);

  // Reverse geocode lat & lng into structured address components
  const reverseGeocode = useCallback(
    async (lat: string, lng: string) => {
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
        const country = address.country || "India";
        const pincode = address.postcode || "";
        const fullAddress = data?.display_name || "";

        onChange({
          ...value,
          latitude: lat,
          longitude: lng,
          country: country || value.country || "India",
          state: state || value.state || "",
          city: city || value.city || "",
          area: area || value.area || "",
          pincode: pincode || value.pincode || "",
          address: value.address || fullAddress || "",
        });
      } catch {
        onChange({
          ...value,
          latitude: lat,
          longitude: lng,
        });
      }
    },
    [onChange, value]
  );

  // Initialize Map
  useEffect(() => {
    if (!showMap || !leafletLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapContainerRef.current, {
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
      markerRef.current = marker;

      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        reverseGeocode(pos.lat.toFixed(4), pos.lng.toFixed(4));
      });
    }

    // Map Click to Pin
    map.on("click", (e: any) => {
      const lat = e.latlng.lat.toFixed(4);
      const lng = e.latlng.lng.toFixed(4);

      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        const marker = L.marker(e.latlng, { icon: pinIcon, draggable: true }).addTo(map);
        markerRef.current = marker;

        marker.on("dragend", (event: any) => {
          const pos = event.target.getLatLng();
          reverseGeocode(pos.lat.toFixed(4), pos.lng.toFixed(4));
        });
      }

      reverseGeocode(lat, lng);
    });

    mapInstanceRef.current = map;
    setMapLoading(false);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [leafletLoaded, showMap]);

  // Sync marker position when value latitude/longitude change
  useEffect(() => {
    if (!mapInstanceRef.current || !value?.latitude || !value?.longitude) return;
    const L = (window as any).L;
    if (!L) return;

    const lat = parseFloat(String(value.latitude));
    const lng = parseFloat(String(value.longitude));
    if (isNaN(lat) || isNaN(lng)) return;

    mapInstanceRef.current.panTo([lat, lng]);
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [value?.latitude, value?.longitude]);

  // Search locality / address on map
  const handleSearchLocation = async (e?: React.FormEvent | React.KeyboardEvent) => {
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
          const L = (window as any).L;
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

          mapInstanceRef.current.panTo([parseFloat(lat), parseFloat(lng)]);
          mapInstanceRef.current.setZoom(15);

          if (markerRef.current) {
            markerRef.current.setLatLng([parseFloat(lat), parseFloat(lng)]);
          } else {
            const marker = L.marker([parseFloat(lat), parseFloat(lng)], {
              icon: pinIcon,
              draggable: true,
            }).addTo(mapInstanceRef.current);
            markerRef.current = marker;
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
        const country = address.country || "India";
        const pincode = address.postcode || "";

        onChange({
          ...value,
          latitude: lat,
          longitude: lng,
          country: country || value.country || "India",
          state: state || value.state || "",
          city: city || value.city || "",
          area: area || value.area || "",
          pincode: pincode || value.pincode || "",
          address: item.display_name || value.address || "",
        });
      }
    } catch (err) {
      console.error("Search location failed", err);
    } finally {
      setSearching(false);
    }
  };

  const handleFieldChange = (field: keyof StandardLocationValue, val: string) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Header Label */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0" />
          <span>Address & Map Pin Location</span>
        </Label>
        <span className="text-[11px] text-muted-foreground">Select on map or search address</span>
      </div>

      {/* Map Surface */}
      {showMap && (
        <div className="space-y-2">
          <div className="relative rounded-2xl overflow-hidden border border-border/80 shadow-xs h-64 bg-muted/30">
            {/* Search Input Floating on Top */}
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
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSearchLocation(e);
                  }
                }}
                placeholder="Search location, area, landmark..."
                className="w-full pl-2.5 pr-3 py-2 text-xs bg-transparent text-foreground outline-none font-medium placeholder:text-muted-foreground/70"
              />
            </div>

            <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

            {mapLoading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center gap-2 z-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">Loading map view...</span>
              </div>
            )}
          </div>

          {/* Location Summary Pill / Information Box */}
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
              <span>Pick a location from search or click anywhere on the map.</span>
            </div>
          )}
        </div>
      )}

      {/* Standard Structured Address Fields */}
      {showStructuredFields && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Country</Label>
              <Input
                value={value?.country || ""}
                onChange={(e) => handleFieldChange("country", e.target.value)}
                placeholder="e.g. India"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">State</Label>
              <Input
                value={value?.state || ""}
                onChange={(e) => handleFieldChange("state", e.target.value)}
                placeholder="e.g. Uttar Pradesh, Madhya Pradesh"
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">City</Label>
              <Input
                value={value?.city || ""}
                onChange={(e) => handleFieldChange("city", e.target.value)}
                placeholder="e.g. Varanasi, Indore, Delhi"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Area / Locality</Label>
              <Input
                value={value?.area || ""}
                onChange={(e) => handleFieldChange("area", e.target.value)}
                placeholder="e.g. Mahmoorganj, Bhawarkua"
                className="text-xs h-9"
              />
            </div>
          </div>

          {showAddressAndPincode && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Pincode / Postal Code</Label>
                <Input
                  value={value?.pincode || ""}
                  onChange={(e) => handleFieldChange("pincode", e.target.value)}
                  placeholder="e.g. 221010, 452001"
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Full Street Address & Landmark</Label>
                <Input
                  value={value?.address || ""}
                  onChange={(e) => handleFieldChange("address", e.target.value)}
                  placeholder="e.g. Building 4B, Near City Library"
                  className="text-xs h-9"
                />
              </div>
            </div>
          )}

          {showCoordinates && (
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
          )}
        </div>
      )}
    </div>
  );
}
