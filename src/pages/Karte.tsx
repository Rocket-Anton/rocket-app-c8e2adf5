import { useEffect, useRef, useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Mock addresses - same as in LauflistenContent
const mockAddresses = [
  { 
    id: 1, 
    street: "Am Alten Turm", 
    houseNumber: "1", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0810, 50.9206] as [number, number],
    units: [
      { id: 1, floor: "EG", position: "Links", status: "offen" },
      { id: 2, floor: "1. OG", position: "Links", status: "potenzial" },
    ]
  },
  { 
    id: 2, 
    street: "Am Alten Turm", 
    houseNumber: "2", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0812, 50.9206] as [number, number],
    units: [
      { id: 1, floor: "EG", position: "Rechts", status: "bestandskunde" },
      { id: 2, floor: "1. OG", position: "Rechts", status: "termin" },
    ]
  },
  { 
    id: 3, 
    street: "Am Alten Turm", 
    houseNumber: "4", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0814, 50.9207] as [number, number],
    units: [
      { id: 1, floor: "EG", position: "Links", status: "kein-interesse" },
      { id: 2, floor: "1. OG", position: "Links", status: "nicht-angetroffen" },
    ]
  },
  { 
    id: 4, 
    street: "Am Alten Turm", 
    houseNumber: "5", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0815, 50.9207] as [number, number],
    units: [
      { id: 1, floor: "EG", position: "Mitte", status: "offen" },
    ]
  },
  { 
    id: 5, 
    street: "Am Alten Turm", 
    houseNumber: "7", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0816, 50.9207] as [number, number],
    units: [
      { id: 1, floor: "EG", position: "Links", status: "potenzial" },
      { id: 2, floor: "1. OG", position: "Links", status: "potenzial" },
      { id: 3, floor: "2. OG", position: "Links", status: "offen" },
    ]
  },
  { 
    id: 6, 
    street: "Am Alten Turm", 
    houseNumber: "9", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0817, 50.9207] as [number, number],
    units: [
      { id: 1, floor: "EG", position: "Rechts", status: "gewerbe" },
    ]
  },
  { 
    id: 7, 
    street: "Am Alten Turm", 
    houseNumber: "11", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0819, 50.9207] as [number, number],
    units: [
      { id: 1, floor: "EG", position: "Links", status: "termin" },
      { id: 2, floor: "1. OG", position: "Links", status: "neukunde" },
    ]
  },
];

const statusColorMap: Record<string, string> = {
  "offen": "#6b7280",
  "nicht-angetroffen": "#eab308",
  "karte-eingeworfen": "#f59e0b",
  "potenzial": "#22c55e",
  "neukunde": "#3b82f6",
  "bestandskunde": "#10b981",
  "kein-interesse": "#ef4444",
  "termin": "#a855f7",
  "nicht-vorhanden": "#9ca3af",
  "gewerbe": "#f97316"
};

export default function Karte() {
  const isMobile = useIsMobile();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Initialize map centered on Köln-Heumar
    const map = L.map(mapContainer.current).setView([50.9206, 7.0814], 16);
    mapInstance.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add markers for each address
    const bounds = L.latLngBounds([]);

    mockAddresses.forEach((address) => {
      // Calculate overall status based on units
      const statusCounts: Record<string, number> = {};
      address.units.forEach(unit => {
        statusCounts[unit.status] = (statusCounts[unit.status] || 0) + 1;
      });

      // Determine primary status (most common)
      let primaryStatus = "offen";
      let maxCount = 0;
      Object.entries(statusCounts).forEach(([status, count]) => {
        if (count > maxCount) {
          maxCount = count;
          primaryStatus = status;
        }
      });

      const color = statusColorMap[primaryStatus] || "#6b7280";

      const customIcon = L.divIcon({
        className: "custom-address-marker",
        html: `
          <div style="
            position: relative;
            background: ${color};
            color: white;
            padding: 6px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            white-space: nowrap;
            border: 2px solid white;
          ">
            ${address.houseNumber}
            <div style="
              position: absolute;
              bottom: -6px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 6px solid white;
            "></div>
            <div style="
              position: absolute;
              bottom: -4px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 5px solid ${color};
            "></div>
          </div>
        `,
        iconSize: [40, 30],
        iconAnchor: [20, 30],
      });

      const marker = L.marker([address.coordinates[1], address.coordinates[0]], { 
        icon: customIcon 
      }).addTo(map);

      // Create popup content
      const unitsInfo = address.units.map(unit => 
        `<div style="font-size: 11px; color: #666; padding: 2px 0;">${unit.floor} ${unit.position}</div>`
      ).join('');

      marker.bindPopup(`
        <div style="padding: 8px; font-size: 12px; min-width: 150px;">
          <div style="font-weight: 600; margin-bottom: 6px; color: ${color};">${address.street} ${address.houseNumber}</div>
          <div style="color: #666; margin-bottom: 6px;">${address.postalCode} ${address.city}</div>
          <div style="border-top: 1px solid #e5e7eb; margin-top: 6px; padding-top: 6px;">
            <div style="font-weight: 500; font-size: 11px; margin-bottom: 4px; color: #374151;">Wohneinheiten (${address.units.length}):</div>
            ${unitsInfo}
          </div>
        </div>
      `);

      bounds.extend([address.coordinates[1], address.coordinates[0]]);
    });

    // Fit map to show all markers
    if (mockAddresses.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-muted/30 overflow-hidden" style={{ ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full w-full">
            {/* Header */}
            <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-background">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Karte</h1>
              </div>
            </header>

            {/* Map Container */}
            <div className="flex-1 p-4 sm:p-6 overflow-hidden">
              <div className="h-full w-full rounded-lg border border-border overflow-hidden shadow-sm" ref={mapContainer} />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
