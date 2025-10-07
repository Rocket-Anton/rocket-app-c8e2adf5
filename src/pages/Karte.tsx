import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { PolygonStatsPopup } from "@/components/PolygonStatsPopup";
import { CreateListModal } from "@/components/CreateListModal";
import { ListsSidebar } from "@/components/ListsSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Pentagon, Filter, Layers, Maximize2, ClipboardList, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Mock addresses - same as in LauflistenContent
const mockAddresses = [
  { 
    id: 1, 
    street: "Am Alten Turm", 
    houseNumber: "1", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0810, 50.9206] as [number, number],
    lastUpdated: new Date('2025-10-05'),
    units: [
      { id: 1, floor: "EG", position: "Links", status: "offen" },
      { id: 2, floor: "1. OG", position: "Links", status: "potenzial" },
    ]
  },
  { 
    id: 2, 
    street: "Am Alten Turm", 
    houseNumber: "2", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0812, 50.9206] as [number, number],
    lastUpdated: new Date('2025-09-28'),
    units: [
      { id: 1, floor: "EG", position: "Rechts", status: "bestandskunde" },
      { id: 2, floor: "1. OG", position: "Rechts", status: "termin" },
    ]
  },
  { 
    id: 3, 
    street: "Am Alten Turm", 
    houseNumber: "4", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0814, 50.9207] as [number, number],
    lastUpdated: new Date('2025-10-01'),
    units: [
      { id: 1, floor: "EG", position: "Links", status: "kein-interesse" },
      { id: 2, floor: "1. OG", position: "Links", status: "nicht-angetroffen" },
    ]
  },
  { 
    id: 4, 
    street: "Am Alten Turm", 
    houseNumber: "5", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0815, 50.9207] as [number, number],
    lastUpdated: new Date('2025-09-15'),
    units: [
      { id: 1, floor: "EG", position: "Mitte", status: "offen" },
    ]
  },
  { 
    id: 5, 
    street: "Am Alten Turm", 
    houseNumber: "7", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0816, 50.9207] as [number, number],
    lastUpdated: new Date('2025-10-03'),
    units: [
      { id: 1, floor: "EG", position: "Links", status: "potenzial" },
      { id: 2, floor: "1. OG", position: "Links", status: "potenzial" },
      { id: 3, floor: "2. OG", position: "Links", status: "offen" },
    ]
  },
  { 
    id: 6, 
    street: "Am Alten Turm", 
    houseNumber: "9", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0817, 50.9207] as [number, number],
    lastUpdated: new Date('2025-09-20'),
    units: [
      { id: 1, floor: "EG", position: "Rechts", status: "gewerbe" },
    ]
  },
  { 
    id: 7, 
    street: "Am Alten Turm", 
    houseNumber: "11", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0819, 50.9207] as [number, number],
    lastUpdated: new Date('2025-10-06'),
    units: [
      { id: 1, floor: "EG", position: "Links", status: "termin" },
      { id: 2, floor: "1. OG", position: "Links", status: "neukunde" },
    ]
  },
];

const statusColorMap: Record<string, string> = {
  "offen": "#6b7280",
  "nicht-angetroffen": "#eab308",
  "karte-eingeworfen": "#f59e0b",
  "potenzial": "#22c55e",
  "neukunde": "#3b82f6",
  "bestandskunde": "#10b981",
  "kein-interesse": "#ef4444",
  "termin": "#a855f7",
  "nicht-vorhanden": "#9ca3af",
  "gewerbe": "#f97316"
};

