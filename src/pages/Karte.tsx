import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { PolygonStatsPopup } from "@/components/PolygonStatsPopup";
import { CreateListModal } from "@/components/CreateListModal";
import { ListsSidebar } from "@/components/ListsSidebar";
import { AIAssistant } from "@/components/AIAssistant";
import { MapFilterSidebar } from "@/components/MapFilterSidebar";
import { ProjectSelector } from "@/components/ProjectSelector";
import { MobileHeader } from "@/components/MobileHeader";
import { AddressDetailModal } from "@/components/AddressDetailModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Pentagon, Filter, Layers, Maximize2, ClipboardList, MapPin } from "lucide-react";
import mapPreview from "@/assets/map-preview.png";
import satellitePreview from "@/assets/satellite-preview.png";
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
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN } from "@/config/mapbox";
import { geocodeAddressesBatch } from "@/utils/geocoding";

// Removed Leaflet default marker icon configuration (using Mapbox GL)

interface Address {
  id: number;
  projectId: string | null;
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
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const projectMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const drawRef = useRef<MapboxDraw | null>(null);
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
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [shouldZoomToProjects, setShouldZoomToProjects] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const previousViewRef = useRef<{ center: mapboxgl.LngLatLike; zoom: number } | null>(null);
  
  // Map filter states
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [streetFilter, setStreetFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [postalCodeFilter, setPostalCodeFilter] = useState("");
  const [houseNumberFilter, setHouseNumberFilter] = useState("");
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');

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

  // Load addresses and assigned addresses from database
  useEffect(() => {
    loadAddresses();
    loadAssignedAddresses();
  }, []);

  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    
    // Load addresses with their units from the separate units table
    const { data: addressData, error: addressError } = await supabase
      .from('addresses')
      .select('*');

    if (addressError) {
      console.error('Error loading addresses:', addressError);
      setIsLoadingAddresses(false);
      return;
    }

    if (!addressData || addressData.length === 0) {
      console.log('No addresses found in database');
      setAddresses([]);
      setIsLoadingAddresses(false);
      return;
    }

    // Load all units
    const { data: unitsData, error: unitsError } = await supabase
      .from('units')
      .select('*');

    if (unitsError) {
      console.error('Error loading units:', unitsError);
    }

    // Create a map of address_id to units
    const unitsMap = new Map<number, any[]>();
    (unitsData || []).forEach((unit: any) => {
      if (!unitsMap.has(unit.address_id)) {
        unitsMap.set(unit.address_id, []);
      }
      unitsMap.get(unit.address_id)!.push({
        id: unit.id,
        floor: unit.etage || '',
        position: unit.lage || '',
        status: unit.status || 'offen',
      });
    });

    // Transform database addresses to Address format
    const loadedAddresses: Address[] = addressData.map((addr: any) => {
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
        projectId: addr.project_id || null,
        street: addr.street,
        houseNumber: addr.house_number,
        postalCode: addr.postal_code,
        city: addr.city,
        coordinates: coords,
        units: unitsMap.get(addr.id) || []
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

  // Function to change map style
  const changeMapStyle = (style: 'streets' | 'satellite') => {
    const map = mapInstance.current;
    if (!map) return;

    const styleUrl = style === 'streets' 
      ? 'mapbox://styles/mapbox/streets-v12'
      : 'mapbox://styles/mapbox/satellite-streets-v12';

    map.setStyle(styleUrl);
    setMapStyle(style);

    // Re-add 3D buildings layer after style loads
    map.once('style.load', () => {
      const layers = map.getStyle().layers || [];
      const labelLayerId = layers.find(
        (l) => l.type === 'symbol' && (l.layout as any)['text-field']
      )?.id;

      if (style === 'streets') {
        // Check if layer already exists before adding
        if (!map.getLayer('add-3d-buildings')) {
          map.addLayer(
            {
              id: 'add-3d-buildings',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', ['get', 'extrude'], 'true'],
              type: 'fill-extrusion',
              minzoom: 15,
              paint: {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
                'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
                'fill-extrusion-opacity': 0.6,
              },
            },
            labelLayerId
          );
        }
      }
    });
  };

  // Initialize Mapbox map (3D) when addresses are loaded
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current || isLoadingAddresses) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    // Default center on Hamburg when no project is selected
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [9.9937, 53.5511], // Hamburg coordinates
      zoom: 12,
      pitch: 45,
      bearing: -17.6,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-left');

    // 3D buildings layer on initial load only (streets style)
    map.once('style.load', () => {
      const layers = map.getStyle().layers || [];
      const labelLayerId = layers.find(
        (l) => l.type === 'symbol' && (l.layout as any)['text-field']
      )?.id;

      map.addLayer(
        {
          id: 'add-3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', ['get', 'extrude'], 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
            'fill-extrusion-opacity': 0.6,
          },
        },
        labelLayerId
      );
    });

    // Setup Draw control
    const draw = new MapboxDraw({ displayControlsDefault: false });
    map.addControl(draw);
    drawRef.current = draw;

    // Helper: point in polygon (ray casting)
    const pointInPolygon = (point: [number, number], polygon: [number, number][]) => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > point[1]) !== (yj > point[1])) && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    // Handle polygon creation
    map.on('draw.create', (e: any) => {
      const feature = e.features?.[0];
      if (!feature || feature.geometry?.type !== 'Polygon') return;
      const ring: [number, number][] = (feature.geometry.coordinates?.[0] || []) as [number, number][];

      const selectedAddrs = addresses.filter((address) => {
        const pt: [number, number] = [address.coordinates[0], address.coordinates[1]];
        return pointInPolygon(pt, ring);
      });

      setSelectedAddresses(selectedAddrs);
      setShowStatsPopup(true);
      setIsDrawingMode(false);
      toast.success(`${selectedAddrs.length} Adressen ausgewählt`);
    });

    // Don't fit to addresses on initial load - stay on Hamburg

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [addresses, isLoadingAddresses]);

  // Toggle drawing mode (Mapbox Draw)
  const toggleDrawingMode = () => {
    const map = mapInstance.current;
    const draw = drawRef.current;
    if (!map || !draw) return;

    if (isDrawingMode) {
      draw.changeMode('simple_select');
      setIsDrawingMode(false);
    } else {
      draw.deleteAll();
      draw.changeMode('draw_polygon');
      setIsDrawingMode(true);
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

    // Update selected list IDs immediately for filtering
    setSelectedListIds(new Set(listIds));

    if (!map) return;

    if (listIds.length > 0) {
      // Save current view once when entering focus mode
      if (!previousViewRef.current) {
        previousViewRef.current = { center: map.getCenter(), zoom: map.getZoom() } as any;
      }

      // Load all addresses for the selected lists and fit bounds
      const addressIds = await loadAddressesForLists(listIds);
      setListAddressIds(addressIds);

      // Fit bounds to all addresses from selected lists
      const bounds = new mapboxgl.LngLatBounds();
      addresses.forEach((a) => {
        if (addressIds.has(a.id) && a.coordinates && a.coordinates[0] !== 0 && a.coordinates[1] !== 0) {
          bounds.extend([a.coordinates[0], a.coordinates[1]]);
        }
      });
      
      if (!bounds.isEmpty()) {
        const offsetX = showListsSidebar ? (window.innerWidth >= 640 ? 190 : 160) : 0; // half of sidebar width
        map.fitBounds(bounds, { padding: 50, offset: [-offsetX, 0], maxZoom: 17 });
      }
    } else {
      // Clear focus when no lists selected
      setListAddressIds(new Set());
      // Do not modify zoom or center on deselection
      previousViewRef.current = null;
    }
  };


  // Recenter when sidebar visibility changes while lists are selected
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (selectedListIds.size === 0 || listAddressIds.size === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    addresses.forEach((a) => {
      if (listAddressIds.has(a.id)) bounds.extend([a.coordinates[0], a.coordinates[1]]);
    });
    if (!bounds.isEmpty()) {
      const offsetX = showListsSidebar ? (window.innerWidth >= 640 ? 190 : 160) : 0; // half of sidebar width
      map.fitBounds(bounds, { padding: 50, offset: [-offsetX, 0] });
    }
  }, [showListsSidebar]);

  // Re-render markers when filter changes or list is expanded (Mapbox GL)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    
    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let visibleAddressCount = 0;

    addresses.forEach((address) => {
      const isAssigned = assignedAddressIds.has(address.id);

      // Filter by selected projects
      if (selectedProjectIds.size > 0) {
        const pid = (address as any).projectId;
        if (!pid || !selectedProjectIds.has(pid)) return;
      }

      // Apply status filter
      if (statusFilter.length > 0) {
        const hasMatchingStatus = address.units.some((unit) => statusFilter.includes(unit.status));
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
          return;
        }
      } else {
        if (filterMode === 'unassigned' && isAssigned) return;
        if (filterMode === 'no-rocket') {
          if (isAssigned) return;
        }
      }

      // Use list color if assigned, otherwise gray
      let color: string;
      if (isAssigned && addressListColors.has(address.id)) {
        color = addressListColors.get(address.id)!;
      } else {
        color = '#9ca3af';
      }

      const size = 24;
      const fontSize = 11;
      const el = document.createElement('div');
      el.style.cssText = `width:${size}px;height:${size}px;background:${color};color:#fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:700;cursor:pointer;`;
      el.textContent = String(address.units.length);

      // Add click handler to open address modal
      el.addEventListener('click', () => {
        setSelectedAddress(address);
        setShowAddressModal(true);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([address.coordinates[0], address.coordinates[1]])
        .setPopup(
          new mapboxgl.Popup({ offset: 12 }).setHTML(`
            <div style="padding: 8px; font-size: 12px; min-width: 150px;">
              <div style="font-weight: 600; margin-bottom: 6px; color: ${color};">${address.street} ${address.houseNumber}</div>
              <div style="color: #666; margin-bottom: 6px;">${address.postalCode} ${address.city}</div>
              <div style="border-top: 1px solid #e5e7eb; margin-top: 6px; padding-top: 6px;">
                <div style="font-weight: 500; font-size: 11px; margin-bottom: 4px; color: #374151;">Wohneinheiten (${address.units.length}):</div>
                ${address.units.map(unit => `<div style=\"font-size: 11px; color: #666; padding: 2px 0;\">${unit.floor} ${unit.position}</div>`).join('')}
              </div>
            </div>
          `)
        )
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([address.coordinates[0], address.coordinates[1]]);
      visibleAddressCount++;
    });

    if (!bounds.isEmpty() && selectedListIds.size > 0) {
      const offsetX = showListsSidebar ? (window.innerWidth >= 640 ? 190 : 160) : 0;
      map.fitBounds(bounds, { padding: 50, offset: [-offsetX, 0], maxZoom: 17 });
    }

    if (selectedListIds.size > 0) {
      const totalExpected = listAddressIds.size;
      const allAddressIdsSet = new Set(addresses.map((a) => a.id));
      const missingInAddresses = Array.from(listAddressIds).filter((id) => !allAddressIdsSet.has(id));
      const invalidCoordIds = addresses
        .filter((a) => listAddressIds.has(a.id) && (!a.coordinates || a.coordinates[0] === 0 || a.coordinates[1] === 0))
        .map((a) => a.id);

      console.log('List vs Map diagnostics', {
        totalExpected,
        visibleOnMap: visibleAddressCount,
        missingInAddresses,
        invalidCoordIds,
      });
    } else {
      console.log('Visible markers after filters', visibleAddressCount, {
        filters: { statusFilter, streetFilter, cityFilter, postalCodeFilter, houseNumberFilter, filterMode },
      });
    }
  }, [filterMode, assignedAddressIds, addressListColors, addresses, selectedListIds, listAddressIds, statusFilter, streetFilter, cityFilter, postalCodeFilter, houseNumberFilter, showListsSidebar]);

  // Helper: point in polygon for [lng, lat]
  const isPointInPolygon = (point: [number, number], polygon: [number, number][]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > point[1]) !== (yj > point[1])) && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Zoom to project addresses when "Anzeigen" is clicked
  useEffect(() => {
    if (!mapInstance.current || !shouldZoomToProjects || selectedProjectIds.size === 0) return;

    const zoomToProjectAddresses = async () => {
      try {
        // Get all addresses for the selected projects
        const projectAddresses = addresses.filter(addr => 
          addr.projectId && selectedProjectIds.has(addr.projectId)
        );

        if (projectAddresses.length === 0) {
          console.log('No addresses found for selected projects');
          setShouldZoomToProjects(false);
          return;
        }

        // Filter addresses with valid coordinates
        const validAddresses = projectAddresses.filter(
          addr => addr.coordinates && 
                  Array.isArray(addr.coordinates) &&
                  addr.coordinates.length === 2 &&
                  typeof addr.coordinates[0] === 'number' && 
                  typeof addr.coordinates[1] === 'number'
        );

        if (validAddresses.length === 0) {
          console.log('No valid coordinates found for project addresses');
          setShouldZoomToProjects(false);
          return;
        }

        // Fit bounds to show all addresses
        const bounds = new mapboxgl.LngLatBounds();
        validAddresses.forEach((address) => {
          bounds.extend([address.coordinates[0], address.coordinates[1]]);
        });

        mapInstance.current?.fitBounds(bounds, {
          padding: 80,
          maxZoom: 15,
          duration: 1500,
          pitch: 45
        });

        setShouldZoomToProjects(false);
      } catch (error) {
        console.error('Error zooming to project addresses:', error);
        setShouldZoomToProjects(false);
      }
    };

    zoomToProjectAddresses();
  }, [shouldZoomToProjects, selectedProjectIds, addresses]);

  // Clear project markers when projects are deselected
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || selectedProjectIds.size === 0) {
      // Clear project markers if no projects selected
      projectMarkersRef.current.forEach((m) => m.remove());
      projectMarkersRef.current = [];
    }
  }, [selectedProjectIds]);

  return (
    <>
      <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset className="p-0 m-0 border-0">
          {/* Mobile Header */}
          <MobileHeader 
            selectedProjectIds={selectedProjectIds}
            onProjectsChange={setSelectedProjectIds}
          />
          
          <div className="flex flex-col h-full w-full">
            {/* Header */}
            <header className="hidden lg:flex items-center justify-between px-4 py-3 sm:py-4 border-b border-border bg-background">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Karte</h1>
              </div>
              
              {/* Project Selector - only on desktop and tablet */}
              {!isMobile && (
                <ProjectSelector
                  selectedProjectIds={selectedProjectIds}
                  onProjectsChange={setSelectedProjectIds}
                  onShowProjects={() => setShouldZoomToProjects(true)}
                />
              )}
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
                  onClick={() => setShowListsSidebar(!showListsSidebar)}
                  variant="outline"
                  className="shadow-lg bg-white hover:bg-white/90 border-border focus-visible:ring-0 focus-visible:ring-offset-0"
                  size="icon"
                  title={showListsSidebar ? "Lauflisten ausblenden" : "Lauflisten anzeigen"}
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
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="shadow-lg bg-white hover:bg-white/90 border-border"
                      size="icon"
                      title="Kartenebenen"
                    >
                      <Layers className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="w-56 p-2 z-[1001] bg-background">
                     <DropdownMenuLabel className="text-center text-sm pb-1">Kartentyp</DropdownMenuLabel>
                     <div className="grid grid-cols-2 gap-1.5">
                       <button
                         onClick={() => changeMapStyle('streets')}
                         className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all hover:bg-muted/50 ${
                           mapStyle === 'streets' 
                             ? 'border-primary bg-primary/5' 
                             : 'border-border bg-background'
                         }`}
                       >
                          <div className="w-full h-12 rounded-md overflow-hidden relative border border-gray-300">
                            <img 
                              src={mapPreview} 
                              alt="Kartenvorschau" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                         <span className={`text-xs ${mapStyle === 'streets' ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                           Karte
                         </span>
                       </button>
                       
                       <button
                         onClick={() => changeMapStyle('satellite')}
                         className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all hover:bg-muted/50 ${
                           mapStyle === 'satellite' 
                             ? 'border-primary bg-primary/5' 
                             : 'border-border bg-background'
                         }`}
                       >
                          <div className="w-full h-12 rounded-md overflow-hidden relative border border-gray-300">
                            <img 
                              src={satellitePreview} 
                              alt="Satellitenvorschau" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                         <span className={`text-xs ${mapStyle === 'satellite' ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                           Satellit
                         </span>
                       </button>
                     </div>
                   </DropdownMenuContent>
                </DropdownMenu>
                
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
              drawRef.current?.deleteAll();
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
            drawRef.current?.deleteAll();
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
          showListsSidebar={showListsSidebar}
        />
      </div>

      {/* AI Assistant */}
      <AIAssistant
        open={showAIAssistant}
        onClose={() => setShowAIAssistant(!showAIAssistant)}
        showListsSidebar={showListsSidebar}
        hideForPopup={showStatsPopup || showCreateListModal}
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

      {/* Address Detail Modal */}
      {selectedAddress && (
        <AddressDetailModal
          address={selectedAddress}
          allAddresses={addresses}
          open={showAddressModal}
          onOpenChange={setShowAddressModal}
          onClose={() => {
            setSelectedAddress(null);
            setShowAddressModal(false);
          }}
        />
      )}
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
