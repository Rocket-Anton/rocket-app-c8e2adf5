import { useState, useEffect, useRef } from "react";
import { Search, Filter, HelpCircle, Check, ChevronDown, Trash2, X, Info, Target, CheckCircle, Users, TrendingUp, FileText, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "./ui/input";
import { AddressCard } from "./AddressCard";
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

const mockAddresses = [
  { id: 1, street: "Alt-Lindenau", houseNumber: "7", postalCode: "88175", city: "Lindenau" },
  { id: 2, street: "Alt-Lindenau", houseNumber: "9", postalCode: "88175", city: "Lindenau" },
  { id: 3, street: "Hauptstraße", houseNumber: "12", postalCode: "88175", city: "Lindenau" },
  { id: 4, street: "Hauptstraße", houseNumber: "14", postalCode: "88175", city: "Lindenau" },
  { id: 5, street: "Bahnhofstraße", houseNumber: "3", postalCode: "88176", city: "Scheidegg" },
  { id: 6, street: "Bahnhofstraße", houseNumber: "5", postalCode: "88176", city: "Scheidegg" },
  { id: 7, street: "Bergstraße", houseNumber: "21", postalCode: "88177", city: "Westallgäu" },
  { id: 8, street: "Bergstraße", houseNumber: "23", postalCode: "88177", city: "Westallgäu" },
];

export const LauflistenContent = () => {
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
  
  // Temporary input values (nur für Anzeige während der Eingabe)
  const [streetInput, setStreetInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [postalCodeInput, setPostalCodeInput] = useState("");
  
  const [lastModifiedDate, setLastModifiedDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [postalCodeSuggestions, setPostalCodeSuggestions] = useState<string[]>([]);
  const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showPostalCodeSuggestions, setShowPostalCodeSuggestions] = useState(false);
  
  const isMobile = useIsMobile();

  // Get unique streets, cities, and postal codes for autocomplete
  const uniqueStreets = Array.from(new Set(mockAddresses.map(a => a.street)));
  const uniqueCities = Array.from(new Set(mockAddresses.map(a => a.city)));
  const uniquePostalCodes = Array.from(new Set(mockAddresses.map(a => a.postalCode)));
  
  // Get available house numbers for selected street
  const availableHouseNumbers = streetFilter
    ? mockAddresses
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

  const statusOptions = [
    { value: "offen", label: "Offen", color: "bg-gray-500 text-white" },
    { value: "nicht-angetroffen", label: "Nicht angetroffen", color: "bg-yellow-500 text-white" },
    { value: "potenzial", label: "Potenzial", color: "bg-green-500 text-white" },
    { value: "neukunde", label: "Neukunde", color: "bg-blue-500 text-white" },
    { value: "bestandskunde", label: "Bestandskunde", color: "bg-emerald-500 text-white" },
    { value: "kein-interesse", label: "Kein Interesse", color: "bg-red-500 text-white" },
    { value: "termin", label: "Termin", color: "bg-purple-500 text-white" },
    { value: "nicht-vorhanden", label: "Nicht vorhanden", color: "bg-gray-400 text-white" },
    { value: "gewerbe", label: "Gewerbe", color: "bg-orange-500 text-white" },
  ];

  // Filter addresses based on all criteria
  const filteredAddresses = mockAddresses.filter(address => {
    // Search term filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" || (
      address.street.toLowerCase().includes(searchLower) ||
      address.houseNumber.includes(searchTerm) ||
      address.postalCode.includes(searchTerm) ||
      address.city.toLowerCase().includes(searchLower)
    );

    // Mobile filters
    const matchesStatus = statusFilter.length === 0 || statusFilter.some(status => {
      // TODO: Add status field to address data
      // For now, we'll just return true if any status is selected
      return true;
    });
    const matchesStreet = streetFilter === "" || address.street === streetFilter;
    const matchesCity = cityFilter === "" || address.city === cityFilter;
    const matchesPostalCode = postalCodeFilter === "" || address.postalCode === postalCodeFilter;
    const matchesHouseNumber = houseNumberFilter === "" || houseNumberFilter === "alle" || address.houseNumber === houseNumberFilter;
    
    // Sortierung: gerade/ungerade Hausnummern
    const houseNumberInt = parseInt(address.houseNumber, 10);
    const matchesSortierung = sortierung === "alle" || 
      (sortierung === "gerade" && !isNaN(houseNumberInt) && houseNumberInt % 2 === 0) ||
      (sortierung === "ungerade" && !isNaN(houseNumberInt) && houseNumberInt % 2 === 1);
    
    // For now, we don't have lastModified data in mock, so we'll always match
    // In real implementation, you would check: address.lastModified >= lastModifiedDate
    const matchesLastModified = true;

    return matchesSearch && matchesStatus && matchesStreet && matchesCity && matchesPostalCode && matchesHouseNumber && matchesSortierung && matchesLastModified;
  });

  const displayedAddresses = filteredAddresses;

  const metricsData = [
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
    },
    {
      title: "Aufträge heute",
      value: "8",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
      explanation: "Anzahl der heute gewonnenen Neukunden",
      cardColor: "border-green-500"
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
      <div className="flex flex-col h-dvh">
        {/* Breadcrumb Navigation */}
        <div className="p-6 pb-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>🏠</span>
            <span>Home</span>
            <span>&gt;</span>
            <span>Laufliste</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Laufliste</h1>
        </div>

        {/* Metrics Dashboard */}
        <div className="px-6">
          <div className="grid grid-cols-4 gap-4 w-full pb-3 overflow-visible">
            {metricsData.map((metric, index) => {
              const isGreenCard = metric.title === "Aufträge heute";
              return (
              <Card key={index} className={`relative p-4 hover:shadow-md transition-shadow ${isGreenCard ? 'border-2 border-green-500 bg-green-50/50' : ''}`}>
                <div className="absolute top-2 right-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="p-1 hover:bg-muted rounded-full transition-colors">
                        <Info className="w-3 h-3 text-green-600 cursor-pointer" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="end" side="bottom">
                      <p className="text-sm">{metric.explanation}</p>
                    </PopoverContent>
                  </Popover>
                </div>
                {isGreenCard && (
                  <div className="absolute -bottom-3 -right-3 z-10 pointer-events-none">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-center justify-center text-center mt-2">
                  <div className={`font-bold text-foreground mb-2 ${isMobile ? 'text-xl' : 'text-3xl'}`}>{metric.value}</div>
                  {!isMobile && <div className="text-sm text-muted-foreground">{metric.title}</div>}
                </div>
              </Card>
              );
            })}
            
            {/* Gauge Chart Card */}
            <Card className="relative p-4 hover:shadow-md transition-shadow border-2 border-red-500 bg-red-50/50">
              <div className="absolute top-2 right-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-1 hover:bg-muted rounded-full transition-colors">
                      <Info className="w-3 h-3 text-green-600 cursor-pointer" />
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
                {!isMobile && <div className="text-sm text-muted-foreground">Conversion</div>}
              </div>
            </Card>
          </div>
        </div>

        {/* Divider between Dashboard and Filter */}
        <div className="px-6 py-2">
          <div className="h-px bg-border"></div>
        </div>

        {/* Header */}
        <div className="app-header px-6 pb-2 relative z-20 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
            </div>
          </div>
        </div>
        </div>

      {/* Address List - Scrollable */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef} style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        <div>
          <div
            ref={filterRef}
            className="sticky top-0 z-10"
          >
            <div className={`bg-background pt-2 pb-3 px-6 transition-transform duration-300 ${showFilter ? 'translate-y-0' : '-translate-y-full'}`}>
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
                      <div className="max-h-60 overflow-y-auto">
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

                {/* Filter Icon for all screen sizes */}
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
                          (lastModifiedDate ? 1 : 0);
                        // Sortierung wird nicht gezählt, da "alle" der Standard ist
                        return activeFilterCount > 0 ? (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">
                            {activeFilterCount}
                          </span>
                        ) : null;
                      })()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className={cn(
                      "p-0 border shadow-lg bg-background z-[9999] rounded-lg flex flex-col",
                      isMobile ? 'w-[75vw] max-w-[calc(100vw-2rem)]' : 'w-80'
                    )}
                    style={{ maxHeight: 'min(var(--radix-popper-available-height, 80dvh), 85dvh)' }}
                    align={isMobile ? "center" : "end"}
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
                          }}
                          className="h-8 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Zurücksetzen
                        </Button>
                      )}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                        {/* Status Filter */}
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Status</label>
                          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between h-9 bg-background font-normal"
                              >
                                {statusFilter.length > 0
                                  ? `${statusFilter.length} ausgewählt`
                                  : "Status wählen"}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="p-0 bg-background z-[10001]" 
                              align="start" 
                              side="bottom" 
                              avoidCollisions={false}
                              collisionPadding={8}
                              style={{ width: 'var(--radix-popover-trigger-width)' }}
                            >
                              <Command className="bg-background">
                                <CommandList style={{ maxHeight: 'min(var(--radix-popper-available-height, 40vh), 40vh)' }} className="overflow-y-auto">
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
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Sortierung Filter */}
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Sortierung</label>
                          <Select value={sortierung} onValueChange={setSortierung} defaultValue="alle">
                            <SelectTrigger className="bg-background h-9">
                              <SelectValue placeholder="Sortierung wählen" />
                            </SelectTrigger>
                            <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10000] max-h-[200px] overflow-y-auto overscroll-contain">
                              <SelectItem value="alle">Alle</SelectItem>
                              <SelectItem value="gerade">Gerade</SelectItem>
                              <SelectItem value="ungerade">Ungerade</SelectItem>
                            </SelectContent>
                          </Select>
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
                              className="bg-background h-9 pr-8"
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
                              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[10001] max-h-[150px] overflow-y-auto">
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
                              <SelectTrigger className="bg-background h-9">
                                <SelectValue placeholder={streetFilter ? "Hausnummer wählen" : "Erst Straße wählen"} />
                              </SelectTrigger>
                              <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10000] max-h-[200px] overflow-y-auto">
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
                              className="bg-background h-9 pr-8"
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
                              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[10001] max-h-[150px] overflow-y-auto">
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
                              className="bg-background h-9 pr-8"
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
                              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[10001] max-h-[150px] overflow-y-auto">
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
              </div>
            </div>
          </div>

          {/* Address Cards */}
          <div className="px-6 pb-20">
            <div className="space-y-4">
              {displayedAddresses.map((address) => (
                <AddressCard key={address.id} address={address} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};
