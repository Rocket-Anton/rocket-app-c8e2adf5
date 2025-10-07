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
  { value: "offen", label: "Offen", color: "bg-gray-500 text-white" },
  { value: "nicht-angetroffen", label: "Nicht angetroffen", color: "bg-yellow-500 text-white" },
  { value: "karte-eingeworfen", label: "Karte eingeworfen", color: "bg-amber-500 text-white" },
  { value: "potenzial", label: "Potenzial", color: "bg-green-500 text-white" },
  { value: "neukunde", label: "Neukunde", color: "bg-blue-500 text-white" },
  { value: "bestandskunde", label: "Bestandskunde", color: "bg-emerald-500 text-white" },
  { value: "kein-interesse", label: "Kein Interesse", color: "bg-red-500 text-white" },
  { value: "termin", label: "Termin", color: "bg-purple-500 text-white" },
  { value: "nicht-vorhanden", label: "Nicht vorhanden", color: "bg-gray-400 text-white" },
  { value: "gewerbe", label: "Gewerbe", color: "bg-orange-500 text-white" },
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
                  <div
                    role="listbox"
                    aria-multiselectable
                    className="overflow-y-auto overscroll-contain touch-pan-y"
                    style={{ 
                      maxHeight: "min(300px, var(--radix-popper-available-height, 300px))",
                      WebkitOverflowScrolling: 'touch'
                    }}
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
                          onClick={() => {
                            setStatusFilter(
                              checked 
                                ? statusFilter.filter((s) => s !== option.value) 
                                : [...statusFilter, option.value]
                            );
                          }}
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
            <Select value={sortierung} onValueChange={setSortierung}>
              <SelectTrigger className="bg-background h-9 focus:ring-0 focus-visible:ring-0 focus:border-gray-400">
                <SelectValue>
                  <span className={cn(
                    "text-sm",
                    sortierung === "alle" ? "text-muted-foreground" : ""
                  )}>
                    {sortierung === "alle" ? "Alle" : sortierung === "gerade" ? "Gerade" : "Ungerade"}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent side="bottom" className="bg-background z-[10000]">
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
            <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start h-9 font-normal bg-background focus-visible:ring-0 focus-visible:border-gray-400 text-left"
                >
                  <span className={cn(
                    "flex-1 text-sm",
                    dateFilterMode === "" ? "text-muted-foreground" : ""
                  )}>
                    {dateFilterMode === "" ? "Zeitraum auswählen" : 
                     lastModifiedDate ? (
                       `${dateFilterMode === "vor" ? "Vor" : "Nach"} ${format(lastModifiedDate, "dd.MM.yyyy", { locale: de })}`
                     ) : (
                       dateFilterMode === "vor" ? "Vor" : "Nach"
                     )}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverPrimitive.Portal container={sidebarRef.current ?? undefined}>
                <PopoverContent 
                  className="w-[var(--radix-popover-trigger-width)] p-0 bg-background z-[10001]" 
                  align="start"
                  side="bottom"
                  sideOffset={4}
                >
                  <div className="py-1">
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

          {/* Date Picker Popover */}
          {dateFilterMode && (
            <Popover open={datePickerOpen} onOpenChange={(open) => {
              setDatePickerOpen(open);
              if (!open && !lastModifiedDate && !quickDateOption) {
                setDateFilterMode("");
              }
            }}>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={lastModifiedDate}
                  onSelect={(date) => {
                    setLastModifiedDate(date);
                    setDatePickerOpen(false);
                  }}
                  locale={de}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Street Filter */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Straße</label>
          <div className="relative">
            <Input
              placeholder="Straße eingeben"
              value={streetInput}
              onChange={(e) => setStreetInput(e.target.value)}
              onBlur={() => setStreetFilter(streetInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setStreetFilter(streetInput);
                }
              }}
              list="street-suggestions-map"
              className="bg-background h-9 pr-8 text-sm focus-visible:ring-0 focus:border-gray-400"
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

        {/* Hausnummer Filter - nur wenn Straße gewählt */}
        {streetFilter && availableHouseNumbers.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Hausnummer</label>
            <div className="relative">
              <Select 
                value={houseNumberFilter || "alle"} 
                onValueChange={setHouseNumberFilter}
              >
                <SelectTrigger className="bg-background h-9 focus:ring-0 focus-visible:ring-0 focus:border-gray-400">
                  <SelectValue placeholder="Hausnummer wählen" />
                </SelectTrigger>
                <SelectContent side="bottom" className="bg-background z-[10000]">
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
        )}

        {/* PLZ Filter */}
        <div className="space-y-1">
          <label className="text-sm font-medium">PLZ</label>
          <div className="relative">
            <Input
              placeholder="PLZ eingeben"
              value={postalCodeInput}
              onChange={(e) => setPostalCodeInput(e.target.value)}
              onBlur={() => setPostalCodeFilter(postalCodeInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPostalCodeFilter(postalCodeInput);
                }
              }}
              list="postal-code-suggestions-map"
              className="bg-background h-9 pr-8 text-sm focus-visible:ring-0 focus:border-gray-400"
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

        {/* Ort Filter */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Ort</label>
          <div className="relative">
            <Input
              placeholder="Ort eingeben"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onBlur={() => setCityFilter(cityInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setCityFilter(cityInput);
                }
              }}
              list="city-suggestions-map"
              className="bg-background h-9 pr-8 text-sm focus-visible:ring-0 focus:border-gray-400"
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
      </div>
    </div>
  );
}
