import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface CityPreviewMapProps {
  center: { lat: number; lng: number } | null;
}

// Mapbox access token from environment/secrets
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTViZWNpeXYwOGdjMnFzNnd6M2N1bWRhIn0.placeholder";

export const CityPreviewMap = ({ center }: CityPreviewMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const instance = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (instance.current) {
      instance.current.remove();
      instance.current = null;
    }

    const defaultCenter: [number, number] = center ? [center.lng, center.lat] : [10.4515, 51.1657]; // Germany
    const zoom = center ? 11 : 5;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultCenter,
      zoom: zoom,
      attributionControl: false
    });

    map.addControl(new mapboxgl.NavigationControl());

    if (center) {
      const marker = new mapboxgl.Marker()
        .setLngLat([center.lng, center.lat])
        .addTo(map);
      markerRef.current = marker;
    }

    instance.current = map;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (instance.current) {
        instance.current.remove();
        instance.current = null;
      }
    };
  }, [center]);

  return <div ref={mapRef} className="w-full h-40 rounded-md border" />;
};

export default CityPreviewMap;