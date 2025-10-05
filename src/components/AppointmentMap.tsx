import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in React-Leaflet
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

// Component to fit bounds when appointments change
function FitBounds({ appointments }: { appointments: Appointment[] }) {
  const map = useMap();

  useEffect(() => {
    if (appointments.length > 0) {
      const bounds = L.latLngBounds(
        appointments.map((apt) => [apt.coordinates[1], apt.coordinates[0]])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [appointments, map]);

  return null;
}

export const AppointmentMap = ({ appointments, selectedDate }: AppointmentMapProps) => {
  // Filter appointments for selected date
  const filteredAppointments = selectedDate
    ? appointments.filter((apt) => {
        const selDate = selectedDate.toLocaleDateString("de-DE");
        return apt.date === selDate;
      })
    : appointments;

  const defaultCenter: [number, number] =
    filteredAppointments.length > 0
      ? [filteredAppointments[0].coordinates[1], filteredAppointments[0].coordinates[0]]
      : [52.520008, 13.404954]; // Berlin as default

  // Create custom icon for markers
  const customIcon = (time: string) =>
    L.divIcon({
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
          ${time}
        </div>
      `,
      iconSize: [60, 30],
      iconAnchor: [30, 15],
    });

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
      <div className="w-full h-[300px] rounded-lg border border-border overflow-hidden">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredAppointments.map((apt) => (
            <Marker
              key={apt.id}
              position={[apt.coordinates[1], apt.coordinates[0]]}
              icon={customIcon(apt.time)}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold mb-1">{apt.time}</div>
                  <div className="text-muted-foreground mb-1">{apt.address}</div>
                  {apt.customer && (
                    <div className="text-muted-foreground">Kunde: {apt.customer}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          <FitBounds appointments={filteredAppointments} />
        </MapContainer>
      </div>
    </div>
  );
};
