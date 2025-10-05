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
  currentAddress?: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    coordinates: [number, number];
  };
}

export const AppointmentMap = ({ appointments, selectedDate, currentAddress }: AppointmentMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const lastViewRef = useRef<{ center: [number, number]; zoom: number } | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Filter appointments for selected date
    const filteredAppointments = selectedDate
      ? appointments.filter((apt) => {
          const selDate = selectedDate.toLocaleDateString("de-DE");
          return apt.date === selDate;
        })
      : appointments;

    // Save current view if map exists
    if (mapInstance.current) {
      const center = mapInstance.current.getCenter();
      const zoom = mapInstance.current.getZoom();
      lastViewRef.current = {
        center: [center.lat, center.lng],
        zoom: zoom
      };
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    // Determine center and zoom
    let defaultCenter: [number, number];
    let defaultZoom: number;
    
    if (filteredAppointments.length > 0) {
      defaultCenter = [filteredAppointments[0].coordinates[1], filteredAppointments[0].coordinates[0]];
      defaultZoom = 15;
    } else if (lastViewRef.current) {
      // Keep last view if no appointments
      defaultCenter = lastViewRef.current.center;
      defaultZoom = lastViewRef.current.zoom;
    } else if (currentAddress) {
      // Center on current address if no appointments and no saved view
      defaultCenter = [currentAddress.coordinates[1], currentAddress.coordinates[0]];
      defaultZoom = 15;
    } else {
      // Default to Lindenau
      defaultCenter = [47.5580, 10.0310];
      defaultZoom = 15;
    }

    // Initialize map
    const map = L.map(mapContainer.current).setView(defaultCenter, defaultZoom);
    mapInstance.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add green marker for current address
    if (currentAddress) {
      const greenIcon = L.divIcon({
        className: "current-address-marker",
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #22c55e;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const currentMarker = L.marker([currentAddress.coordinates[1], currentAddress.coordinates[0]], { 
        icon: greenIcon 
      }).addTo(map);

      currentMarker.bindPopup(`
        <div style="padding: 4px; font-size: 12px;">
          <div style="font-weight: 600; margin-bottom: 4px; color: #22c55e;">Aktuelle Adresse</div>
          <div style="color: #666;">${currentAddress.street} ${currentAddress.houseNumber}</div>
          <div style="color: #666;">${currentAddress.postalCode} ${currentAddress.city}</div>
        </div>
      `);
    }

    // Add markers for each appointment
    const bounds = L.latLngBounds([]);
    
    // Add current address to bounds if it exists
    if (currentAddress) {
      bounds.extend([currentAddress.coordinates[1], currentAddress.coordinates[0]]);
    }
    
    filteredAppointments.forEach((apt) => {
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            position: relative;
            background: #3b82f6;
            color: white;
            padding: 4px 8px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            white-space: nowrap;
            border: 2px solid white;
          ">
            ${apt.time}
            <div style="
              position: absolute;
              bottom: -5px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 5px solid white;
            "></div>
            <div style="
              position: absolute;
              bottom: -3px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 4px solid transparent;
              border-right: 4px solid transparent;
              border-top: 4px solid #3b82f6;
            "></div>
          </div>
        `,
        iconSize: [50, 28],
        iconAnchor: [25, 28],
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

    // Fit bounds to show all markers (only if there are appointments)
    if (filteredAppointments.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
      // Save new view
      const center = map.getCenter();
      lastViewRef.current = {
        center: [center.lat, center.lng],
        zoom: map.getZoom()
      };
    } else if (filteredAppointments.length === 1) {
      map.setView([filteredAppointments[0].coordinates[1], filteredAppointments[0].coordinates[0]], 15);
      // Save new view
      lastViewRef.current = {
        center: [filteredAppointments[0].coordinates[1], filteredAppointments[0].coordinates[0]],
        zoom: 15
      };
    } else if (filteredAppointments.length === 0 && currentAddress) {
      // No appointments - center on current address
      map.setView([currentAddress.coordinates[1], currentAddress.coordinates[0]], 16);
      // Save new view
      lastViewRef.current = {
        center: [currentAddress.coordinates[1], currentAddress.coordinates[0]],
        zoom: 16
      };
    }
    // If no appointments and no current address, keep the current view (already set above)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [appointments, selectedDate, currentAddress]);

  // Filter appointments for selected date
  const filteredAppointments = selectedDate
    ? appointments.filter((apt) => {
        const selDate = selectedDate.toLocaleDateString("de-DE");
        return apt.date === selDate;
      })
    : appointments;

  return (
    <div className="w-full h-[300px] rounded-lg border border-border overflow-hidden" ref={mapContainer} />
  );
};
