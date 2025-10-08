import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Mapbox access token from environment/secrets
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTViZWNpeXYwOGdjMnFzNnd6M2N1bWRhIn0.placeholder";

interface Project {
  id: string;
  name: string;
  city: string | null;
  postal_code: string | null;
  status: string;
  coordinates: { lat: number; lng: number } | null;
  provider_id: string | null;
  providers?: {
    name: string;
    color: string;
  };
}

const ProjectsMapContent = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || loading) return;

    // Initialize map
    if (!map.current) {
      const defaultCenter: [number, number] = projects.length > 0 && projects[0].coordinates
        ? [projects[0].coordinates.lng, projects[0].coordinates.lat]
        : [10.4515, 51.1657]; // Germany

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: defaultCenter,
        zoom: 6
      });

      map.current.addControl(new mapboxgl.NavigationControl());
    }

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add markers for each project
    projects.forEach((project) => {
      if (!project.coordinates) return;

      const providerColor = project.providers?.color || "#3b82f6";

      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.style.width = '32px';
      markerEl.style.height = '32px';
      markerEl.innerHTML = `
        <div style="
          background-color: ${providerColor};
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          border: 3px solid white;
          transform: rotate(-45deg);
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        ">
          <div style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(45deg);
          ">
            <span style="color: white; font-size: 14px; font-weight: bold;">P</span>
          </div>
        </div>
      `;

      const getStatusColor = (status: string) => {
        switch (status) {
          case "In Planung":
            return "bg-yellow-500";
          case "Aktiv":
            return "bg-green-500";
          case "Abgeschlossen":
            return "bg-blue-500";
          case "Pausiert":
            return "bg-gray-500";
          default:
            return "bg-gray-400";
        }
      };

      const marker = new mapboxgl.Marker({ element: markerEl, anchor: 'bottom' })
        .setLngLat([project.coordinates.lng, project.coordinates.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div style="min-width: 200px; padding: 8px;">
            <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">${project.name}</h3>
            ${project.providers ? `
              <p style="font-size: 14px; margin-bottom: 4px;">
                <span style="font-weight: 500;">Provider:</span> ${project.providers.name}
              </p>
            ` : ''}
            ${project.city ? `
              <p style="font-size: 14px; margin-bottom: 4px;">
                <span style="font-weight: 500;">Ort:</span> ${project.postal_code} ${project.city}
              </p>
            ` : ''}
            <div style="margin-top: 8px;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; ${getStatusColor(project.status)} color: white;">
                ${project.status}
              </span>
            </div>
          </div>
        `))
        .addTo(map.current!);

      markers.current.push(marker);
    });

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
    };
  }, [projects, loading]);

  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, city, postal_code, status, coordinates, provider_id, providers(name, color)")
        .not("coordinates", "is", null);

      if (error) throw error;

      // Filter and map projects with valid coordinates
      const projectsWithCoords = (data || [])
        .filter(p => p.coordinates && typeof p.coordinates === 'object' && 'lat' in p.coordinates && 'lng' in p.coordinates)
        .map(p => ({
          ...p,
          coordinates: p.coordinates as { lat: number; lng: number }
        }));

      setProjects(projectsWithCoords as Project[]);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Fehler beim Laden der Projekte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset className="flex-1 p-0 m-0 border-0 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="border-b bg-background p-4">
              <h1 className="text-2xl font-bold">Projektkarte</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? "Lade Projekte..." : `${projects.length} Projekte auf der Karte`}
              </p>
            </div>

            <div className="flex-1 relative">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Lade Projekte...</p>
                  </div>
                </div>
              ) : projects.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                      <p className="text-muted-foreground">
                        Keine Projekte mit Koordinaten gefunden. Erstellen Sie ein Projekt mit Postleitzahl und Ort,
                        um es hier auf der Karte zu sehen.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div ref={mapContainer} className="w-full h-full" />
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ProjectsMapContent;