export default function Karte() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const polygonDrawerRef = useRef<L.Draw.Polygon | null>(null);
  const [selectedAddresses, setSelectedAddresses] = useState<typeof mockAddresses>([]);
  const [showStatsPopup, setShowStatsPopup] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showListsSidebar, setShowListsSidebar] = useState(false);
  const [assignedAddressIds, setAssignedAddressIds] = useState<Set<number>>(new Set());
  const [addressListColors, setAddressListColors] = useState<Map<number, string>>(new Map());
  const [filterMode, setFilterMode] = useState<'all' | 'unassigned' | 'no-rocket'>('all');

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Function to create marker icon based on zoom level
  const createMarkerIcon = (address: typeof mockAddresses[0], zoom: number) => {
    // Calculate overall status based on units
    const statusCounts: Record<string, number> = {};
    address.units.forEach(unit => {
      statusCounts[unit.status] = (statusCounts[unit.status] || 0) + 1;
    });

    // Determine primary status (most common)
    let primaryStatus = "offen";
    let maxCount = 0;
    Object.entries(statusCounts).forEach(([status, count]) => {
      if (count > maxCount) {
        maxCount = count;
        primaryStatus = status;
      }
    });

    const color = statusColorMap[primaryStatus] || "#6b7280";
    
    // Scale marker size based on zoom level - smaller when zoomed in
    let size = 32;
    let fontSize = 14;
    let borderWidth = 3;
    
    if (zoom >= 18) {
      size = 24;
      fontSize = 11;
      borderWidth = 2;
    } else if (zoom >= 16) {
      size = 28;
      fontSize = 12;
      borderWidth = 2;
    }

    return L.divIcon({
      className: "custom-address-marker",
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          color: white;
          border-radius: 50%;
          border: ${borderWidth}px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${fontSize}px;
          font-weight: 700;
        ">
          ${address.units.length}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  // Load assigned addresses from database
  useEffect(() => {
    loadAssignedAddresses();
  }, []);

  const loadAssignedAddresses = async () => {
    const { data, error } = await supabase
      .from('lauflisten_addresses')
      .select('address_id, laufliste_id, lauflisten!inner(color, assigned_to)');

    if (error) {
      console.error('Error loading assigned addresses:', error);
      return;
    }

    console.log('Loaded assigned addresses with colors:', data);

    const ids = new Set(data?.map(item => item.address_id) || []);
    const colorMap = new Map<number, string>();
    
    data?.forEach(item => {
      // The join returns a single object, not an array
      if (item.lauflisten) {
        const list = item.lauflisten as any;
        colorMap.set(item.address_id, list.color);
        console.log(`Address ${item.address_id} -> Color ${list.color}`);
      }
    });
    
    console.log('Color map:', colorMap);
    setAssignedAddressIds(ids);
    setAddressListColors(colorMap);
  };

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Initialize map centered on Köln-Heumar
    const map = L.map(mapContainer.current).setView([50.9206, 7.0814], 16);
    mapInstance.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '',
    }).addTo(map);

    // Initialize drawn items layer
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    // Set German language for Leaflet Draw
    (L.drawLocal as any).draw.handlers.polygon.tooltip.start = 'Klicken, um mit dem Zeichnen zu beginnen.';
    (L.drawLocal as any).draw.handlers.polygon.tooltip.cont = 'Klicken, um das Zeichnen fortzusetzen.';
    (L.drawLocal as any).draw.handlers.polygon.tooltip.end = 'Klicken Sie auf den ersten Punkt, um das Polygon zu schließen.';

    // Initialize polygon drawer with proper options
    const polygonDrawer = new L.Draw.Polygon(map, {
      allowIntersection: false,
      shapeOptions: {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
        weight: 3,
        opacity: 0.8,
      },
      showArea: false,
      metric: true,
      repeatMode: false,
    });
    polygonDrawerRef.current = polygonDrawer;

    // Handle polygon drawing complete
    map.on(L.Draw.Event.CREATED, (event: any) => {
      const layer = event.layer;
      drawnItems.addLayer(layer);
      
      // Check which addresses are inside the polygon
      const polygon = layer.getLatLngs()[0];
      const selectedAddrs = mockAddresses.filter(address => {
        const point = L.latLng(address.coordinates[1], address.coordinates[0]);
        return isPointInPolygon(point, polygon);
      });
      
      setSelectedAddresses(selectedAddrs);
      setShowStatsPopup(true);
      
      // Disable drawing mode after polygon is created
      polygonDrawerRef.current?.disable();
      setIsDrawingMode(false);
      
      toast.success(`${selectedAddrs.length} Adressen ausgewählt`);
    });

    // Add markers for each address (excluding assigned ones)
    const bounds = L.latLngBounds([]);
    const markers: L.Marker[] = [];

    mockAddresses.forEach((address) => {
      // Apply filter logic
      const isAssigned = assignedAddressIds.has(address.id);
      
      if (filterMode === 'unassigned' && isAssigned) return;
      if (filterMode === 'no-rocket') {
        // Show only unassigned addresses or addresses in lists without rocket
        // For now, we'll need to load this info separately
        // TODO: Implement rocket filter
      }
      
      // Use list color if assigned, otherwise always gray for unassigned
      let color: string;
      if (isAssigned && addressListColors.has(address.id)) {
        color = addressListColors.get(address.id)!;
      } else {
        // Unassigned addresses are always gray
        color = "#9ca3af";
      }
      
      const currentZoom = map.getZoom();
      const customIcon = createMarkerIcon(address, currentZoom);

      const marker = L.marker([address.coordinates[1], address.coordinates[0]], { 
        icon: customIcon 
      }).addTo(map);
      
      markers.push(marker);

      // Create popup content
      const unitsInfo = address.units.map(unit => 
        `<div style="font-size: 11px; color: #666; padding: 2px 0;">${unit.floor} ${unit.position}</div>`
      ).join('');

      marker.bindPopup(`
        <div style="padding: 8px; font-size: 12px; min-width: 150px;">
          <div style="font-weight: 600; margin-bottom: 6px; color: ${color};">${address.street} ${address.houseNumber}</div>
          <div style="color: #666; margin-bottom: 6px;">${address.postalCode} ${address.city}</div>
          <div style="border-top: 1px solid #e5e7eb; margin-top: 6px; padding-top: 6px;">
            <div style="font-weight: 500; font-size: 11px; margin-bottom: 4px; color: #374151;">Wohneinheiten (${address.units.length}):</div>
            ${unitsInfo}
          </div>
        </div>
      `);

      bounds.extend([address.coordinates[1], address.coordinates[0]]);
    });

    markersRef.current = markers;

    // Update marker sizes on zoom
    map.on('zoomend', () => {
      const zoom = map.getZoom();
      mockAddresses.forEach((address, index) => {
        const marker = markers[index];
        if (marker) {
          const newIcon = createMarkerIcon(address, zoom);
          marker.setIcon(newIcon);
        }
      });
    });

    // Fit map to show all markers
    if (mockAddresses.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Toggle drawing mode
  const toggleDrawingMode = () => {
    if (!polygonDrawerRef.current || !mapInstance.current) return;
    
    if (isDrawingMode) {
      // Disable drawing mode
      polygonDrawerRef.current.disable();
      setIsDrawingMode(false);
    } else {
      // Enable drawing mode - this will allow clicking on the map to draw
      polygonDrawerRef.current.enable();
      setIsDrawingMode(true);
      
      // Force map to recalculate size to prevent white screen
      setTimeout(() => {
        mapInstance.current?.invalidateSize();
      }, 100);
    }
  };

  // Handle ESC key to cancel drawing mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawingMode) {
        toggleDrawingMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingMode]);

  // Re-render markers when filter changes
  useEffect(() => {
    if (!mapInstance.current) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    const map = mapInstance.current;
    const markers: L.Marker[] = [];
    
    mockAddresses.forEach((address) => {
      // Apply filter logic
      const isAssigned = assignedAddressIds.has(address.id);
      
      if (filterMode === 'unassigned' && isAssigned) return;
      if (filterMode === 'no-rocket') {
        // Show only unassigned addresses or addresses in lists without rocket
        // For now, show unassigned for simplicity
        if (isAssigned) return;
      }
      
      // Use list color if assigned, otherwise always gray for unassigned
      let color: string;
      if (isAssigned && addressListColors.has(address.id)) {
        color = addressListColors.get(address.id)!;
      } else {
        // Unassigned addresses are always gray
        color = "#9ca3af";
      }
      
      const currentZoom = map.getZoom();
      
      // Create marker icon with the determined color
      const size = 32;
      const fontSize = 14;
      const borderWidth = 3;
      
      const customIcon = L.divIcon({
        className: "custom-address-marker",
        html: `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            color: white;
            border-radius: 50%;
            border: ${borderWidth}px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${fontSize}px;
            font-weight: 700;
          ">
            ${address.units.length}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([address.coordinates[1], address.coordinates[0]], { 
        icon: customIcon 
      }).addTo(map);
      
      markers.push(marker);

      // Create popup content
      const unitsInfo = address.units.map(unit => 
        `<div style="font-size: 11px; color: #666; padding: 2px 0;">${unit.floor} ${unit.position}</div>`
      ).join('');

      marker.bindPopup(`
        <div style="padding: 8px; font-size: 12px; min-width: 150px;">
          <div style="font-weight: 600; margin-bottom: 6px; color: ${color};">${address.street} ${address.houseNumber}</div>
          <div style="color: #666; margin-bottom: 6px;">${address.postalCode} ${address.city}</div>
          <div style="border-top: 1px solid #e5e7eb; margin-top: 6px; padding-top: 6px;">
            <div style="font-weight: 500; font-size: 11px; margin-bottom: 4px; color: #374151;">Wohneinheiten (${address.units.length}):</div>
            ${unitsInfo}
          </div>
        </div>
      `);
    });
    
    markersRef.current = markers;
  }, [filterMode, assignedAddressIds, addressListColors]);

  // Helper function to check if a point is inside a polygon
  const isPointInPolygon = (point: L.LatLng, polygon: L.LatLng[]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;
      
      const intersect = ((yi > point.lng) !== (yj > point.lng))
        && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset className="p-0 m-0 border-0">
          <div className="flex flex-col h-full w-full">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 sm:py-4 border-b border-border bg-background">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Karte</h1>
              </div>
            </header>

            {/* Map Container */}
            <div className="flex-1 overflow-hidden relative z-0">
              <div className="h-full w-full" ref={mapContainer} style={{ cursor: isDrawingMode ? 'crosshair' : undefined }} />
              
              {/* Map Controls - Right Side */}
              <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-0.5">
                <Button
                  onClick={() => setShowListsSidebar(true)}
                  variant="outline"
                  className="shadow-lg bg-white hover:bg-white/90 border-border focus-visible:ring-0 focus-visible:ring-offset-0"
                  size="icon"
                  title="Lauflisten anzeigen"
                >
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={filterMode !== 'all' ? "default" : "outline"}
                      className={`shadow-lg border-border focus-visible:ring-0 focus-visible:ring-offset-0 ${filterMode !== 'all' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-white hover:bg-white/90'}`}
                      size="icon"
                      title="Adressfilter"
                    >
                      <MapPin className={`h-4 w-4 ${filterMode !== 'all' ? '' : 'text-muted-foreground'}`} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 z-[1001] bg-background">
                    <DropdownMenuLabel>Adressen anzeigen</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setFilterMode('all')}>
                      <div className="flex items-center gap-2 w-full">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: filterMode === 'all' ? 'hsl(var(--primary))' : 'transparent' }} />
                        <span className={filterMode === 'all' ? 'font-medium' : ''}>Alle Adressen</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterMode('unassigned')}>
                      <div className="flex items-center gap-2 w-full">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: filterMode === 'unassigned' ? 'hsl(var(--primary))' : 'transparent' }} />
                        <span className={filterMode === 'unassigned' ? 'font-medium' : ''}>Ohne Laufliste</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterMode('no-rocket')}>
                      <div className="flex items-center gap-2 w-full">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: filterMode === 'no-rocket' ? 'hsl(var(--primary))' : 'transparent' }} />
                        <span className={filterMode === 'no-rocket' ? 'font-medium' : ''}>Ohne Rakete</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button
                  variant={isDrawingMode ? "default" : "outline"}
                  className={`shadow-lg border-border ${isDrawingMode ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-white hover:bg-white/90'}`}
                  size="icon"
                  title="Polygon zeichnen"
                  onClick={toggleDrawingMode}
                >
                  <Pentagon className={`h-4 w-4 ${isDrawingMode ? '' : 'text-muted-foreground'}`} />
                </Button>
                
                <Button
                  variant="outline"
                  className="shadow-lg bg-white hover:bg-white/90 border-border"
                  size="icon"
                  title="Filter"
                >
                  <Filter className="h-4 w-4 text-muted-foreground" />
                </Button>
                
                <Button
                  variant="outline"
                  className="shadow-lg bg-white hover:bg-white/90 border-border"
                  size="icon"
                  title="Ebenen"
                >
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </Button>
                
                <Button
                  variant="outline"
                  className="shadow-lg bg-white hover:bg-white/90 border-border"
                  size="icon"
                  title="Vollbild"
                >
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>
        </SidebarInset>

        {/* Polygon Stats Popup */}
        {showStatsPopup && selectedAddresses.length > 0 && (
          <PolygonStatsPopup
            addresses={selectedAddresses}
            onClose={() => {
              setShowStatsPopup(false);
              setSelectedAddresses([]);
              // Remove all drawn polygons
              if (drawnItemsRef.current) {
                drawnItemsRef.current.clearLayers();
              }
            }}
            onCreateList={() => {
              setShowStatsPopup(false);
              setShowCreateListModal(true);
            }}
            onAddToExisting={() => {
              toast.success("Zu bestehender Laufliste hinzufügen...");
              // TODO: Implement add to existing list functionality
            }}
          />
        )}

        {/* Create List Modal */}
        <CreateListModal
          open={showCreateListModal}
          onClose={() => {
            setShowCreateListModal(false);
            setShowStatsPopup(true);
          }}
          addresses={selectedAddresses}
          onSuccess={() => {
            setShowCreateListModal(false);
            loadAssignedAddresses();
            setSelectedAddresses([]);
            // Remove drawn polygon
            if (drawnItemsRef.current) {
              drawnItemsRef.current.clearLayers();
            }
            // Open lists sidebar to show the newly created list
            setShowListsSidebar(true);
          }}
        />

        {/* Lists Sidebar */}
        <ListsSidebar
          open={showListsSidebar}
          onClose={() => setShowListsSidebar(false)}
        />
      </div>
    </SidebarProvider>
  );
}
