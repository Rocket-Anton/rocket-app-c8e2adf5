import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

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
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState("");
  const [tokenSubmitted, setTokenSubmitted] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !tokenSubmitted || !mapboxToken) return;

    // Filter appointments for selected date
    const filteredAppointments = selectedDate
      ? appointments.filter((apt) => {
          const aptDate = apt.date.split(".").reverse().join("-");
          const selDate = selectedDate.toLocaleDateString("de-DE");
          return apt.date === selDate;
        })
      : appointments;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: filteredAppointments.length > 0 ? filteredAppointments[0].coordinates : [13.404954, 52.520008], // Berlin as default
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add markers for each appointment
    filteredAppointments.forEach((apt, index) => {
      const el = document.createElement("div");
      el.className = "appointment-marker";
      el.innerHTML = `
        <div style="
          background: #3b82f6;
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          white-space: nowrap;
        ">
          ${apt.time} - ${apt.customer || "Termin"}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <div style="font-weight: 600; margin-bottom: 4px;">${apt.time}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${apt.address}</div>
          ${apt.customer ? `<div style="font-size: 12px; color: #666;">Kunde: ${apt.customer}</div>` : ""}
        </div>
      `);

      new mapboxgl.Marker(el)
        .setLngLat(apt.coordinates)
        .setPopup(popup)
        .addTo(map.current!);
    });

    // Fit bounds to show all markers
    if (filteredAppointments.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredAppointments.forEach((apt) => {
        bounds.extend(apt.coordinates);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }

    return () => {
      map.current?.remove();
    };
  }, [appointments, selectedDate, tokenSubmitted, mapboxToken]);

  if (!tokenSubmitted) {
    return (
      <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
        <div className="text-sm font-medium">Mapbox Token eingeben</div>
        <div className="text-xs text-muted-foreground">
          Gehe zu{" "}
          <a
            href="https://mapbox.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            mapbox.com
          </a>
          , erstelle ein kostenloses Konto und kopiere deinen Public Token.
        </div>
        <Input
          placeholder="pk.eyJ..."
          value={mapboxToken}
          onChange={(e) => setMapboxToken(e.target.value)}
          className="text-xs"
        />
        <Button
          onClick={() => setTokenSubmitted(true)}
          disabled={!mapboxToken}
          className="w-full"
          size="sm"
        >
          Karte anzeigen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">
        {selectedDate
          ? `Termine am ${selectedDate.toLocaleDateString("de-DE")}`
          : "Alle Termine"}
      </div>
      <div
        ref={mapContainer}
        className="w-full h-[300px] rounded-lg border border-border"
      />
    </div>
  );
};
