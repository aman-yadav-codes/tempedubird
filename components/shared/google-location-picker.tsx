"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
    __googleMapsPlacesReady?: () => void;
  }
}

type LatLngLiteral = {
  lat: number;
  lng: number;
};

type GoogleLatLng = {
  lat: () => number;
  lng: () => number;
};

type LatLngLike = LatLngLiteral | GoogleLatLng;

type AddressComponent = {
  long_name: string;
  types: string[];
};

type GeocoderResult = {
  address_components?: AddressComponent[];
  formatted_address?: string;
  place_id?: string;
};

type GoogleMap = {
  panTo: (position: LatLngLike) => void;
  setZoom: (zoom: number) => void;
  addListener: (
    eventName: "click",
    callback: (event: { latLng: LatLngLike | null }) => void
  ) => void;
};

type GoogleMarker = {
  setVisible: (visible: boolean) => void;
  setPosition: (position: LatLngLike) => void;
  getPosition: () => LatLngLike | null;
  addListener: (eventName: "dragend", callback: () => void) => void;
};

type GoogleGeocoder = {
  geocode: (
    request: { location: LatLngLike },
    callback: (results: GeocoderResult[] | null, status: string) => void
  ) => void;
};

type GooglePlace = {
  geometry?: {
    location?: LatLngLike;
  };
  place_id?: string;
};

type GoogleAutocomplete = {
  bindTo: (key: string, map: GoogleMap) => void;
  addListener: (eventName: "place_changed", callback: () => void) => void;
  getPlace: () => GooglePlace;
};

type GoogleMapsNamespace = {
  maps: {
    Map: new (
      element: HTMLElement,
      options: Record<string, unknown>
    ) => GoogleMap;
    Marker: new (options: Record<string, unknown>) => GoogleMarker;
    Geocoder: new () => GoogleGeocoder;
    places: {
      Autocomplete: new (
        input: HTMLInputElement,
        options: Record<string, unknown>
      ) => GoogleAutocomplete;
    };
  };
};

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
  place_id: string;
};

type GoogleLocationPickerProps = {
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
  apiKey?: string;
  countryRestriction?: string;
};

const DEFAULT_LOCATION = {
  lat: 25.3176,
  lng: 82.9739,
};

function getComponent(components: AddressComponent[], type: string) {
  const match = components.find((component) => component.types.includes(type));
  return match?.long_name ?? "";
}

function isGoogleLatLng(position: LatLngLike): position is GoogleLatLng {
  return typeof position.lat === "function";
}

function getLatLng(position: LatLngLike) {
  const lat = isGoogleLatLng(position) ? position.lat() : position.lat;
  const lng = isGoogleLatLng(position) ? position.lng() : position.lng;

  return {
    latitude: Number(lat).toFixed(7),
    longitude: Number(lng).toFixed(7),
  };
}

function isGoogleMapsReady(google?: GoogleMapsNamespace) {
  return Boolean(
    google?.maps &&
      typeof google.maps.Map === "function" &&
      typeof google.maps.Marker === "function" &&
      typeof google.maps.Geocoder === "function" &&
      typeof google.maps.places?.Autocomplete === "function"
  );
}

