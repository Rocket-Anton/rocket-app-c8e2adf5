import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Appointment {
  id: number;
  date: string;
  time: string;
  address: string;
  customer: string;
  coordinates: [number, number];
}

interface AppointmentMapProps {
  appointments: Appointment[];
  selectedDate?: Date;
}

export const AppointmentMap = ({ appointments, selectedDate }: AppointmentMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Filter appointments for selected date
    const filteredAppointments = selectedDate
      ? appointments.filter((apt) => {
          const selDate = selectedDate.toLocaleDateString("de-DE");
          return apt.date === selDate;
        })
      : appointments;

    // Destroy existing map if it exists
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const defaultCenter: [number, number] =
      filteredAppointments.length > 0
        ? [filteredAppointments[0].coordinates[1], filteredAppointments[0].coordinates[0]]
        : [52.520008, 13.404954]; // Berlin as default

    // Initialize map
    const map = L.map(mapContainer.current).setView(defaultCenter, 12);
    mapInstance.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add markers for each appointment
    const bounds = L.latLngBounds([]);
    
    filteredAppointments.forEach((apt) => {
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            background: #3b82f6;
            color: white;
            padding: 6px 10px;
            border-radius: 16px;
            font-size: 11px;
            font-weight: 600;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            white-space: nowrap;
            border: 2px solid white;
          ">
            ${apt.time}
          </div>
        `,
        iconSize: [60, 30],
        iconAnchor: [30, 15],
      });

      const marker = L.marker([apt.coordinates[1], apt.coordinates[0]], { icon: customIcon }).addTo(map);

      marker.bindPopup(`
        <div style="padding: 4px; font-size: 12px;">
          <div style="font-weight: 600; margin-bottom: 4px;">${apt.time}</div>
          <div style="color: #666; margin-bottom: 4px;">${apt.address}</div>
          ${apt.customer ? `<div style="color: #666;">Kunde: ${apt.customer}</div>` : ""}
        </div>
      `);

      bounds.extend([apt.coordinates[1], apt.coordinates[0]]);
    });

    // Fit bounds to show all markers
    if (filteredAppointments.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (filteredAppointments.length === 1) {
      map.setView([filteredAppointments[0].coordinates[1], filteredAppointments[0].coordinates[0]], 13);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [appointments, selectedDate]);

  // Filter appointments for selected date
  const filteredAppointments = selectedDate
    ? appointments.filter((apt) => {
        const selDate = selectedDate.toLocaleDateString("de-DE");
        return apt.date === selDate;
      })
    : appointments;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">
        {selectedDate
          ? `Termine am ${selectedDate.toLocaleDateString("de-DE")}`
          : "Alle Termine"}
        {filteredAppointments.length > 0 && (
          <span className="ml-2 text-muted-foreground">({filteredAppointments.length})</span>
        )}
      </div>
      <div
        ref={mapContainer}
        className="w-full h-[300px] rounded-lg border border-border overflow-hidden"
      />
    </div>
  );
};
