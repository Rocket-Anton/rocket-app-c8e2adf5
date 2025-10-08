import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN } from "@/config/mapbox";

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
  selectedAppointmentId?: number | null;
}

// Set Mapbox access token
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

export const AppointmentMap = ({ appointments, selectedDate, currentAddress, selectedAppointmentId }: AppointmentMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const lastViewRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const originalViewRef = useRef<{ center: [number, number]; zoom: number } | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Filter appointments based on selection
    let filteredAppointments = appointments;
    
    // If an appointment is selected, only show that one
    if (selectedAppointmentId) {
      filteredAppointments = appointments.filter(apt => apt.id === selectedAppointmentId);
    } else if (selectedDate) {
      // Otherwise filter by date
      filteredAppointments = appointments.filter((apt) => {
        const selDate = selectedDate.toLocaleDateString("de-DE");
        return apt.date === selDate;
      });
    }

    // Save current view if map exists
    if (mapInstance.current) {
      const center = mapInstance.current.getCenter();
      const zoom = mapInstance.current.getZoom();
      lastViewRef.current = {
        center: [center.lat, center.lng],
        zoom: zoom
      };
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Determine center and zoom
    let defaultCenter: [number, number];
    let defaultZoom: number;
    
    if (filteredAppointments.length > 0) {
      defaultCenter = [filteredAppointments[0].coordinates[0], filteredAppointments[0].coordinates[1]];
      defaultZoom = 15;
    } else if (lastViewRef.current) {
      // Keep last view if no appointments
      defaultCenter = [lastViewRef.current.center[1], lastViewRef.current.center[0]];
      defaultZoom = lastViewRef.current.zoom;
    } else if (currentAddress) {
      // Center on current address if no appointments and no saved view
      defaultCenter = [currentAddress.coordinates[0], currentAddress.coordinates[1]];
      defaultZoom = 15;
    } else {
      // Default to Lindenau
      defaultCenter = [10.0310, 47.5580];
      defaultZoom = 15;
    }

    // Initialize map
    if (!mapInstance.current) {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: defaultCenter,
        zoom: defaultZoom,
        pitch: 60, // 3D perspective
        bearing: 0,
        antialias: true
      });

      map.addControl(new mapboxgl.NavigationControl());

      // Add 3D buildings and terrain when style loads
      map.on('style.load', () => {
        // Add 3D terrain
        map.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
        map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

        // Add 3D buildings layer
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
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          },
          labelLayerId
        );
      });

      mapInstance.current = map;
    } else {
      mapInstance.current.setCenter(defaultCenter);
      mapInstance.current.setZoom(defaultZoom);
    }

    const map = mapInstance.current;

    // Add green marker for current address
    if (currentAddress) {
      const greenMarkerEl = document.createElement('div');
      greenMarkerEl.style.width = '20px';
      greenMarkerEl.style.height = '20px';
      greenMarkerEl.style.background = '#22c55e';
      greenMarkerEl.style.borderRadius = '50%';
      greenMarkerEl.style.border = '3px solid white';
      greenMarkerEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

      const currentMarker = new mapboxgl.Marker({ element: greenMarkerEl })
        .setLngLat([currentAddress.coordinates[0], currentAddress.coordinates[1]])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div style="padding: 4px; font-size: 12px;">
            <div style="font-weight: 600; margin-bottom: 4px; color: #22c55e;">Aktuelle Adresse</div>
            <div style="color: #666;">${currentAddress.street} ${currentAddress.houseNumber}</div>
            <div style="color: #666;">${currentAddress.postalCode} ${currentAddress.city}</div>
          </div>
        `))
        .addTo(map);
      
      markersRef.current.push(currentMarker);
    }

    // Add markers for each appointment
    const bounds = new mapboxgl.LngLatBounds();
    
    // Add current address to bounds if it exists
    if (currentAddress) {
      bounds.extend([currentAddress.coordinates[0], currentAddress.coordinates[1]]);
    }
    
    filteredAppointments.forEach((apt) => {
      const markerEl = document.createElement('div');
      markerEl.innerHTML = `
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
      `;

      const marker = new mapboxgl.Marker({ element: markerEl, anchor: 'bottom' })
        .setLngLat([apt.coordinates[0], apt.coordinates[1]])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div style="padding: 4px; font-size: 12px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${apt.time}</div>
            <div style="color: #666; margin-bottom: 4px;">${apt.address}</div>
            ${apt.customer ? `<div style="color: #666;">Kunde: ${apt.customer}</div>` : ""}
          </div>
        `))
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([apt.coordinates[0], apt.coordinates[1]]);
    });

    // Handle selected appointment
    if (selectedAppointmentId) {
      const selectedApt = appointments.find(apt => apt.id === selectedAppointmentId);
      if (selectedApt && currentAddress) {
        // Save original view if not already saved
        if (!originalViewRef.current && lastViewRef.current) {
          originalViewRef.current = lastViewRef.current;
        }
        
        // Create bounds that include both the selected appointment and current address
        const aptBounds = new mapboxgl.LngLatBounds();
        aptBounds.extend([selectedApt.coordinates[0], selectedApt.coordinates[1]]);
        aptBounds.extend([currentAddress.coordinates[0], currentAddress.coordinates[1]]);
        
        map.fitBounds(aptBounds, { padding: 80 });
        
        // Save new view
        const center = map.getCenter();
        lastViewRef.current = {
          center: [center.lat, center.lng],
          zoom: map.getZoom()
        };
      }
    } else {
      // No appointment selected - restore original view if available
      if (originalViewRef.current) {
        map.setCenter([originalViewRef.current.center[1], originalViewRef.current.center[0]]);
        map.setZoom(originalViewRef.current.zoom);
        lastViewRef.current = originalViewRef.current;
        originalViewRef.current = null;
      } else {
        // Fit bounds to show all markers (only if there are appointments)
        if (filteredAppointments.length > 1) {
          map.fitBounds(bounds, { padding: 50 });
          // Save new view
          const center = map.getCenter();
          lastViewRef.current = {
            center: [center.lat, center.lng],
            zoom: map.getZoom()
          };
        } else if (filteredAppointments.length === 1) {
          map.setCenter([filteredAppointments[0].coordinates[0], filteredAppointments[0].coordinates[1]]);
          map.setZoom(15);
          // Save new view
          lastViewRef.current = {
            center: [filteredAppointments[0].coordinates[1], filteredAppointments[0].coordinates[0]],
            zoom: 15
          };
        } else if (filteredAppointments.length === 0 && currentAddress) {
          // No appointments - center on current address
          map.setCenter([currentAddress.coordinates[0], currentAddress.coordinates[1]]);
          map.setZoom(16);
          // Save new view
          lastViewRef.current = {
            center: [currentAddress.coordinates[1], currentAddress.coordinates[0]],
            zoom: 16
          };
        }
      }
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [appointments, selectedDate, currentAddress, selectedAppointmentId]);

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-[300px] rounded-lg border border-border overflow-hidden" ref={mapContainer} />
  );
};