export function GoogleLocationPicker({
  value,
  onChange,
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  countryRestriction = "in",
}: GoogleLocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  const initializeMap = useCallback(() => {
    const google = window.google;

    if (
      initializedRef.current ||
      !isGoogleMapsReady(google) ||
      !mapRef.current ||
      !searchInputRef.current
    ) {
      return;
    }

    initializedRef.current = true;

    const initialPosition =
      value?.latitude && value?.longitude
        ? {
            lat: Number(value.latitude),
            lng: Number(value.longitude),
          }
        : DEFAULT_LOCATION;

    const map = new google.maps.Map(mapRef.current, {
      center: initialPosition,
      zoom: value ? 15 : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapInstanceRef.current = map;

    const marker = new google.maps.Marker({
      position: initialPosition,
      map,
      draggable: true,
      visible: Boolean(value),
    });
    markerInstanceRef.current = marker;

    const geocoder = new google.maps.Geocoder();

    const updateLocationDetails = (position: LatLngLike, placeId = "") => {
      geocoder.geocode({ location: position }, (results, status) => {
        if (status !== "OK" || !results?.[0]) return;

        const result = results[0];
        const components = result.address_components ?? [];
        const coordinates = getLatLng(position);
        const city =
          getComponent(components, "locality") ||
          getComponent(components, "administrative_area_level_2");
        const area =
          getComponent(components, "sublocality") ||
          getComponent(components, "sublocality_level_1") ||
          getComponent(components, "neighborhood") ||
          getComponent(components, "route");

        onChange({
          ...coordinates,
          country: getComponent(components, "country"),
          state: getComponent(components, "administrative_area_level_1"),
          city,
          area,
          pincode: getComponent(components, "postal_code"),
          full_address: result.formatted_address ?? "",
          formatted_address: result.formatted_address ?? "",
          place_id: placeId || result.place_id || "",
        });
      });
    };

    const autocomplete = new google.maps.places.Autocomplete(
      searchInputRef.current,
      {
        componentRestrictions: countryRestriction
          ? { country: countryRestriction }
          : undefined,
        fields: ["formatted_address", "geometry", "name", "place_id"],
      }
    );

    autocomplete.bindTo("bounds", map);

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const location = place.geometry?.location;

      if (!location) return;

      marker.setVisible(true);
      marker.setPosition(location);
      map.panTo(location);
      map.setZoom(16);
      updateLocationDetails(location, place.place_id ?? "");
    });

    marker.addListener("dragend", () => {
      const position = marker.getPosition();
      if (!position) return;

      marker.setVisible(true);
      updateLocationDetails(position);
    });

    map.addListener("click", (event) => {
      const clickedLocation = event.latLng;
      if (!clickedLocation) return;

      marker.setVisible(true);
      marker.setPosition(clickedLocation);
      updateLocationDetails(clickedLocation);
    });
  }, [countryRestriction, onChange, value]);

  useEffect(() => {
    window.__googleMapsPlacesReady = () => {
      setScriptReady(true);
      initializeMap();
    };

    if (isGoogleMapsReady(window.google)) {
      window.__googleMapsPlacesReady();
    }

    return () => {
      if (window.__googleMapsPlacesReady) {
        window.__googleMapsPlacesReady = undefined;
      }
    };
  }, [initializeMap, scriptReady]);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.value = value?.formatted_address || value?.full_address || "";
    }
  }, [value?.formatted_address, value?.full_address]);

  useEffect(() => {
    if (!window.google || !mapInstanceRef.current || !markerInstanceRef.current) {
      return;
    }

    if (value?.latitude && value?.longitude) {
      const lat = Number(value.latitude);
      const lng = Number(value.longitude);
      const pos = { lat, lng };

      // check if the position is actually different from the marker's current position
      const currentPos = markerInstanceRef.current.getPosition();
      let isDifferent = true;
      if (currentPos) {
        const curLat = typeof currentPos.lat === "function" ? currentPos.lat() : currentPos.lat;
        const curLng = typeof currentPos.lng === "function" ? currentPos.lng() : currentPos.lng;
        if (Math.abs(curLat - lat) < 0.0001 && Math.abs(curLng - lng) < 0.0001) {
          isDifferent = false;
        }
      }

      if (isDifferent) {
        markerInstanceRef.current.setPosition(pos);
        markerInstanceRef.current.setVisible(true);
        mapInstanceRef.current.panTo(pos);
        mapInstanceRef.current.setZoom(15);
      }
    } else {
      markerInstanceRef.current.setVisible(false);
    }
  }, [value?.latitude, value?.longitude]);

  const detailRows = value
    ? [
        ["Latitude", value.latitude],
        ["Longitude", value.longitude],
        ["Country", value.country || "-"],
        ["State", value.state || "-"],
        ["City", value.city || "-"],
        ["Area", value.area || "-"],
        ["Pincode", value.pincode || "-"],
      ]
    : [];

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-md border bg-muted">
        <div className="absolute left-3 right-3 top-3 z-10 sm:left-4 sm:right-auto sm:w-[420px] sm:max-w-[calc(100%-2rem)]">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search location..."
            className="h-11 rounded-md border border-slate-300 bg-white px-4 text-slate-950 shadow-xl placeholder:text-slate-500 focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20 dark:border-slate-300 dark:bg-white dark:text-slate-950 dark:placeholder:text-slate-500"
            disabled={!apiKey || scriptError}
          />
        </div>
        <div ref={mapRef} className="h-[320px] w-full" />
        {(!apiKey || scriptError) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/90 px-6 text-center text-sm text-muted-foreground">
            {!apiKey
              ? "Google Maps API key is missing."
              : "Google Maps could not be loaded."}
          </div>
        )}
      </div>

      {value ? (
        <div className="grid gap-2 rounded-md border bg-muted/30 p-3 text-xs sm:grid-cols-2">
          {detailRows.map(([label, detail]) => (
            <div key={label} className="min-w-0">
              <span className="text-muted-foreground">{label}</span>
              <p className="truncate font-medium" title={detail}>
                {detail}
              </p>
            </div>
          ))}
          <div className="min-w-0 sm:col-span-2">
            <span className="text-muted-foreground">Address</span>
            <p className="line-clamp-2 font-medium" title={value.formatted_address}>
              {value.formatted_address || "-"}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          Pick a location from search or the map.
        </div>
      )}

      {apiKey && (
        <Script
          id="google-maps-places"
          src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=__googleMapsPlacesReady`}
          strategy="afterInteractive"
          onReady={() => {
            if (isGoogleMapsReady(window.google)) {
              window.__googleMapsPlacesReady?.();
            }
          }}
          onError={() => setScriptError(true)}
        />
      )}
    </div>
  );
}
