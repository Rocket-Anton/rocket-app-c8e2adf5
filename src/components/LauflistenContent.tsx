import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { Search, Filter, HelpCircle, Check, ChevronDown, Trash2, X, Info, Target, CheckCircle, Users, TrendingUp, FileText, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Home, Clock, PersonStanding, Circle, Settings, Moon, User, Layers } from "lucide-react";
import { Input } from "./ui/input";
import { AddressCard } from "./AddressCard";
import SwipeDeck from "./swipe/SwipeDeck";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Button } from "./ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Calendar } from "./ui/calendar";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import rocketLogoWhite from "@/assets/rocket-logo-white.png";

const mockAddresses = [
  { 
    id: 1, 
    street: "Am Alten Turm", 
    houseNumber: "1", 
    postalCode: "51107", 
    city: "Köln",
    coordinates: [7.0810, 50.9206] as [number, number], // Köln-Heumar
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
    units: [
      { id: 1, floor: "EG", position: "Links", status: "termin" },
      { id: 2, floor: "1. OG", position: "Links", status: "neukunde" },
    ]
  },
];

interface LauflistenContentProps {
  onOrderCreated?: () => void;
  orderCount?: number;
}

export const LauflistenContent = ({ onOrderCreated, orderCount = 0 }: LauflistenContentProps) => {
  // State für Adressen, damit Änderungen persistent sind
  const [addresses, setAddresses] = useState(mockAddresses);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortierung, setSortierung] = useState("alle");
  const [statusOpen, setStatusOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [streetFilter, setStreetFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [postalCodeFilter, setPostalCodeFilter] = useState("");
  const [houseNumberFilter, setHouseNumberFilter] = useState("");
  const [swipeMode, setSwipeMode] = useState(false);
  
  // Refs for address cards to enable scrolling
  const addressCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Temporary input values (nur für Anzeige während der Eingabe)
  const [streetInput, setStreetInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [postalCodeInput, setPostalCodeInput] = useState("");
  
  const [lastModifiedDate, setLastModifiedDate] = useState<Date | undefined>(undefined);
  const [dateFilterMode, setDateFilterMode] = useState<"" | "vor" | "nach">("");
  const [dateFilterType, setDateFilterType] = useState<"quick" | "custom">("quick");
  const [quickDateOption, setQuickDateOption] = useState<string>("");
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [postalCodeSuggestions, setPostalCodeSuggestions] = useState<string[]>([]);
  const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showPostalCodeSuggestions, setShowPostalCodeSuggestions] = useState(false);
  
  const isMobile = useIsMobile();

  // Handle modal close and scroll to the address
  const handleModalClose = (finalIndex: number) => {
    const cardRef = addressCardRefs.current[finalIndex];
    if (cardRef) {
      cardRef.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center'
      });
    }
  };

  // Get unique streets, cities, and postal codes for autocomplete
  const uniqueStreets = Array.from(new Set(addresses.map(a => a.street)));
  const uniqueCities = Array.from(new Set(addresses.map(a => a.city)));
  const uniquePostalCodes = Array.from(new Set(addresses.map(a => a.postalCode)));
  
  // Get available house numbers for selected street
  const availableHouseNumbers = streetFilter
    ? addresses
        .filter(a => a.street === streetFilter)
        .map(a => a.houseNumber)
    : [];

  // Update suggestions when user types
  useEffect(() => {
    if (streetInput) {
      const filtered = uniqueStreets.filter(s => 
        s.toLowerCase().includes(streetInput.toLowerCase())
      );
      setStreetSuggestions(filtered);
    } else {
      setStreetSuggestions([]);
    }
  }, [streetInput]);

  useEffect(() => {
    if (cityInput) {
      const filtered = uniqueCities.filter(c => 
        c.toLowerCase().includes(cityInput.toLowerCase())
      );
      setCitySuggestions(filtered);
    } else {
      setCitySuggestions([]);
    }
  }, [cityInput]);

  useEffect(() => {
    if (postalCodeInput) {
      const filtered = uniquePostalCodes.filter(p => 
        p.includes(postalCodeInput)
      );
      setPostalCodeSuggestions(filtered);
    } else {
      setPostalCodeSuggestions([]);
    }
  }, [postalCodeInput]);

  // Funktion zum Aktualisieren des Status einer Wohneinheit
  const updateUnitStatus = useCallback((addressId: number, unitId: number, newStatus: string) => {
    setAddresses(prev => prev.map(addr => {
      if (addr.id === addressId) {
        return {
          ...addr,
          units: addr.units?.map(unit => 
            unit.id === unitId ? { ...unit, status: newStatus } : unit
          )
        };
      }
      return addr;
    }));
  }, []);

  const statusOptions = [
    { value: "offen", label: "Offen", color: "bg-gray-500 text-white" },
    { value: "nicht-angetroffen", label: "Nicht angetroffen", color: "bg-yellow-500 text-white" },
    { value: "potenzial", label: "Potenzial", color: "bg-green-500 text-white" },
    { value: "neukunde", label: "Neukunde", color: "bg-emerald-500 text-white" },
    { value: "bestandskunde", label: "Bestandskunde", color: "bg-emerald-500 text-white" },
    { value: "kein-interesse", label: "Kein Interesse", color: "bg-red-500 text-white" },
    { value: "termin", label: "Termin", color: "bg-purple-500 text-white" },
    { value: "doppelt", label: "Doppelt", color: "bg-gray-300 text-gray-800" },
    { value: "nicht-vorhanden", label: "Nicht vorhanden", color: "bg-gray-400 text-white" },
    { value: "gewerbe", label: "Gewerbe", color: "bg-orange-500 text-white" },
  ];

  // Popover-Inhalt, der die Höhe an die Unterkante des Sheet begrenzt
  const BoundedPopoverContent = ({ containerRef, className = "", children, sideOffset = 8, align = "start" }: any) => {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const [maxH, setMaxH] = useState<number | undefined>();

    const update = useCallback(() => {
      const containerEl = containerRef?.current as HTMLElement | null;
      const contentEl = contentRef.current as HTMLElement | null;
      if (!containerEl || !contentEl) return;
      const cr = containerEl.getBoundingClientRect();
      const pr = contentEl.getBoundingClientRect();
      const available = Math.max(160, Math.floor(cr.bottom - pr.top - 8));
      setMaxH(available);
    }, [containerRef]);

    useLayoutEffect(() => {
      let raf1 = 0, raf2 = 0;
      raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(update); });
      const onScroll = () => update();
      window.addEventListener("resize", update);
      window.addEventListener("scroll", onScroll, true);
      const el = contentRef.current;
      let mo: MutationObserver | undefined;
      if (el) {
        mo = new MutationObserver(() => update());
        mo.observe(el, { attributes: true, attributeFilter: ["style", "data-state", "data-side"] });
      }
      return () => {
        cancelAnimationFrame(raf1); cancelAnimationFrame(raf2);
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", onScroll, true);
        mo?.disconnect();
      };
    }, [update]);

    return (
      <PopoverContent
        ref={contentRef as any}
        side="bottom"
        align={align}
        sideOffset={sideOffset}
        avoidCollisions={false}
        className={className}
        style={{ maxHeight: maxH }}
      >
        {children}
      </PopoverContent>
    );
  };
  // Filter addresses based on all criteria
  const filteredAddresses = addresses.filter(address => {
    // Search term filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" || (
      address.street.toLowerCase().includes(searchLower) ||
      address.houseNumber.includes(searchTerm) ||
      address.postalCode.includes(searchTerm) ||
      address.city.toLowerCase().includes(searchLower)
    );

    // Status filter - only show addresses that have units with selected statuses
    const matchesStatus = statusFilter.length === 0 || 
      address.units.some(unit => statusFilter.includes(unit.status));
    
    const matchesStreet = streetFilter === "" || address.street === streetFilter;
    const matchesCity = cityFilter === "" || address.city === cityFilter;
    const matchesPostalCode = postalCodeFilter === "" || address.postalCode === postalCodeFilter;
    const matchesHouseNumber = houseNumberFilter === "" || houseNumberFilter === "alle" || address.houseNumber === houseNumberFilter;
    
    // Sortierung: gerade/ungerade Hausnummern
    const houseNumberInt = parseInt(address.houseNumber, 10);
    const matchesSortierung = sortierung === "alle" || 
      (sortierung === "gerade" && !isNaN(houseNumberInt) && houseNumberInt % 2 === 0) ||
      (sortierung === "ungerade" && !isNaN(houseNumberInt) && houseNumberInt % 2 === 1);
    
    // Date filter - check if address was last qualified before/after the selected date
    let matchesLastModified = true;
    if (lastModifiedDate) {
      // For mock data, we'll use a random date for each address
      // In production, this would come from the actual lastModified field
      const mockLastModified = new Date(2025, 9, 1 + (address.id % 30)); // Mock dates in October
      
      if (dateFilterMode === "vor") {
        // Show addresses last modified BEFORE this date
        matchesLastModified = mockLastModified < lastModifiedDate;
      } else {
        // Show addresses last modified AFTER this date
        matchesLastModified = mockLastModified >= lastModifiedDate;
      }
    }

    return matchesSearch && matchesStatus && matchesStreet && matchesCity && matchesPostalCode && matchesHouseNumber && matchesSortierung && matchesLastModified;
  }).map(address => {
    // Calculate wohneinheiten and potentiale based on filtered units
    const filteredUnits = statusFilter.length === 0 
      ? address.units 
      : address.units.filter(unit => statusFilter.includes(unit.status));
    
    const wohneinheiten = filteredUnits.length;
    
    // Potenziale sind: offen, potenzial, termin
    const potentiale = filteredUnits.filter(unit => 
      ['offen', 'potenzial', 'termin'].includes(unit.status)
    ).length;
    
    return {
      ...address,
      wohneinheiten,
      potentiale,
      filteredUnits // Pass filtered units to modal
    };
  });

  const displayedAddresses = filteredAddresses;

  // Dynamische Styles für Aufträge heute basierend auf Count
  const getOrderCardStyle = () => {
    if (orderCount === 0) {
      return {
        borderColor: "border-red-500",
        bgColor: "bg-red-50",
        textColor: "text-red-600",
        iconBg: "bg-red-500",
        shimmer: false,
        emoji: "😭"
      };
    } else if (orderCount <= 2) {
      return {
        borderColor: "border-yellow-500",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-600",
        iconBg: "bg-yellow-500",
        shimmer: false,
        emoji: "🧐"
      };
    } else if (orderCount <= 5) {
      return {
        borderColor: "border-green-500",
        bgColor: "bg-green-50",
        textColor: "text-green-600",
        iconBg: "bg-green-500",
        shimmer: false,
        emoji: "😏"
      };
    } else if (orderCount < 10) {
      return {
        borderColor: "border-gray-300",
        bgColor: "bg-gradient-to-br from-gray-50 via-slate-100 to-gray-50",
        textColor: "text-gray-700",
        iconBg: "bg-gray-400",
        shimmer: true,
        shimmerColor: "silver",
        emoji: "🤩"
      };
    } else {
      return {
        borderColor: "border-yellow-600",
        bgColor: "bg-gradient-to-br from-yellow-100 to-amber-200",
        textColor: "text-yellow-700",
        iconBg: "bg-yellow-600",
        shimmer: true,
        shimmerColor: "gold",
        emoji: "🏆"
      };
    }
  };

  const orderStyle = getOrderCardStyle();

  const metricsData = [
    {
      title: "Aufträge heute",
      value: orderCount.toString(),
      icon: Users,
      color: orderStyle.textColor,
      bgColor: orderStyle.bgColor,
      explanation: "Anzahl der heute gewonnenen Neukunden",
      borderColor: orderStyle.borderColor,
      shimmer: orderStyle.shimmer,
      shimmerColor: orderStyle.shimmerColor,
      emoji: orderStyle.emoji,
      iconBg: orderStyle.iconBg,
      isOrderCard: true
    },
    {
      title: "Potentiale",
      value: "127",
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      explanation: "Anzahl der identifizierten potentiellen Kunden basierend auf Bewertungskriterien"
    },
    {
      title: "Qualifiziert heute",
      value: "23",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      explanation: "Anzahl der heute qualifizierten Leads, die bereit für den Vertrieb sind"
    }
  ];

  const gaugeData = [
    { name: 'completed', value: 5, fill: '#22c55e' },
    { name: 'remaining', value: 95, fill: '#e5e7eb' }
  ];

  const GaugeChart = () => (
    <div className="relative flex items-center justify-center">
      <div className="absolute inset-0 flex flex-col items-center justify-center z-0">
        <div className="text-2xl font-bold text-foreground">5</div>
      </div>
      <ResponsiveContainer width={80} height={60}>
        <PieChart>
          <Pie
            data={gaugeData}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={0}
            innerRadius={25}
            outerRadius={35}
            dataKey="value"
            strokeWidth={0}
          >
            {gaugeData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );


  // Single filter bar that scrolls with content and overlays the addresses
  const scrollRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const [filterH, setFilterH] = useState(0);
  const [showFilter, setShowFilter] = useState(true);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const measure = () => setFilterH(filterRef.current?.offsetHeight ?? 0);
    measure();
    const ro = new ResizeObserver(measure);
    if (filterRef.current) ro.observe(filterRef.current);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onScroll = () => {
      const st = root.scrollTop;
      // Very small delta for immediate response
      const delta = 1;
      if (st <= 0) {
        setShowFilter(true);
      } else if (st < lastScrollTop.current - delta) {
        setShowFilter(true);
      } else if (st > lastScrollTop.current + delta) {
        setShowFilter(false);
      }
      lastScrollTop.current = st;
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, []);

  // Popover-Höhe: wir nutzen direkt Radix' CSS-Variable
  // --radix-popper-available-height; kein JS-Resize-Workaround nötig.

  return (
    <TooltipProvider>
      <div className="flex flex-col h-dvh max-w-[100vw] overflow-x-hidden">
        {/* Mobile Header - nur auf kleinen Bildschirmen */}
        <div className="md:hidden bg-blue-700 h-12 flex items-center justify-between pl-0 pr-4 relative z-50">
          <img src={rocketLogoWhite} alt="Rocket Logo" className="h-16 mt-1 -ml-1" />
          <Sheet>
            <SheetTrigger asChild>
              <button className="text-white">
                <div className="space-y-1">
                  <div className="w-6 h-0.5 bg-white"></div>
                  <div className="w-6 h-0.5 bg-white"></div>
                  <div className="w-6 h-0.5 bg-white"></div>
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <SheetHeader>
                <SheetTitle>Menü</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                <nav className="space-y-1">
                  <a href="/" className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-md">
                    <Home className="w-5 h-5" />
                    <span>Dashboard</span>
                  </a>
                  <a href="/" className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-md">
                    <Clock className="w-5 h-5" />
                    <span>Aktivitäten</span>
                  </a>
                  <a href="/" className="flex items-center gap-3 px-4 py-2.5 bg-muted rounded-md font-medium">
                    <PersonStanding className="w-5 h-5" />
                    <span>Lauflisten</span>
                  </a>
                  <a href="/" className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-md ml-8">
                    <Circle className="w-4 h-4 fill-current" />
                    <span>Liste</span>
                  </a>
                  <a href="/" className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-md ml-8">
                    <Circle className="w-4 h-4" />
                    <span>Karte</span>
                  </a>
                  <a href="/" className="flex items-center justify-between px-4 py-2.5 hover:bg-muted rounded-md">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="w-5 h-5" />
                      <span>Termine</span>
                    </div>
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">1</span>
                  </a>
                  <a href="/" className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-md">
                    <User className="w-5 h-5" />
                    <span>Leads</span>
                  </a>
                  
                  <div className="pt-4 mt-4 border-t">
                    <div className="px-4 pb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System</span>
                    </div>
                    <a href="/" className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted rounded-md">
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
                    </a>
                    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted rounded-md">
                      <div className="flex items-center gap-3">
                        <Moon className="w-5 h-5" />
                        <span>Dark mode</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 mt-4 border-t">
                    <div className="px-4">
                      <div className="text-sm font-medium">Oleg Stemnev</div>
                      <button className="text-xs text-muted-foreground hover:text-foreground">Abmelden</button>
                    </div>
                  </div>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Header */}
        <div className={`pt-4 pb-0 ${isMobile ? 'px-4' : 'px-6'}`}>
          <h1 className="text-xl font-semibold text-foreground">Laufliste</h1>
        </div>

        {/* Metrics Dashboard */}
        <div className="px-4 md:px-6">
          <div className="flex w-full gap-3 pb-3 overflow-x-auto snap-x snap-proximity scrollbar-hide touch-pan-x overscroll-x-contain md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:snap-none" style={{ WebkitOverflowScrolling: 'touch', scrollPaddingLeft: '1rem', scrollPaddingRight: '1rem', scrollBehavior: 'smooth' }}>
            {metricsData.map((metric, index) => {
              const isOrderCard = metric.isOrderCard;
              return (
              <Card key={index} className={`relative p-4 hover:shadow-md transition-shadow flex-shrink-0 snap-start w-[160px] md:w-auto ${isOrderCard ? `border-2 ${metric.borderColor} ${metric.bgColor}` : ''}`}>
                {/* Shimmer Effect für Aufträge Card */}
                {isOrderCard && metric.shimmer && (
                  <div className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none">
                    <div
                      className={`h-full w-full ${
                        metric.shimmerColor === "gold"
                          ? "bg-gradient-to-r from-transparent via-yellow-300/40 to-transparent"
                          : "animate-shimmer-silver"
                      }`}
                      style={{
                        animation: metric.shimmerColor === "gold" 
                          ? "shimmer 2s infinite" 
                          : undefined
                      }}
                    />
                  </div>
                )}
                
                <div className="absolute -top-0.5 right-0.5 z-10">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="p-0 hover:bg-muted/50 rounded-full transition-colors">
                        <Info className={`text-green-600 cursor-pointer ${isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="end" side="bottom">
                      <p className="text-sm">{metric.explanation}</p>
                    </PopoverContent>
                  </Popover>
                </div>
                {isOrderCard && (
                  <div className="absolute -bottom-2 -right-2 z-10 pointer-events-none">
                    {metric.emoji ? (
                      <div className="relative w-9 h-9 flex items-center justify-center">
                        <div className="absolute inset-0 bg-yellow-100 rounded-full"></div>
                        <div className="relative text-2xl leading-none">{metric.emoji}</div>
                      </div>
                    ) : (
                      <div className={`w-6 h-6 ${metric.iconBg} rounded-full flex items-center justify-center`}>
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                )}
                <div className={`flex flex-col items-center justify-center text-center mt-2 ${isOrderCard ? 'relative z-10' : ''}`}>
                  <div className={`font-bold mb-2 ${isMobile ? 'text-xl' : 'text-3xl'} ${isOrderCard ? metric.color : 'text-foreground'}`}>{metric.value}</div>
                  <div className={`text-sm ${isOrderCard ? metric.color : 'text-muted-foreground'}`}>{metric.title}</div>
                </div>
              </Card>
              );
            })}
            
            {/* Gauge Chart Card */}
            <Card className={`relative p-4 hover:shadow-md transition-shadow border-2 border-red-500 bg-red-50/50 flex-shrink-0 snap-start w-[160px] md:w-auto`}>
              <div className="absolute -top-0.5 right-0.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-0 hover:bg-muted/50 rounded-full transition-colors">
                      <Info className={`text-green-600 cursor-pointer ${isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3" align="end" side="bottom">
                    <p className="text-sm">Anzahl der heute bearbeiteten Aufträge</p>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="absolute -bottom-3 -right-3 z-10 pointer-events-none">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center text-center mt-2">
                <div className={`font-bold text-foreground mb-2 ${isMobile ? 'text-xl' : 'text-3xl'}`}>6,5%</div>
                <div className="text-sm text-muted-foreground">Conversion</div>
              </div>
            </Card>
          </div>
        </div>

        {/* Divider between Dashboard and Filter */}
        <div className={`py-2 ${isMobile ? 'px-4' : 'px-6'}`}>
          <div className="h-px bg-border"></div>
        </div>

        {/* Header */}
        <div className={`app-header pb-2 relative z-20 bg-background ${isMobile ? 'px-4' : 'px-6'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
            </div>
          </div>
        </div>
        </div>

      {/* Address List - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" ref={scrollRef} style={{ overscrollBehavior: 'none', touchAction: 'pan-y' }}>
        <div>
          <div
            ref={filterRef}
            className="sticky top-0 z-10"
          >
            <div className={`bg-background pt-2 pb-3 transition-transform duration-300 ${showFilter ? 'translate-y-0' : '-translate-y-full'} ${isMobile ? 'px-4' : 'px-6'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setSearchOpen(false);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <Input
                    placeholder="Adresse suchen"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSearchOpen(e.target.value.length > 0);
                    }}
                    onFocus={() => setSearchOpen(searchTerm.length > 0)}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                    className={`pl-10 ${searchTerm ? 'pr-10' : 'pr-3'}`}
                  />
                  {searchOpen && searchTerm.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50">
                      <div className="max-h-60 overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
                        {filteredAddresses.length > 0 ? (
                          filteredAddresses.slice(0, 5).map((address) => (
                            <div
                              key={address.id}
                              className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                setSearchTerm(`${address.street} ${address.houseNumber}, ${address.postalCode} ${address.city}`);
                                setSearchOpen(false);
                              }}
                            >
                              <div className="font-medium">{address.street} {address.houseNumber}</div>
                              <div className="text-sm text-muted-foreground">
                                {address.postalCode} {address.city}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-sm text-muted-foreground">
                            Keine Ergebnisse gefunden
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Icon - Mobile uses Sheet, Desktop uses Popover */}
                {isMobile ? (
                  <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="icon" className="h-10 w-10 relative">
                        <Filter className="h-4 w-4" />
                        {(() => {
                          const activeFilterCount = 
                            statusFilter.length + 
                            (streetFilter ? 1 : 0) + 
                            (cityFilter ? 1 : 0) + 
                            (postalCodeFilter ? 1 : 0) + 
                            (houseNumberFilter && houseNumberFilter !== "alle" ? 1 : 0) +
                            (sortierung !== "alle" ? 1 : 0) +
                            (lastModifiedDate ? 1 : 0);
                          return activeFilterCount > 0 ? (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">
                              {activeFilterCount}
                            </span>
                          ) : null;
                        })()}
                      </Button>
                    </SheetTrigger>
                    <SheetContent ref={mobileSheetRef} side="bottom" className="h-[85vh] flex flex-col p-0">
                       <SheetHeader className="flex-shrink-0 p-4 border-b border-border">
                         <div className="flex items-center justify-start gap-32">
                           <div className="flex items-center gap-2">
                             <SheetTitle>Filter</SheetTitle>
                             {(() => {
                               const activeFilterCount = 
                                 statusFilter.length + 
                                 (streetFilter ? 1 : 0) + 
                                 (cityFilter ? 1 : 0) + 
                                 (postalCodeFilter ? 1 : 0) + 
                                 (houseNumberFilter && houseNumberFilter !== "alle" ? 1 : 0) +
                                 (sortierung !== "alle" ? 1 : 0) +
                                 (lastModifiedDate ? 1 : 0);
                               return activeFilterCount > 0 ? (
                                 <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                                   {activeFilterCount}
                                 </div>
                               ) : null;
                             })()}
                           </div>
                          {(statusFilter.length > 0 || streetFilter || cityFilter || postalCodeFilter || houseNumberFilter || lastModifiedDate) && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setStatusFilter([]);
                                setSortierung("alle");
                                setStreetFilter("");
                                setStreetInput("");
                                setCityFilter("");
                                setCityInput("");
                                setPostalCodeFilter("");
                                 setPostalCodeInput("");
                                 setHouseNumberFilter("");
                                 setLastModifiedDate(undefined);
                                 setQuickDateOption("");
                                 setDateFilterType("quick");
                                 setDateFilterMode("");
                              }}
                              className="h-8 text-xs"
                            >
                              <X className="w-3 h-3 mr-0.5" />
                              Zurücksetzen
                            </Button>
                          )}
                        </div>
                      </SheetHeader>
                      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0" style={{ overscrollBehavior: 'contain' }}>
                        {/* Status Filter */}
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Status</label>
                          <div className="relative">
                            <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                              <PopoverTrigger asChild>
                               <Button
                                   variant="outline"
                                   role="combobox"
                                   className="w-full justify-start h-9 bg-background font-normal pr-16 focus-visible:ring-0 focus-visible:border-gray-400"
                                 >
                                   <span className={statusFilter.length === 0 ? "text-muted-foreground" : ""}>
                                     {statusFilter.length > 0
                                       ? `${statusFilter.length} ausgewählt`
                                       : "Status wählen"}
                                   </span>
                                </Button>
                              </PopoverTrigger>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1 pointer-events-none">
                                {statusFilter.length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setStatusFilter([]);
                                    }}
                                    className="text-muted-foreground hover:text-foreground pointer-events-auto"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </div>
                              
                              {/* Portal INS Sheet, damit die Höhe sauber begrenzt wird */}
                              <PopoverPrimitive.Portal container={mobileSheetRef.current ?? undefined}>
                                <PopoverContent
                                  side="bottom"
                                  align="start"
                                  sideOffset={8}
                                  avoidCollisions={false}
                                  collisionPadding={8}
                                  className="p-0 bg-background border border-border rounded-md shadow-md z-[10001]"
                                  style={{ width: 'var(--radix-popover-trigger-width)' }}
                                >
                                  {/* WICHTIG: Scrollen auf einem Kindelement, nicht auf dem transformierten Content */}
                                  <div
                                    role="listbox"
                                    aria-multiselectable
                                    className="max-h-[min(60dvh,var(--radix-popper-available-height,60dvh))] overflow-y-auto overscroll-contain touch-pan-y"
                                    style={{ WebkitOverflowScrolling: 'touch' }}
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                  >
                                    {statusOptions.map((option) => {
                                      const checked = statusFilter.includes(option.value);
                                      return (
                                        <button
                                          key={option.value}
                                          role="option"
                                          aria-selected={checked}
                                          onClick={() =>
                                            setStatusFilter((prev) =>
                                              checked ? prev.filter((s) => s !== option.value) : [...prev, option.value]
                                            )
                                          }
                                          className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2"
                                        >
                                          <span
                                            className={`flex-shrink-0 w-4 h-4 border-2 rounded flex items-center justify-center ${
                                              checked ? 'border-green-500' : 'border-input'
                                            }`}
                                          >
                                            {checked ? <Check className="w-3 h-3 text-green-500 stroke-[3]" /> : null}
                                          </span>
                                          <span className={`px-2 py-1 text-xs font-medium rounded ${option.color}`}>
                                            {option.label}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </PopoverContent>
                              </PopoverPrimitive.Portal>
                            </Popover>
                          </div>
                        </div>

                         {/* Sortierung Filter */}
                         <div className="space-y-1">
                           <label className="text-sm font-medium">Sortierung</label>
                           <div className="relative">
                             <Select value={sortierung} onValueChange={setSortierung} defaultValue="alle">
                               <SelectTrigger className="bg-background h-9 focus:ring-0 focus-visible:ring-0 focus:border-gray-400">
                                 <SelectValue placeholder="Sortierung wählen" className="text-muted-foreground" />
                               </SelectTrigger>
                               <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10000] max-h-[200px] overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
                                 <SelectItem value="alle">Alle</SelectItem>
                                 <SelectItem value="gerade">Gerade</SelectItem>
                                 <SelectItem value="ungerade">Ungerade</SelectItem>
                               </SelectContent>
                             </Select>
                             {sortierung !== "alle" && (
                               <button
                                 onClick={(e) => {
                                   e.preventDefault();
                                   e.stopPropagation();
                                   setSortierung("alle");
                                 }}
                                 className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                               >
                                 <X className="w-4 h-4" />
                               </button>
                             )}
                           </div>
                         </div>

                         {/* Letzte Qualifizierung Filter */}
                         <div className="space-y-1">
                           <label className="text-sm font-medium">Letzte Qualifizierung</label>
                           
                           <div className="relative">
                             {/* Main Dropdown */}
                             <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
                               <PopoverTrigger asChild>
                               <Button
                                   variant="outline"
                                   className="w-full justify-between h-9 font-normal bg-background focus-visible:ring-0 focus-visible:border-gray-400"
                                 >
                                   <span className={dateFilterMode === "" ? "text-muted-foreground" : ""}>
                                     {dateFilterMode === "" ? "Zeitraum auswählen" : 
                                      lastModifiedDate ? (
                                        `${dateFilterMode === "vor" ? "Vor" : "Nach"} ${format(lastModifiedDate, "dd.MM.yyyy")}${quickDateOption ? ` (${quickDateOption} Tage)` : ""}`
                                      ) : (
                                        dateFilterMode === "vor" ? "Vor" : "Nach"
                                      )}
                                   </span>
                                   <ChevronDown className="h-4 w-4 opacity-50" />
                                 </Button>
                               </PopoverTrigger>
                               <PopoverPrimitive.Portal container={mobileSheetRef.current ?? undefined}>
                                 <PopoverContent 
                                   className="w-[var(--radix-popover-trigger-width)] p-0 bg-background z-[10001]" 
                                   align="start"
                                   side="bottom"
                                   sideOffset={4}
                                 >
                                   <div className="py-1">
                                     <div className="text-xs text-muted-foreground px-3 py-2">Zeitraum:</div>
                                     <button
                                       type="button"
                                       className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                                       onClick={() => {
                                         setDateFilterMode("vor");
                                         setDateFilterOpen(false);
                                         setTimeout(() => setDatePickerOpen(true), 150);
                                       }}
                                     >
                                       Vor
                                     </button>
                                     <button
                                       type="button"
                                       className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                                       onClick={() => {
                                         setDateFilterMode("nach");
                                         setDateFilterOpen(false);
                                         setTimeout(() => setDatePickerOpen(true), 150);
                                       }}
                                     >
                                       Nach
                                     </button>
                                   </div>
                                 </PopoverContent>
                               </PopoverPrimitive.Portal>
                             </Popover>
                             
                             {/* X Button to clear */}
                             {(lastModifiedDate || dateFilterMode) && (
                               <button
                                 onClick={(e) => {
                                   e.preventDefault();
                                   e.stopPropagation();
                                   setLastModifiedDate(undefined);
                                   setQuickDateOption("");
                                   setDateFilterType("quick");
                                   setDateFilterMode("");
                                 }}
                                 className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                               >
                                 <X className="w-4 h-4" />
                               </button>
                             )}
                           </div>

                           {/* Date Picker Modal */}
                           {dateFilterMode && (
                             <Sheet open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                               <SheetContent side="bottom" className="h-auto max-h-[85vh] w-full p-4 rounded-t-2xl">
                                 <div className="space-y-4">
                                   {/* Quick Select Buttons - nur bei "Vor" */}
                                   {dateFilterMode === "vor" && (
                                     <div className="grid grid-cols-3 gap-2">
                                       {[
                                         { label: "7 Tage", value: "7", days: 7 },
                                         { label: "14 Tage", value: "14", days: 14 },
                                         { label: "30 Tage", value: "30", days: 30 },
                                       ].map((option) => (
                                         <Button
                                           key={option.value}
                                           type="button"
                                           variant="outline"
                                           size="sm"
                                           className={cn(
                                             "h-10 text-sm font-medium",
                                             quickDateOption === option.value
                                               ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                                               : "bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                                           )}
                                           onClick={() => {
                                             const date = new Date();
                                             date.setDate(date.getDate() - option.days);
                                             setLastModifiedDate(date);
                                             setQuickDateOption(option.value);
                                             setDateFilterType("quick");
                                           }}
                                         >
                                           {option.label}
                                         </Button>
                                       ))}
                                     </div>
                                   )}

                                   {/* Calendar */}
                                   <Calendar
                                     mode="single"
                                     selected={lastModifiedDate}
                                     onSelect={(date) => {
                                       setLastModifiedDate(date);
                                       setDateFilterType("custom");
                                       setQuickDateOption("");
                                     }}
                                     initialFocus
                                     className="pointer-events-auto rounded-md"
                                   />

                                   {/* Done Button */}
                                   <Button
                                     type="button"
                                     className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white text-base font-medium rounded-xl"
                                     onClick={() => {
                                       setDatePickerOpen(false);
                                       setDateFilterOpen(false);
                                     }}
                                   >
                                     Fertig
                                   </Button>
                                 </div>
                               </SheetContent>
                             </Sheet>
                           )}

                           {/* Info Text */}
                           {lastModifiedDate && dateFilterMode && (
                             <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-2">
                               {dateFilterMode === "vor" ? (
                                 <>Zeigt Adressen, die <strong>vor dem {format(lastModifiedDate, "dd.MM.yyyy")}</strong> qualifiziert wurden</>
                               ) : (
                                 <>Zeigt Adressen, die <strong>ab dem {format(lastModifiedDate, "dd.MM.yyyy")}</strong> qualifiziert wurden</>
                               )}
                             </div>
                           )}
                         </div>

                        {/* Street Filter */}
                        <div className="space-y-1 relative">
                          <label className="text-sm font-medium">Straße</label>
                          <div className="relative">
                            <Input
                              placeholder="Straße eingeben"
                              value={streetInput}
                              onChange={(e) => {
                                setStreetInput(e.target.value);
                                setShowStreetSuggestions(true);
                              }}
                              onFocus={() => streetInput && setShowStreetSuggestions(true)}
                              onBlur={() => setTimeout(() => setShowStreetSuggestions(false), 200)}
                              autoFocus={false}
                               className="bg-background h-9 pr-8 focus-visible:ring-0 focus:border-gray-400"
                            />
                            {streetInput && (
                              <button
                                onClick={() => {
                                  setStreetInput("");
                                  setStreetFilter("");
                                  setHouseNumberFilter("");
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            {showStreetSuggestions && streetSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[10001] max-h-[150px] overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
                                {streetSuggestions.map((street) => (
                                  <div
                                    key={street}
                                    className="p-2 hover:bg-muted cursor-pointer text-sm"
                                    onClick={() => {
                                      setStreetInput(street);
                                      setStreetFilter(street);
                                      setShowStreetSuggestions(false);
                                      setHouseNumberFilter(""); // Reset house number
                                    }}
                                  >
                                    {street}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Hausnummer Filter */}
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Hausnummer</label>
                          <div className="relative">
                            <Select 
                              value={houseNumberFilter} 
                              onValueChange={setHouseNumberFilter}
                              disabled={!streetFilter}
                            >
                               <SelectTrigger className="bg-background h-9 focus:ring-0 focus-visible:ring-0 focus:border-gray-400">
                                <SelectValue placeholder={streetFilter ? "Hausnummer wählen" : "Erst Straße wählen"} />
                              </SelectTrigger>
                              <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10000] max-h-[200px] overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
                                <SelectItem value="alle">Alle</SelectItem>
                                {availableHouseNumbers.map((num) => (
                                  <SelectItem key={num} value={num}>
                                    {num}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {houseNumberFilter && houseNumberFilter !== "alle" && (
                              <button
                                onClick={() => setHouseNumberFilter("")}
                                className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* PLZ Filter */}
                        <div className="space-y-1 relative">
                          <label className="text-sm font-medium">PLZ</label>
                          <div className="relative">
                            <Input
                              placeholder="PLZ eingeben"
                              value={postalCodeInput}
                              onChange={(e) => {
                                setPostalCodeInput(e.target.value);
                                setShowPostalCodeSuggestions(true);
                              }}
                              onFocus={() => postalCodeInput && setShowPostalCodeSuggestions(true)}
                              onBlur={() => setTimeout(() => setShowPostalCodeSuggestions(false), 200)}
                               className="bg-background h-9 pr-8 focus-visible:ring-0 focus:border-gray-400"
                            />
                            {postalCodeInput && (
                              <button
                                onClick={() => {
                                  setPostalCodeInput("");
                                  setPostalCodeFilter("");
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            {showPostalCodeSuggestions && postalCodeSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[10001] max-h-[150px] overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
                                {postalCodeSuggestions.map((plz) => (
                                  <div
                                    key={plz}
                                    className="p-2 hover:bg-muted cursor-pointer text-sm"
                                    onClick={() => {
                                      setPostalCodeInput(plz);
                                      setPostalCodeFilter(plz);
                                      setShowPostalCodeSuggestions(false);
                                    }}
                                  >
                                    {plz}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ort Filter */}
                        <div className="space-y-1 relative">
                          <label className="text-sm font-medium">Ort</label>
                          <div className="relative">
                            <Input
                              placeholder="Ort eingeben"
                              value={cityInput}
                              onChange={(e) => {
                                setCityInput(e.target.value);
                                setShowCitySuggestions(true);
                              }}
                              onFocus={() => cityInput && setShowCitySuggestions(true)}
                              onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                               className="bg-background h-9 pr-8 focus-visible:ring-0 focus:border-gray-400"
                            />
                            {cityInput && (
                              <button
                                onClick={() => {
                                  setCityInput("");
                                  setCityFilter("");
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            {showCitySuggestions && citySuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[10001] max-h-[150px] overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
                                {citySuggestions.map((city) => (
                                  <div
                                    key={city}
                                    className="p-2 hover:bg-muted cursor-pointer text-sm"
                                    onClick={() => {
                                      setCityInput(city);
                                      setCityFilter(city);
                                      setShowCitySuggestions(false);
                                    }}
                                  >
                                    {city}
                                  </div>
                                ))}
                              </div>
                            )}
                           </div>
                         </div>

                       </div>
                    </SheetContent>
                  </Sheet>
                ) : (
                  <Popover open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-10 w-10 relative">
                        <Filter className="h-4 w-4" />
                        {(() => {
                          const activeFilterCount = 
                            statusFilter.length + 
                            (streetFilter ? 1 : 0) + 
                            (cityFilter ? 1 : 0) + 
                            (postalCodeFilter ? 1 : 0) + 
                            (houseNumberFilter && houseNumberFilter !== "alle" ? 1 : 0) +
                            (sortierung !== "alle" ? 1 : 0) +
                            (lastModifiedDate ? 1 : 0);
                          return activeFilterCount > 0 ? (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">
                              {activeFilterCount}
                            </span>
                          ) : null;
                        })()}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-0 border shadow-lg bg-background z-[9999] rounded-lg flex flex-col w-80"
                      style={{ maxHeight: 'min(var(--radix-popper-available-height, 80dvh), 85dvh)' }}
                      align="end"
                      side="bottom"
                      sideOffset={8}
                      collisionPadding={8}
                    >
                      {/* Fixed Header */}
                      <div className="flex-shrink-0 p-4 border-b border-border bg-background flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Filter</h3>
                        {(statusFilter.length > 0 || streetFilter || cityFilter || postalCodeFilter || houseNumberFilter || lastModifiedDate) && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setStatusFilter([]);
                              setSortierung("alle");
                              setStreetFilter("");
                              setStreetInput("");
                              setCityFilter("");
                              setCityInput("");
                              setPostalCodeFilter("");
                              setPostalCodeInput("");
                               setHouseNumberFilter("");
                               setLastModifiedDate(undefined);
                               setQuickDateOption("");
                               setDateFilterType("quick");
                               setDateFilterMode("");
                            }}
                            className="h-8 text-xs"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Zurücksetzen
                          </Button>
                        )}
                      </div>

                      {/* Scrollable Content */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ overscrollBehavior: 'none', touchAction: 'pan-y' }}>
                          {/* Status Filter */}
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Status</label>
                            <div className="relative">
                              <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                                <PopoverTrigger asChild>
                               <Button
                                   variant="outline"
                                   role="combobox"
                                   className="w-full justify-start h-9 bg-background font-normal pr-16 focus-visible:ring-0 focus-visible:border-gray-400"
                                 >
                                   <span className={statusFilter.length === 0 ? "text-muted-foreground" : ""}>
                                     {statusFilter.length > 0
                                       ? `${statusFilter.length} ausgewählt`
                                       : "Status wählen"}
                                   </span>
                                  </Button>
                                </PopoverTrigger>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1 pointer-events-none">
                                  {statusFilter.length > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setStatusFilter([]);
                                      }}
                                      className="text-muted-foreground hover:text-foreground pointer-events-auto"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                  <ChevronDown className="h-4 w-4 opacity-50" />
                                </div>
                                <PopoverContent 
                                  className="p-0 bg-background z-[10001] pointer-events-auto" 
                                  align="start" 
                                  side="bottom" 
                                  sideOffset={8}
                                  sticky="always"
                                  avoidCollisions={false}
                                  collisionPadding={8}
                                  style={{ width: 'var(--radix-popover-trigger-width)' }}
                                >
                                  <div
                                    className="max-h-[min(50vh,var(--radix-popper-available-height,50vh))] overflow-y-auto overscroll-contain touch-pan-y"
                                    onWheelCapture={(e) => e.stopPropagation()}
                                    onWheel={(e) => e.stopPropagation()}
                                    onScroll={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onTouchMoveCapture={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                    onTouchEnd={(e) => e.stopPropagation()}
                                    style={{ WebkitOverflowScrolling: 'touch' }}
                                  >
                                    <Command className="bg-background">
                                      <CommandList className="overflow-visible">
                                        <CommandGroup>
                                          {statusOptions.map((option) => (
                                            <CommandItem
                                              key={option.value}
                                              onSelect={() => {
                                                setStatusFilter(
                                                  statusFilter.includes(option.value)
                                                    ? statusFilter.filter((s) => s !== option.value)
                                                    : [...statusFilter, option.value]
                                                );
                                              }}
                                              className="cursor-pointer"
                                            >
                                              <div className="flex items-center gap-2 w-full">
                                                <div className={`flex-shrink-0 w-4 h-4 border-2 rounded ${
                                                  statusFilter.includes(option.value)
                                                    ? 'border-green-500 bg-white'
                                                    : 'border-input bg-white'
                                                } flex items-center justify-center`}>
                                                  {statusFilter.includes(option.value) && (
                                                    <Check className="w-3 h-3 text-green-500 stroke-[3]" />
                                                  )}
                                                </div>
                                                <div className={`px-2 py-1 text-xs font-medium rounded ${option.color}`}>
                                                  {option.label}
                                                </div>
                                              </div>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                           {/* Sortierung Filter */}
                           <div className="space-y-1">
                             <label className="text-sm font-medium">Sortierung</label>
                             <div className="relative">
                               <Select value={sortierung} onValueChange={setSortierung} defaultValue="alle">
                                 <SelectTrigger className="bg-background h-9 focus:ring-0 focus-visible:ring-0 focus:border-gray-400">
                                   <SelectValue placeholder="Sortierung wählen" className="text-muted-foreground" />
                                 </SelectTrigger>
                                 <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10000] max-h-[200px] overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
                                   <SelectItem value="alle">Alle</SelectItem>
                                   <SelectItem value="gerade">Gerade</SelectItem>
                                   <SelectItem value="ungerade">Ungerade</SelectItem>
                                 </SelectContent>
                               </Select>
                               {sortierung !== "alle" && (
                                 <button
                                   onClick={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     setSortierung("alle");
                                   }}
                                   className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                                 >
                                   <X className="w-4 h-4" />
                                 </button>
                               )}
                             </div>
                           </div>

                           {/* Letzte Qualifizierung Filter - Desktop */}
                           <div className="space-y-1">
                             <label className="text-sm font-medium">Letzte Qualifizierung</label>
                             
                             <div className="relative">
                               {/* Main Dropdown */}
                               <Popover>
                                 <PopoverTrigger asChild>
                               <Button
                                   variant="outline"
                                   className="w-full justify-between h-9 font-normal bg-background focus-visible:ring-0 focus-visible:border-gray-400"
                                 >
                                     <span className={dateFilterMode === "" ? "text-muted-foreground" : ""}>
                                       {dateFilterMode === "" ? "Zeitraum auswählen" : 
                                        lastModifiedDate ? (
                                          `${dateFilterMode === "vor" ? "Vor" : "Nach"} ${format(lastModifiedDate, "dd.MM.yyyy")}${quickDateOption ? ` (${quickDateOption} Tage)` : ""}`
                                        ) : (
                                          dateFilterMode === "vor" ? "Vor" : "Nach"
                                        )}
                                     </span>
                                     <ChevronDown className="h-4 w-4 opacity-50" />
                                   </Button>
                                 </PopoverTrigger>
                                 <PopoverContent 
                                   className="w-[var(--radix-popover-trigger-width)] p-0 bg-background z-[10002]" 
                                   align="start"
                                   side="bottom"
                                   sideOffset={4}
                                 >
                                   <div className="py-1">
                                     <div className="text-xs text-muted-foreground px-3 py-2">Zeitraum:</div>
                                     <button
                                       type="button"
                                       className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                                       onClick={() => {
                                         setDateFilterMode("vor");
                                         setTimeout(() => setDatePickerOpen(true), 150);
                                       }}
                                     >
                                       Vor
                                     </button>
                                     <button
                                       type="button"
                                       className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                                       onClick={() => {
                                         setDateFilterMode("nach");
                                         setTimeout(() => setDatePickerOpen(true), 150);
                                       }}
                                     >
                                       Nach
                                     </button>
                                   </div>
                                 </PopoverContent>
                               </Popover>
                               
                               {/* X Button to clear */}
                               {(lastModifiedDate || dateFilterMode) && (
                                 <button
                                   onClick={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     setLastModifiedDate(undefined);
                                     setQuickDateOption("");
                                     setDateFilterType("quick");
                                     setDateFilterMode("");
                                   }}
                                   className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                                 >
                                   <X className="w-4 h-4" />
                                 </button>
                               )}
                             </div>

                             {/* Date Picker Modal */}
                             <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                               <PopoverContent 
                                 className="w-auto p-0 bg-background z-[10003]" 
                                 align="center"
                                 side="left"
                                 sideOffset={100}
                               >
                                 <div className="p-4 space-y-3">
                                   {/* Quick Select Buttons */}
                                   <div className="space-y-2">
                                     <div className="text-xs font-medium text-muted-foreground">Schnellauswahl:</div>
                                     <div className="grid grid-cols-3 gap-2">
                                       {[
                                         { label: "7 Tage", value: "7", days: 7 },
                                         { label: "14 Tage", value: "14", days: 14 },
                                         { label: "30 Tage", value: "30", days: 30 },
                                       ].map((option) => (
                                         <Button
                                           key={option.value}
                                           type="button"
                                           variant={quickDateOption === option.value ? "default" : "outline"}
                                           size="sm"
                                           className="h-9 text-xs bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                                           onClick={() => {
                                             const date = new Date();
                                             date.setDate(date.getDate() - option.days);
                                             setLastModifiedDate(date);
                                             setQuickDateOption(option.value);
                                             setDateFilterType("quick");
                                             setDatePickerOpen(false);
                                           }}
                                         >
                                           {option.label}
                                         </Button>
                                       ))}
                                     </div>
                                   </div>

                                   {/* Calendar */}
                                   <Calendar
                                     mode="single"
                                     selected={lastModifiedDate}
                                     onSelect={(date) => {
                                       setLastModifiedDate(date);
                                       setDateFilterType("custom");
                                       setQuickDateOption("");
                                       setDatePickerOpen(false);
                                     }}
                                     initialFocus
                                     className="pointer-events-auto rounded-md border"
                                   />
                                 </div>
                               </PopoverContent>
                             </Popover>

                             {/* Info Text */}
                             {lastModifiedDate && dateFilterMode && (
                               <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-2">
                                 {dateFilterMode === "vor" ? (
                                   <>Zeigt Adressen, die <strong>vor dem {format(lastModifiedDate, "dd.MM.yyyy")}</strong> qualifiziert wurden</>
                                 ) : (
                                   <>Zeigt Adressen, die <strong>ab dem {format(lastModifiedDate, "dd.MM.yyyy")}</strong> qualifiziert wurden</>
                                 )}
                               </div>
                             )}
                           </div>

                          {/* Street Filter */}
                          <div className="space-y-1 relative">
                            <label className="text-sm font-medium">Straße</label>
                            <div className="relative">
                              <Input
                                placeholder="Straße eingeben"
                                value={streetInput}
                                onChange={(e) => {
                                  setStreetInput(e.target.value);
                                  setShowStreetSuggestions(true);
                                }}
                                onFocus={() => streetInput && setShowStreetSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowStreetSuggestions(false), 200)}
                                autoFocus={false}
                               className="bg-background h-9 pr-8 focus-visible:ring-0 focus:border-gray-400"
                              />
                              {streetInput && (
                                <button
                                  onClick={() => {
                                    setStreetInput("");
                                    setStreetFilter("");
                                    setHouseNumberFilter("");
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              {showStreetSuggestions && streetSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[10001] max-h-[150px] overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
                                  {streetSuggestions.map((street) => (
                                    <div
                                      key={street}
                                      className="p-2 hover:bg-muted cursor-pointer text-sm"
                                      onClick={() => {
                                        setStreetInput(street);
                                        setStreetFilter(street);
                                        setShowStreetSuggestions(false);
                                        setHouseNumberFilter(""); // Reset house number
                                      }}
                                    >
                                      {street}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Hausnummer Filter */}
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Hausnummer</label>
                            <div className="relative">
                              <Select 
                                value={houseNumberFilter} 
                                onValueChange={setHouseNumberFilter}
                                disabled={!streetFilter}
                              >
                                <SelectTrigger className="bg-background h-9 focus:ring-0 focus-visible:ring-0 focus:border-gray-400">
                                  <SelectValue placeholder={streetFilter ? "Hausnummer wählen" : "Erst Straße wählen"} />
                                </SelectTrigger>
                                <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10000] max-h-[200px] overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
                                  <SelectItem value="alle">Alle</SelectItem>
                                  {availableHouseNumbers.map((num) => (
                                    <SelectItem key={num} value={num}>
                                      {num}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {houseNumberFilter && houseNumberFilter !== "alle" && (
                                <button
                                  onClick={() => setHouseNumberFilter("")}
                                  className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* PLZ Filter */}
                          <div className="space-y-1 relative">
                            <label className="text-sm font-medium">PLZ</label>
                            <div className="relative">
                              <Input
                                placeholder="PLZ eingeben"
                                value={postalCodeInput}
                                onChange={(e) => {
                                  setPostalCodeInput(e.target.value);
                                  setShowPostalCodeSuggestions(true);
                                }}
                                onFocus={() => postalCodeInput && setShowPostalCodeSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowPostalCodeSuggestions(false), 200)}
                               className="bg-background h-9 pr-8 focus-visible:ring-0 focus:border-gray-400"
                              />
                              {postalCodeInput && (
                                <button
                                  onClick={() => {
                                    setPostalCodeInput("");
                                    setPostalCodeFilter("");
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              {showPostalCodeSuggestions && postalCodeSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[10001] max-h-[150px] overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
                                  {postalCodeSuggestions.map((plz) => (
                                    <div
                                      key={plz}
                                      className="p-2 hover:bg-muted cursor-pointer text-sm"
                                      onClick={() => {
                                        setPostalCodeInput(plz);
                                        setPostalCodeFilter(plz);
                                        setShowPostalCodeSuggestions(false);
                                      }}
                                    >
                                      {plz}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Ort Filter */}
                          <div className="space-y-1 relative">
                            <label className="text-sm font-medium">Ort</label>
                            <div className="relative">
                              <Input
                                placeholder="Ort eingeben"
                                value={cityInput}
                                onChange={(e) => {
                                  setCityInput(e.target.value);
                                  setShowCitySuggestions(true);
                                }}
                                onFocus={() => cityInput && setShowCitySuggestions(true)}
                                onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                                className="bg-background h-9 pr-8 focus-visible:ring-0 focus:border-gray-400"
                              />
                              {cityInput && (
                                <button
                                  onClick={() => {
                                    setCityInput("");
                                    setCityFilter("");
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              {showCitySuggestions && citySuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[10001] max-h-[150px] overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
                                  {citySuggestions.map((city) => (
                                    <div
                                      key={city}
                                      className="p-2 hover:bg-muted cursor-pointer text-sm"
                                      onClick={() => {
                                        setCityInput(city);
                                        setCityFilter(city);
                                        setShowCitySuggestions(false);
                                      }}
                                    >
                                      {city}
                                    </div>
                                  ))}
                                </div>
                              )}
                             </div>
                           </div>

                         </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>

          {/* Swipe Deck or Address Cards */}
          {swipeMode && isMobile ? (
            <div className="pb-20">
              <div className="text-center py-4 px-4">
                <p className="text-sm text-muted-foreground">
                  Swipe-Modus aktiv • Wische Karten nach links oder rechts
                </p>
              </div>
              <SwipeDeck
                addresses={displayedAddresses}
                onLeft={(address) => {
                  console.log('Swipe left:', address);
                  // TODO: Status auf "kein-interesse" setzen
                }}
                onRight={(address) => {
                  console.log('Swipe right:', address);
                  // TODO: Status auf "potenzial" setzen
                }}
                renderCard={(address) => (
                  <div className="p-6 h-full overflow-y-auto">
                    <div className="text-xl font-semibold mb-2">
                      {address.street} {address.houseNumber}
                    </div>
                    <div className="text-muted-foreground mb-4">
                      {address.postalCode} {address.city}
                    </div>
                    {address.units && address.units.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium border-b pb-2">
                          Wohneinheiten: {address.units.length}
                        </div>
                        {address.units.map((unit: any) => (
                          <div key={unit.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                            <div className="text-sm">
                              <span className="font-medium">{unit.floor}</span>
                              {unit.position && <span className="text-muted-foreground ml-2">• {unit.position}</span>}
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              statusOptions.find(s => s.value === unit.status)?.color || 'bg-gray-500 text-white'
                            }`}>
                              {statusOptions.find(s => s.value === unit.status)?.label || unit.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
          ) : (
            <div className={`pb-20 ${isMobile ? 'px-4' : 'px-6'}`}>
              <div className="space-y-4">
                {displayedAddresses.map((address, index) => (
                  <div 
                    key={address.id} 
                    ref={(el) => addressCardRefs.current[index] = el}
                  >
                    <AddressCard 
                      address={address}
                      allAddresses={displayedAddresses}
                      currentIndex={index}
                      onModalClose={handleModalClose}
                      onOrderCreated={onOrderCreated}
                      onUpdateUnitStatus={updateUnitStatus}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};
