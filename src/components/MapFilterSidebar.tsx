import { useState, useRef, useLayoutEffect, useCallback } from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const statusOptions = [
  { value: "offen", label: "Offen", color: "#6b7280" },
  { value: "nicht-angetroffen", label: "Nicht angetroffen", color: "#eab308" },
  { value: "karte-eingeworfen", label: "Karte eingeworfen", color: "#f59e0b" },
  { value: "potenzial", label: "Potenzial", color: "#22c55e" },
  { value: "neukunde", label: "Neukunde", color: "#3b82f6" },
  { value: "bestandskunde", label: "Bestandskunde", color: "#10b981" },
  { value: "kein-interesse", label: "Kein Interesse", color: "#ef4444" },
  { value: "termin", label: "Termin", color: "#a855f7" },
  { value: "nicht-vorhanden", label: "Nicht vorhanden", color: "#9ca3af" },
  { value: "gewerbe", label: "Gewerbe", color: "#f97316" },
];

interface MapFilterSidebarProps {
  open: boolean;
  onClose: () => void;
  statusFilter: string[];
  setStatusFilter: (statuses: string[]) => void;
  streetFilter: string;
  setStreetFilter: (street: string) => void;
  cityFilter: string;
  setCityFilter: (city: string) => void;
  postalCodeFilter: string;
  setPostalCodeFilter: (code: string) => void;
  houseNumberFilter: string;
  setHouseNumberFilter: (number: string) => void;
  uniqueStreets: string[];
  uniqueCities: string[];
  uniquePostalCodes: string[];
  addresses: any[];
}

