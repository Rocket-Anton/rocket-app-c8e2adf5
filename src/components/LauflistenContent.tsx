import { useState, useEffect, useRef } from "react";
import { Search, Filter, HelpCircle, Check, ChevronDown, Trash2, X, Info, Target, CheckCircle, Users, TrendingUp, FileText } from "lucide-react";
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

  // Filter addresses based on search term
  const filteredAddresses = mockAddresses.filter(address => {
    const searchLower = searchTerm.toLowerCase();
    return (
      address.street.toLowerCase().includes(searchLower) ||
      address.postalCode.includes(searchTerm) ||
      address.city.toLowerCase().includes(searchLower)
    );
  });

  const displayedAddresses = searchTerm ? filteredAddresses : mockAddresses;

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
      title: "Kunden heute",
      value: "8",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      explanation: "Anzahl der heute gewonnenen Neukunden"
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
      const delta = 6;
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
        {/* Page Title */}
        <div className="p-6 pb-0">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Lauflisten</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>🏠</span>
            <span>Lauflisten</span>
            <span>&gt;</span>
            <span>Liste</span>
          </div>
        </div>

        {/* Metrics Dashboard */}
        <div className="px-6">
          <div className="grid grid-cols-4 gap-4 w-full">
            {metricsData.map((metric, index) => (
              <Card key={index} className="relative p-4 hover:shadow-md transition-shadow">
                <div className="absolute top-2 left-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-green-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">{metric.explanation}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex flex-col items-center justify-center text-center mt-2">
                  <div className="text-3xl font-bold text-foreground mb-2">{metric.value}</div>
                  <div className="text-sm text-muted-foreground">{metric.title}</div>
                </div>
              </Card>
            ))}
            
            {/* Gauge Chart Card */}
            <Card className="relative p-4 hover:shadow-md transition-shadow">
              <div className="absolute top-2 left-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-green-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">Anzahl der heute bearbeiteten Aufträge</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-col items-center justify-center text-center mt-2">
                <div className="text-3xl font-bold text-foreground mb-2">5</div>
                <div className="text-sm text-muted-foreground">Aufträge heute</div>
              </div>
            </Card>
          </div>
        </div>

        {/* Header */}
        <div className="app-header px-6 pb-3 relative z-20 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
            </div>
          </div>
        </div>
        </div>

      {/* Address List - Scrollable */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div>
          <div
            ref={filterRef}
            className="sticky top-0 z-10 px-6"
          >
            <div className={`bg-background py-3 shadow-sm transition-transform duration-150 ${showFilter ? 'translate-y-0' : '-translate-y-full'}`}>
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

                <div className="flex items-center gap-2">
                  <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={statusOpen}
                        className="w-36 h-10 px-3 py-2 flex items-center justify-between"
                      >
                        <span className="truncate">
                          {statusFilter.length === 0
                            ? "Status"
                            : `${statusFilter.length} ausgewählt`}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                      <Command>
                        <CommandList>
                          <CommandGroup>
                            {statusOptions.map((option) => (
                              <CommandItem
                                key={option.value}
                                value={option.value}
                                onSelect={(currentValue) => {
                                  setStatusFilter(prev => 
                                    prev.includes(currentValue)
                                      ? prev.filter(item => item !== currentValue)
                                      : [...prev, currentValue]
                                  )
                                }}
                                className="pl-3 pr-8"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    statusFilter.includes(option.value) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {option.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                        {statusFilter.length > 1 && (
                          <div className="border-t bg-muted/50 p-2 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {statusFilter.length} ausgewählt
                            </span>
                            <button
                              onClick={() => setStatusFilter([])}
                              className="p-1 hover:bg-background rounded"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </button>
                          </div>
                        )}
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Select value={allFilter} onValueChange={setAllFilter}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Nr." />
                  </SelectTrigger>
                     <SelectContent position="popper" align="start" alignOffset={0} sideOffset={4} className="min-w-[110px] w-[110px] z-[60]">
                       <SelectItem value="alle" className="pl-3 pr-8 [&>span:first-child]:hidden">Alle</SelectItem>
                       <SelectItem value="gerade" className="pl-3 pr-8 [&>span:first-child]:hidden">Gerade</SelectItem>
                       <SelectItem value="ungerade" className="pl-3 pr-8 [&>span:first-child]:hidden">Ungerade</SelectItem>
                     </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Address Cards */}
          <div className="px-6 pb-6">
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
