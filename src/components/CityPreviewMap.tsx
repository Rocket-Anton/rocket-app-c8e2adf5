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
    const zoom = center ? 13 : 5;
    const pitch = center ? 45 : 0; // 3D tilt only when zoomed in

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultCenter,
      zoom: zoom,
      pitch: pitch,
      bearing: 0,
      antialias: true,
      attributionControl: false
    });

    map.addControl(new mapboxgl.NavigationControl());

    // Add 3D buildings when zoomed in
    if (center) {
      map.on('style.load', () => {
        const layers = map.getStyle().layers;
        const labelLayerId = layers.find(
          (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
        )?.id;

        map.addLayer(
          {
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.6
            }
          },
          labelLayerId
        );
      });
    }

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