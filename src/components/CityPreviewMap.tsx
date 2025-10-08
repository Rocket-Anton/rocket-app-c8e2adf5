import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface CityPreviewMapProps {
  center: { lat: number; lng: number } | null;
}

export const CityPreviewMap = ({ center }: CityPreviewMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const instance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (instance.current) {
      instance.current.remove();
      instance.current = null;
    }

    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
    instance.current = map;

    const defaultCenter: [number, number] = center ? [center.lat, center.lng] : [51.1657, 10.4515]; // Germany
    const zoom = center ? 11 : 5;

    map.setView(defaultCenter, zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '',
    }).addTo(map);

    if (center) {
      L.marker([center.lat, center.lng]).addTo(map);
    }

    return () => {
      if (instance.current) {
        instance.current.remove();
        instance.current = null;
      }
    };
  }, [center]);

  return <div ref={mapRef} className="w-full h-40 rounded-md border" />;
};
export default CityPreviewMap;