export function MapFilterSidebar({
  open,
  onClose,
  statusFilter,
  setStatusFilter,
  streetFilter,
  setStreetFilter,
  cityFilter,
  setCityFilter,
  postalCodeFilter,
  setPostalCodeFilter,
  houseNumberFilter,
  setHouseNumberFilter,
  uniqueStreets,
  uniqueCities,
  uniquePostalCodes,
  addresses,
}: MapFilterSidebarProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [streetInput, setStreetInput] = useState(streetFilter);
  const [cityInput, setCityInput] = useState(cityFilter);
  const [postalCodeInput, setPostalCodeInput] = useState(postalCodeFilter);
  const [sortierung, setSortierung] = useState("alle");
  const [lastModifiedDate, setLastModifiedDate] = useState<Date | undefined>(undefined);
  const [dateFilterMode, setDateFilterMode] = useState<"" | "vor" | "nach">("");
  const [dateFilterType, setDateFilterType] = useState<"quick" | "custom" | "">("quick");
  const [quickDateOption, setQuickDateOption] = useState<string>("");
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Get available house numbers for selected street
  const availableHouseNumbers = streetFilter
    ? addresses
        .filter(a => a.street === streetFilter)
        .map(a => a.houseNumber)
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort((a, b) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
          return numA - numB;
        })
    : [];

  const handleClearFilters = () => {
    setStatusFilter([]);
    setStreetFilter("");
    setCityFilter("");
    setPostalCodeFilter("");
    setHouseNumberFilter("");
    setStreetInput("");
    setCityInput("");
    setPostalCodeInput("");
    setSortierung("alle");
    setLastModifiedDate(undefined);
    setQuickDateOption("");
    setDateFilterType("quick");
    setDateFilterMode("");
  };

  const activeFilterCount = 
    statusFilter.length + 
    (streetFilter ? 1 : 0) + 
    (cityFilter ? 1 : 0) + 
    (postalCodeFilter ? 1 : 0) + 
    (houseNumberFilter && houseNumberFilter !== "alle" ? 1 : 0) +
    (sortierung !== "alle" ? 1 : 0) +
    (lastModifiedDate ? 1 : 0);

  if (!open) return null;

  return (
    <div 
      ref={sidebarRef}
      className="fixed right-4 top-20 w-80 bg-background border rounded-lg shadow-lg z-40 animate-in slide-in-from-right-4 fade-in duration-300 max-h-[calc(100vh-100px)] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Filter</h3>
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {activeFilterCount}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-transparent"
            >
              Zurücksetzen
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
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
                  <span className={cn(
                    "text-sm",
                    statusFilter.length === 0 ? "text-muted-foreground" : ""
                  )}>
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
              
              <PopoverPrimitive.Portal container={sidebarRef.current ?? undefined}>
                <PopoverContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  avoidCollisions={false}
                  collisionPadding={8}
                  className="p-0 bg-background border border-border rounded-md shadow-md z-[10001]"
                  style={{ 
                    width: "var(--radix-popover-trigger-width)",
                    maxHeight: "min(var(--radix-popper-available-height, 300px), 300px)"
                  }}
                >
                  <div className="max-h-[300px] overflow-y-auto p-1">
                    {statusOptions.map((status) => (
                      <div
                        key={status.value}
                        onClick={() => {
                          setStatusFilter(
                            statusFilter.includes(status.value)
                              ? statusFilter.filter((s) => s !== status.value)
                              : [...statusFilter, status.value]
                          );
                        }}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted rounded-sm"
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="flex-1 text-sm">{status.label}</span>
                        <Check
                          className={cn(
                            "h-4 w-4",
                            statusFilter.includes(status.value)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </PopoverPrimitive.Portal>
            </Popover>
          </div>
        </div>

        {/* Street Filter */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Straße</label>
          <div className="relative">
            <Input
              placeholder="Straße eingeben..."
              value={streetInput}
              onChange={(e) => setStreetInput(e.target.value)}
              onBlur={() => setStreetFilter(streetInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setStreetFilter(streetInput);
                }
              }}
              list="street-suggestions-map"
              className="h-9 text-sm"
            />
            <datalist id="street-suggestions-map">
              {uniqueStreets.map((street) => (
                <option key={street} value={street} />
              ))}
            </datalist>
            {streetFilter && (
              <button
                onClick={() => {
                  setStreetFilter("");
                  setStreetInput("");
                  setHouseNumberFilter("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* House Number Filter - only show when street is selected */}
        {streetFilter && availableHouseNumbers.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Hausnummer</label>
            <Select
              value={houseNumberFilter || "alle"}
              onValueChange={setHouseNumberFilter}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Hausnummer wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Hausnummern</SelectItem>
                {availableHouseNumbers.map((number) => (
                  <SelectItem key={number} value={number}>
                    {number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Postal Code Filter */}
        <div className="space-y-1">
          <label className="text-sm font-medium">PLZ</label>
          <div className="relative">
            <Input
              placeholder="PLZ eingeben..."
              value={postalCodeInput}
              onChange={(e) => setPostalCodeInput(e.target.value)}
              onBlur={() => setPostalCodeFilter(postalCodeInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPostalCodeFilter(postalCodeInput);
                }
              }}
              list="postal-code-suggestions-map"
              className="h-9 text-sm"
            />
            <datalist id="postal-code-suggestions-map">
              {uniquePostalCodes.map((code) => (
                <option key={code} value={code} />
              ))}
            </datalist>
            {postalCodeFilter && (
              <button
                onClick={() => {
                  setPostalCodeFilter("");
                  setPostalCodeInput("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* City Filter */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Stadt</label>
          <div className="relative">
            <Input
              placeholder="Stadt eingeben..."
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onBlur={() => setCityFilter(cityInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setCityFilter(cityInput);
                }
              }}
              list="city-suggestions-map"
              className="h-9 text-sm"
            />
            <datalist id="city-suggestions-map">
              {uniqueCities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
            {cityFilter && (
              <button
                onClick={() => {
                  setCityFilter("");
                  setCityInput("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sortierung */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Sortierung</label>
          <Select value={sortierung} onValueChange={setSortierung}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Sortierung wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Hausnummern</SelectItem>
              <SelectItem value="gerade">Gerade Hausnummern</SelectItem>
              <SelectItem value="ungerade">Ungerade Hausnummern</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Last Qualification Date */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Letzte Qualifizierung</label>
          <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-9 justify-start text-left font-normal text-sm"
              >
                {lastModifiedDate ? (
                  <span>
                    {dateFilterMode === "vor" ? "Vor " : "Nach "}
                    {format(lastModifiedDate, "dd.MM.yyyy", { locale: de })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Datum wählen</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant={dateFilterMode === "vor" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilterMode("vor")}
                    className="flex-1"
                  >
                    Vor
                  </Button>
                  <Button
                    variant={dateFilterMode === "nach" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilterMode("nach")}
                    className="flex-1"
                  >
                    Nach
                  </Button>
                </div>
                {dateFilterMode && (
                  <Calendar
                    mode="single"
                    selected={lastModifiedDate}
                    onSelect={(date) => {
                      setLastModifiedDate(date);
                      setDateFilterOpen(false);
                    }}
                    locale={de}
                  />
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
