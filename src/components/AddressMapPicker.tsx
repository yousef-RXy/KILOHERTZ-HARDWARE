"use client";

import React, { useEffect, useRef, useState } from "react";

export interface SelectedLocation {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
}

interface AddressMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (location: SelectedLocation) => void;
}

export default function AddressMapPicker({
  initialLat = 30.0444,
  initialLng = 31.2357,
  onLocationSelect,
}: AddressMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [detectedSummary, setDetectedSummary] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reverse geocodes the given coordinates and notifies parent
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );

      if (!res.ok) {
        throw new Error("Unable to fetch address for this location.");
      }

      const data = await res.json();
      const addr = data.address || {};

      // Extract address components
      const streetNumber = addr.house_number || "";
      const road = addr.road || addr.pedestrian || addr.street || "";
      const street = [streetNumber, road].filter(Boolean).join(" ") ||
        addr.suburb ||
        addr.neighbourhood ||
        data.name ||
        "";

      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.county ||
        "";

      const state = addr.state || addr.province || addr.region || "";
      const postalCode = addr.postcode || "";
      const country = addr.country || "";

      const locationData: SelectedLocation = {
        street,
        city,
        state,
        postalCode,
        country,
        lat,
        lng,
      };

      const summaryParts = [street, city, state, country].filter(Boolean);
      setDetectedSummary(summaryParts.join(", ") || data.display_name || "Location selected");

      onLocationSelect(locationData);
    } catch (err: any) {
      console.error("Reverse geocoding failed:", err);
      setErrorMessage("Could not detect address automatically. You can fill in the details manually below.");
    } finally {
      setIsGeocoding(false);
    }
  };

  // Initialize Map
  useEffect(() => {
    let isCancelled = false;

    async function setupMap() {
      if (!mapContainerRef.current) return;

      // Dynamically load Leaflet on client side
      const L = (await import("leaflet")).default;

      if (isCancelled || !mapContainerRef.current) return;

      // Clean up previous map instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom sleek pin icon (self-contained SVG / HTML)
      const pinIcon = L.divIcon({
        className: "custom-map-pin-container",
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            background: #ff5533;
            color: #ffffff;
            border: 2px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 14px rgba(0,0,0,0.45);
          ">
            <span style="transform: rotate(45deg); font-size: 16px; font-weight: bold; line-height: 1;">📍</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      // Add draggable marker
      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: pinIcon,
      }).addTo(map);
      markerRef.current = marker;

      // Handle marker dragend
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        setCurrentCoords({ lat: position.lat, lng: position.lng });
        reverseGeocode(position.lat, position.lng);
      });

      // Handle map click
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCurrentCoords({ lat, lng });
        reverseGeocode(lat, lng);
      });

      // Fix sizing glitch when modal opens
      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    }

    setupMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Request browser current location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
        }

        reverseGeocode(latitude, longitude);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        let msg = "Could not get your location. Please select a point directly on the map.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location access was denied in your browser. You can still click anywhere on the map to set your address.";
        }
        setErrorMessage(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="space-y-3">
      {/* Leaflet CSS link inject */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-surface-container-low border border-outline-variant rounded-lg">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">location_searching</span>
          <span className="text-xs text-on-surface font-medium">
            Click map or drag marker to set address
          </span>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          {isLocating ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Finding you...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">my_location</span>
              <span>Use Current Location</span>
            </>
          )}
        </button>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-md text-xs flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">info</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Interactive Map Canvas */}
      <div className="relative w-full h-56 rounded-lg overflow-hidden border border-outline-variant bg-surface-container shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Loading overlay for geocoding */}
        {isGeocoding && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center gap-2 text-xs font-medium text-on-surface z-10">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Detecting address details...</span>
          </div>
        )}
      </div>

      {/* Detected Location Status Bar */}
      {detectedSummary && (
        <div className="p-2.5 bg-surface-container-lowest border border-outline-variant rounded-md flex items-center gap-2 text-xs">
          <span className="material-symbols-outlined text-green-500 text-[18px] shrink-0">check_circle</span>
          <div className="flex-1 truncate">
            <span className="text-on-surface-variant font-medium">Detected: </span>
            <span className="text-on-surface font-semibold">{detectedSummary}</span>
          </div>
          <span className="text-[10px] text-on-surface-variant shrink-0 bg-surface-container px-1.5 py-0.5 rounded">
            Fields updated below
          </span>
        </div>
      )}
    </div>
  );
}
