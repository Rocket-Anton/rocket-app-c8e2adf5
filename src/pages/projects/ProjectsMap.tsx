import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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

  useEffect(() => {
    loadProjects();
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

  const createCustomIcon = (color: string) => {
    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          background-color: ${color};
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
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  // Default center of Germany
  const defaultCenter: [number, number] = [51.1657, 10.4515];

  // Calculate center based on projects
  const mapCenter: [number, number] = projects.length > 0 && projects[0].coordinates
    ? [projects[0].coordinates.lat, projects[0].coordinates.lng]
    : defaultCenter;

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
                <MapContainer
                  center={mapCenter}
                  zoom={6}
                  style={{ height: "100%", width: "100%" }}
                  className="z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {projects.map((project) => {
                    if (!project.coordinates) return null;

                    const providerColor = project.providers?.color || "#3b82f6";

                    return (
                      <Marker
                        key={project.id}
                        position={[project.coordinates.lat, project.coordinates.lng]}
                        icon={createCustomIcon(providerColor)}
                      >
                        <Popup>
                          <div className="min-w-[200px]">
                            <h3 className="font-semibold text-base mb-2">{project.name}</h3>
                            {project.providers && (
                              <p className="text-sm mb-1">
                                <span className="font-medium">Provider:</span> {project.providers.name}
                              </p>
                            )}
                            {project.city && (
                              <p className="text-sm mb-1">
                                <span className="font-medium">Ort:</span> {project.postal_code} {project.city}
                              </p>
                            )}
                            <div className="mt-2">
                              <Badge className={`${getStatusColor(project.status)} text-white`}>
                                {project.status}
                              </Badge>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ProjectsMapContent;
