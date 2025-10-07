import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { PolygonStatsPopup } from "@/components/PolygonStatsPopup";
import { CreateListModal } from "@/components/CreateListModal";
import { ListsSidebar } from "@/components/ListsSidebar";
import { AIAssistant } from "@/components/AIAssistant";
import { MapFilterSidebar } from "@/components/MapFilterSidebar";
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
import { cn } from "@/lib/utils";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { geocodeAddressesBatch } from "@/utils/geocoding";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Address {
  id: number;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  coordinates: [number, number];
  lastUpdated?: Date;
  units: Array<{
    id: number;
    floor: string;
    position: string;
    status: string;
  }>;
}

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

function KarteContent() {
  const { state: sidebarState } = useSidebar();
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const polygonDrawerRef = useRef<L.Draw.Polygon | null>(null);
  const [selectedAddresses, setSelectedAddresses] = useState<Address[]>([]);
  const [showStatsPopup, setShowStatsPopup] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showListsSidebar, setShowListsSidebar] = useState(false);
  const [assignedAddressIds, setAssignedAddressIds] = useState<Set<number>>(new Set());
  const [addressListColors, setAddressListColors] = useState<Map<number, string>>(new Map());
  const [filterMode, setFilterMode] = useState<'all' | 'unassigned' | 'no-rocket'>('all');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [listAddressIds, setListAddressIds] = useState<Set<number>>(new Set());
  const previousViewRef = useRef<{ center: L.LatLngExpression; zoom: number } | null>(null);
  
  // Map filter states
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [streetFilter, setStreetFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [postalCodeFilter, setPostalCodeFilter] = useState("");
  const [houseNumberFilter, setHouseNumberFilter] = useState("");

  // Get unique values for filter dropdowns
  const uniqueStreets = Array.from(new Set(addresses.map(a => a.street)));
  const uniqueCities = Array.from(new Set(addresses.map(a => a.city)));
  const uniquePostalCodes = Array.from(new Set(addresses.map(a => a.postalCode)));

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
  const createMarkerIcon = (address: Address, zoom: number) => {
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
    
    // Scale marker size based on zoom level - smaller markers
    let size = 24;
    let fontSize = 11;
    
    if (zoom >= 18) {
      size = 18;
      fontSize = 9;
    } else if (zoom >= 16) {
      size = 20;
      fontSize = 10;
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

  // Load addresses and assigned addresses from database
  useEffect(() => {
    loadAddresses();
    loadAssignedAddresses();
  }, []);

  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    const { data, error } = await supabase
      .from('addresses')
      .select('*');

    if (error) {
      console.error('Error loading addresses:', error);
      setIsLoadingAddresses(false);
      return;
    }

    if (!data || data.length === 0) {
      console.log('No addresses found in database');
      setAddresses([]);
      setIsLoadingAddresses(false);
      return;
    }

    // Transform database addresses to Address format
    const loadedAddresses: Address[] = data.map((addr: any) => {
      // Handle both {lat, lng} and [lng, lat] coordinate formats
      let coords: [number, number];
      if (addr.coordinates) {
        if (Array.isArray(addr.coordinates)) {
          coords = addr.coordinates as [number, number];
        } else if (typeof addr.coordinates === 'object') {
          coords = [
            addr.coordinates.lng || addr.coordinates.lon || 0,
            addr.coordinates.lat || 0
          ] as [number, number];
        } else {
          coords = [0, 0];
        }
      } else {
        coords = [0, 0];
      }

      return {
        id: addr.id,
        street: addr.street,
        houseNumber: addr.house_number,
        postalCode: addr.postal_code,
        city: addr.city,
        coordinates: coords,
        units: addr.units || []
      };
    });

    console.log('Loaded addresses:', loadedAddresses);
    setAddresses(loadedAddresses);
    setIsLoadingAddresses(false);
  };

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

  // Initialize map and markers when addresses are loaded
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current || isLoadingAddresses) return;

    // Initialize map centered on Köln-Heumar without attribution
    const map = L.map(mapContainer.current, {
      attributionControl: false
    }).setView([50.9206, 7.0814], 16);
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
      const selectedAddrs = addresses.filter(address => {
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

    // Add markers for each address
    const bounds = L.latLngBounds([]);
    const markers: L.Marker[] = [];

    addresses.forEach((address) => {
      const isAssigned = assignedAddressIds.has(address.id);
      
      // If lists are selected, only show addresses from those lists
      if (selectedListIds.size > 0) {
        if (!listAddressIds.has(address.id)) {
          return; // Skip addresses not in any selected list
        }
      } else {
        // No lists selected - apply normal filters
        if (filterMode === 'unassigned' && isAssigned) return;
        if (filterMode === 'no-rocket') {
          // Show only unassigned addresses or addresses in lists without rocket
          // TODO: Implement rocket filter flag
        }
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

      // Zoom to marker on click
      marker.on('click', () => {
        map.setView([address.coordinates[1], address.coordinates[0]], 18, {
          animate: true,
          duration: 0.5
        });
      });

      bounds.extend([address.coordinates[1], address.coordinates[0]]);
    });

    markersRef.current = markers;

    // Update marker sizes on zoom
    map.on('zoomend', () => {
      const zoom = map.getZoom();
      addresses.forEach((address, index) => {
        const marker = markers[index];
        if (marker) {
          const newIcon = createMarkerIcon(address, zoom);
          marker.setIcon(newIcon);
        }
      });
    });

    // Fit map to show all markers with padding
    if (addresses.length > 0) {
      map.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 15 // Limit initial zoom to avoid being too close
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [addresses, isLoadingAddresses]);

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

  // Load addresses for specific lists (union)
  const loadAddressesForLists = async (listIds: string[]) => {
    if (listIds.length === 0) return new Set<number>();
    const { data, error } = await supabase
      .from('lauflisten_addresses')
      .select('address_id')
      .in('laufliste_id', listIds);

    if (error) {
      console.error('Error loading lists addresses:', error);
      return new Set<number>();
    }

    return new Set(data?.map(item => item.address_id) || []);
  };

  // Handle selection change from sidebar (one or multiple lists)
  const handleListExpanded = async (listIds: string[]) => {
    const map = mapInstance.current;

    // Wenn Listen ausgewählt werden, Filter zurücksetzen
    if (listIds.length > 0) {
      setStatusFilter([]);
      setStreetFilter("");
      setCityFilter("");
      setPostalCodeFilter("");
      setHouseNumberFilter("");
    }

    // Update selected list IDs immediately for filtering
    setSelectedListIds(new Set(listIds));

    if (!map) return;

    if (listIds.length > 0) {
      // Save current view once when entering focus mode
      if (!previousViewRef.current) {
        previousViewRef.current = { center: map.getCenter(), zoom: map.getZoom() };
      }

      // Load all addresses for the selected lists and fit bounds
      const addressIds = await loadAddressesForLists(listIds);
      setListAddressIds(addressIds);

      // Fit bounds to all addresses from selected lists
      const bounds = L.latLngBounds([]);
      addresses.forEach((a) => {
        if (addressIds.has(a.id)) {
          bounds.extend([a.coordinates[1], a.coordinates[0]]);
        }
      });
      
      if (bounds.isValid()) {
        const rightPad = showListsSidebar ? 420 : 50;
        map.fitBounds(bounds, { paddingTopLeft: [50, 50], paddingBottomRight: [rightPad, 50], maxZoom: 15 });
      }
    } else {
      // Clear focus and restore previous view if available
      setListAddressIds(new Set());
      if (previousViewRef.current) {
        const { center, zoom } = previousViewRef.current;
        map.setView(center as L.LatLngExpression, zoom, { animate: true });
        previousViewRef.current = null;
      }
    }
  };


  // Recenter when sidebar visibility changes while lists are selected
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (selectedListIds.size === 0 || listAddressIds.size === 0) return;

    const bounds = L.latLngBounds([]);
    addresses.forEach((a) => {
      if (listAddressIds.has(a.id)) bounds.extend([a.coordinates[1], a.coordinates[0]]);
    });
    if (bounds.isValid()) {
      const rightPad = showListsSidebar ? 420 : 50;
      map.fitBounds(bounds, { paddingTopLeft: [50, 50], paddingBottomRight: [rightPad, 50], maxZoom: 15 });
    }
  }, [showListsSidebar]);

  // Re-render markers when filter changes or list is expanded
  useEffect(() => {
    if (!mapInstance.current) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    const map = mapInstance.current;
    const markers: L.Marker[] = [];
    const bounds = L.latLngBounds([]);
    let visibleAddressCount = 0;
    
    addresses.forEach((address) => {
      const isAssigned = assignedAddressIds.has(address.id);
      
      // Apply status filter
      if (statusFilter.length > 0) {
        const hasMatchingStatus = address.units.some(unit => 
          statusFilter.includes(unit.status)
        );
        if (!hasMatchingStatus) return;
      }
      
      // Apply address filters
      if (streetFilter && !address.street.toLowerCase().includes(streetFilter.toLowerCase())) return;
      if (cityFilter && !address.city.toLowerCase().includes(cityFilter.toLowerCase())) return;
      if (postalCodeFilter && address.postalCode !== postalCodeFilter) return;
      if (houseNumberFilter && address.houseNumber !== houseNumberFilter) return;
      
      // List selection or normal filters
      if (selectedListIds.size > 0) {
        if (!listAddressIds.has(address.id)) {
          return; // Skip addresses not in any selected list
        }
      } else {
        // No filters active - apply normal filters
        if (filterMode === 'unassigned' && isAssigned) return;
        if (filterMode === 'no-rocket') {
          // Show only unassigned addresses or addresses in lists without rocket
          if (isAssigned) return;
        }
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
      
      // Create marker icon with the determined color - smaller markers without border
      const size = 24;
      const fontSize = 11;
      
      const customIcon = L.divIcon({
        className: "custom-address-marker",
        html: `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            color: white;
            border-radius: 50%;
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
      bounds.extend([address.coordinates[1], address.coordinates[0]]);
      visibleAddressCount++;

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

      // Zoom to marker on click
      marker.on('click', () => {
        map.setView([address.coordinates[1], address.coordinates[0]], 18, {
          animate: true,
          duration: 0.5
        });
      });
    });
    
    markersRef.current = markers;
  }, [filterMode, assignedAddressIds, addressListColors, addresses, selectedListIds, listAddressIds, statusFilter, streetFilter, cityFilter, postalCodeFilter, houseNumberFilter]);

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
    <>
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
              {isLoadingAddresses ? (
                <div className="h-full w-full flex items-center justify-center bg-muted/30">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Laden...</p>
                  </div>
                </div>
              ) : (
                <div className="h-full w-full" ref={mapContainer} style={{ cursor: isDrawingMode ? 'crosshair' : undefined }} />
              )}
              
              {/* Map Controls - Right Side */}
              {!isLoadingAddresses && (
                <div 
                  className={cn(
                    "absolute top-4 z-[1000] flex flex-col gap-0.5 transition-all duration-300",
                    showListsSidebar ? "right-[400px]" : "right-4"
                  )}
                >
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
                    <DropdownMenuItem onClick={() => {
                      setFilterMode('all');
                      // Listen-Auswahl zurücksetzen wenn Adressfilter geändert wird
                      if (selectedListIds.size > 0) {
                        setSelectedListIds(new Set());
                        setListAddressIds(new Set());
                        handleListExpanded([]);
                      }
                    }}>
                      <div className="flex items-center gap-2 w-full">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: filterMode === 'all' ? 'hsl(var(--primary))' : 'transparent' }} />
                        <span className={filterMode === 'all' ? 'font-medium' : ''}>Alle Adressen</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setFilterMode('unassigned');
                      // Listen-Auswahl zurücksetzen wenn Adressfilter geändert wird
                      if (selectedListIds.size > 0) {
                        setSelectedListIds(new Set());
                        setListAddressIds(new Set());
                        handleListExpanded([]);
                      }
                    }}>
                      <div className="flex items-center gap-2 w-full">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: filterMode === 'unassigned' ? 'hsl(var(--primary))' : 'transparent' }} />
                        <span className={filterMode === 'unassigned' ? 'font-medium' : ''}>Ohne Laufliste</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setFilterMode('no-rocket');
                      // Listen-Auswahl zurücksetzen wenn Adressfilter geändert wird
                      if (selectedListIds.size > 0) {
                        setSelectedListIds(new Set());
                        setListAddressIds(new Set());
                        handleListExpanded([]);
                      }
                    }}>
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
                  className="shadow-lg bg-white hover:bg-white/90 border-border relative"
                  size="icon"
                  title="Filter"
                  onClick={() => setShowFilterSidebar(true)}
                >
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  {(() => {
                    const activeFilterCount = 
                      statusFilter.length + 
                      (streetFilter ? 1 : 0) + 
                      (cityFilter ? 1 : 0) + 
                      (postalCodeFilter ? 1 : 0) + 
                      (houseNumberFilter && houseNumberFilter !== "alle" ? 1 : 0);
                    return activeFilterCount > 0 ? (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">
                        {activeFilterCount}
                      </span>
                    ) : null;
                  })()}
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
              )}
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
            loadAddresses(); // Reload addresses to update filter
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
          onListExpanded={handleListExpanded}
        />

        {/* Filter Sidebar */}
        <MapFilterSidebar
          open={showFilterSidebar}
          onClose={() => setShowFilterSidebar(false)}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          streetFilter={streetFilter}
          setStreetFilter={setStreetFilter}
          cityFilter={cityFilter}
          setCityFilter={setCityFilter}
          postalCodeFilter={postalCodeFilter}
          setPostalCodeFilter={setPostalCodeFilter}
          houseNumberFilter={houseNumberFilter}
          setHouseNumberFilter={setHouseNumberFilter}
          uniqueStreets={uniqueStreets}
          uniqueCities={uniqueCities}
          uniquePostalCodes={uniquePostalCodes}
          addresses={addresses}
        />
      </div>

      {/* AI Assistant */}
      <AIAssistant
        open={showAIAssistant}
        onClose={() => setShowAIAssistant(!showAIAssistant)}
        showListsSidebar={showListsSidebar}
        onSetFilter={(filters) => {
          if (filters.status) setStatusFilter(filters.status);
          if (filters.street) {
            setStreetFilter(filters.street);
          }
          if (filters.city) setCityFilter(filters.city);
          if (filters.postalCode) setPostalCodeFilter(filters.postalCode);
          if (filters.houseNumber) setHouseNumberFilter(filters.houseNumber);
          // NICHT automatisch Filter-Sidebar öffnen
        }}
        onClearFilters={() => {
          setStatusFilter([]);
          setStreetFilter("");
          setCityFilter("");
          setPostalCodeFilter("");
          setHouseNumberFilter("");
        }}
        onTogglePolygon={(enabled) => {
          if (enabled !== isDrawingMode) {
            toggleDrawingMode();
          }
        }}
        onNavigate={(page) => {
          if (page === "laufliste") navigate("/");
          else if (page === "dashboard") navigate("/dashboard");
        }}
      />
    </>
  );
}

export default function Karte() {
  return (
    <SidebarProvider>
      <KarteContent />
    </SidebarProvider>
  );
}
