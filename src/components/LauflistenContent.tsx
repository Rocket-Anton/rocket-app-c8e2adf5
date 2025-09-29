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
  { id: 1, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 2, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 3, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 4, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 5, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 6, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 7, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 8, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
];

export const LauflistenContent = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [allFilter, setAllFilter] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [streetFilter, setStreetFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [postalCodeFilter, setPostalCodeFilter] = useState("");
  const [lastModifiedDate, setLastModifiedDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const isMobile = useIsMobile();

  const statusOptions = [
    { value: "offen", label: "Offen" },
    { value: "nicht-angetroffen", label: "Nicht angetroffen" },
    { value: "potenzial", label: "Potenzial" },
    { value: "neukunde", label: "Neukunde" },
    { value: "bestandskunde", label: "Bestandskunde" },
    { value: "kein-interesse", label: "Kein Interesse" },
    { value: "termin", label: "Termin" },
    { value: "nicht-vorhanden", label: "Nicht vorhanden" },
    { value: "gewerbe", label: "Gewerbe" },
  ];

  // Filter addresses based on all criteria
  const filteredAddresses = mockAddresses.filter(address => {
    // Search term filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" || (
      address.street.toLowerCase().includes(searchLower) ||
      address.postalCode.includes(searchTerm) ||
      address.city.toLowerCase().includes(searchLower)
    );

    // Mobile filters
    const matchesStreet = streetFilter === "" || address.street.toLowerCase().includes(streetFilter.toLowerCase());
    const matchesCity = cityFilter === "" || address.city.toLowerCase().includes(cityFilter.toLowerCase());
    const matchesPostalCode = postalCodeFilter === "" || address.postalCode.includes(postalCodeFilter);
    
    // For now, we don't have lastModified data in mock, so we'll always match
    // In real implementation, you would check: address.lastModified >= lastModifiedDate
    const matchesLastModified = true;

    return matchesSearch && matchesStreet && matchesCity && matchesPostalCode && matchesLastModified;
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

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen">
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
      <div className="flex-1 overflow-y-auto overscroll-behavior-none" ref={scrollRef} style={{ WebkitOverflowScrolling: 'touch' }}>
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
                                setSearchTerm(`${address.street}, ${address.postalCode} ${address.city}`);
                                setSearchOpen(false);
                              }}
                            >
                              <div className="font-medium">{address.street}</div>
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
                    <Button variant="outline" size="icon" className="h-10 w-10">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className={`${isMobile ? 'w-screen h-[70vh]' : 'w-80'} p-0 border-0 shadow-lg`} 
                    align={isMobile ? "center" : "end"}
                    side={isMobile ? "bottom" : "bottom"}
                    sideOffset={isMobile ? 8 : 4}
                    alignOffset={isMobile ? 0 : -10}
                  >
                    <div className="p-4 border-b border-border">
                      <h3 className="text-lg font-semibold">Filters</h3>
                    </div>
                    <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(70vh-60px)]">
                      {/* Street Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Straße</label>
                        <Input
                          placeholder="Straße eingeben"
                          value={streetFilter}
                          onChange={(e) => setStreetFilter(e.target.value)}
                          autoFocus={false}
                        />
                      </div>

                      {/* City Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Filter Handy</label>
                        <Input
                          placeholder="Handy Filter eingeben"
                          value={cityFilter}
                          onChange={(e) => setCityFilter(e.target.value)}
                        />
                      </div>

                      {/* Postal Code Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Filter Werber</label>
                        <Input
                          placeholder="Werber Filter eingeben"
                          value={postalCodeFilter}
                          onChange={(e) => setPostalCodeFilter(e.target.value)}
                        />
                      </div>

                      {/* Agency Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Filter Agenturname</label>
                        <Input
                          placeholder="Agenturname eingeben"
                          value=""
                          onChange={() => {}}
                        />
                      </div>

                      {/* Location Potential Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Filter Ort Potential</label>
                        <Input
                          placeholder="Ort Potential eingeben"
                          value=""
                          onChange={() => {}}
                        />
                      </div>

                      {/* PLZ Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Filter PLZ</label>
                        <Input
                          placeholder="PLZ eingeben"
                          value=""
                          onChange={() => {}}
                        />
                      </div>

                      {/* Email Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Filter E-Mail</label>
                        <Input
                          placeholder="E-Mail eingeben"
                          value=""
                          onChange={() => {}}
                        />
                      </div>

                      {/* City Filter 2 */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Filter Stadt</label>
                        <Input
                          placeholder="Stadt eingeben"
                          value=""
                          onChange={() => {}}
                        />
                      </div>

                      {/* Status Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Filter Status Aktivi...</label>
                        <Select value="" onValueChange={() => {}}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Status Aktivität auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aktiv">Aktiv</SelectItem>
                            <SelectItem value="inaktiv">Inaktiv</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Closer Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Filter Closer</label>
                        <Select value="" onValueChange={() => {}}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Closer auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="closer1">Closer 1</SelectItem>
                            <SelectItem value="closer2">Closer 2</SelectItem>
                            <SelectItem value="closer3">Closer 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Bundesland Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Filter Bundesland</label>
                        <Input
                          placeholder="Bundesland eingeben"
                          value=""
                          onChange={() => {}}
                        />
                      </div>

                      {/* Projektleiter Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Filter Projektleiter</label>
                        <Select value="" onValueChange={() => {}}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Projektleiter auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pm1">Projektleiter 1</SelectItem>
                            <SelectItem value="pm2">Projektleiter 2</SelectItem>
                            <SelectItem value="pm3">Projektleiter 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Number Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nummer</label>
                        <Select value={allFilter} onValueChange={setAllFilter}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Nummer auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="alle">Alle</SelectItem>
                            <SelectItem value="gerade">Gerade</SelectItem>
                            <SelectItem value="ungerade">Ungerade</SelectItem>
                          </SelectContent>
                        </Select>
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
