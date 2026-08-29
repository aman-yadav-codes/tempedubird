"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

interface InteractiveLeafletMapProps {
  latitude: string | number;
  longitude: string | number;
  onChange: (coords: { lat: string; lng: string; addressName?: string; city?: string; state?: string }) => void;
  className?: string;
  height?: string;
}

export function InteractiveLeafletMap({
  latitude,
  longitude,
  onChange,
  className = "",
  height = "260px",
}: InteractiveLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const initialLat = latitude ? parseFloat(String(latitude)) : 22.7196; // Default to India / Central
  const initialLng = longitude ? parseFloat(String(longitude)) : 75.8577;

  // Load Leaflet CSS and JS dynamically from CDN
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    // Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }

    // Leaflet JS
    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.crossOrigin = "";
      script.onload = () => {
        setLeafletLoaded(true);
      };
      document.head.appendChild(script);
    } else {
      const checkLeaflet = setInterval(() => {
        if ((window as any).L) {
          clearInterval(checkLeaflet);
          setLeafletLoaded(true);
        }
      }, 100);
      return () => clearInterval(checkLeaflet);
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: latitude && longitude ? 14 : 10,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Custom Red Pin Icon
    const pinIcon = L.divIcon({
      className: "custom-map-pin",
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: #e11d48;
          border: 2px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 10px;
            height: 10px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    let marker: any = null;

    if (latitude && longitude) {
      marker = L.marker([initialLat, initialLng], { icon: pinIcon, draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", async (e: any) => {
        const position = e.target.getLatLng();
        const lat = position.lat.toFixed(4);
        const lng = position.lng.toFixed(4);
        handleReverseGeocode(lat, lng);
      });
    }

    // Click anywhere on map to choose / pin location
    map.on("click", async (e: any) => {
      const lat = e.latlng.lat.toFixed(4);
      const lng = e.latlng.lng.toFixed(4);

      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        const newMarker = L.marker(e.latlng, { icon: pinIcon, draggable: true }).addTo(map);
        markerRef.current = newMarker;

        newMarker.on("dragend", async (event: any) => {
          const pos = event.target.getLatLng();
          handleReverseGeocode(pos.lat.toFixed(4), pos.lng.toFixed(4));
        });
      }

      handleReverseGeocode(lat, lng);
    });

    const handleReverseGeocode = async (lat: string, lng: string) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await res.json();
        const address = data?.address || {};
        const areaName = address.suburb || address.neighbourhood || address.residential || address.road || address.quarter || "";
        const city = address.city || address.town || address.village || address.state_district || "";
        const state = address.state || "";

        onChange({ lat, lng, addressName: areaName, city, state });
      } catch {
        onChange({ lat, lng });
      }
    };

    mapInstanceRef.current = map;
    setLoading(false);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [leafletLoaded]);

  // Update map when latitude/longitude props change externally
  useEffect(() => {
    if (!mapInstanceRef.current || !latitude || !longitude) return;
    const L = (window as any).L;
    if (!L) return;

    const lat = parseFloat(String(latitude));
    const lng = parseFloat(String(longitude));
    if (isNaN(lat) || isNaN(lng)) return;

    mapInstanceRef.current.panTo([lat, lng]);

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [latitude, longitude]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-border/80 shadow-inner ${className}`} style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center gap-2 z-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-xs font-semibold text-muted-foreground">Loading interactive map...</span>
        </div>
      )}

      {/* Floating Instructions Pill */}
      <div className="absolute top-2.5 right-2.5 z-500 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border shadow-md flex items-center gap-1.5 pointer-events-none">
        <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0" />
        <span className="text-[11px] font-bold text-foreground">
          {latitude && longitude ? `Pinned: ${latitude}, ${longitude}` : "Click anywhere on map to pin area"}
        </span>
      </div>
    </div>
  );
}
