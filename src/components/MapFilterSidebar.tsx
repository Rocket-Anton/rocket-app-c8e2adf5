import { useState } from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";

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
}: MapFilterSidebarProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [streetInput, setStreetInput] = useState(streetFilter);
  const [cityInput, setCityInput] = useState(cityFilter);
  const [postalCodeInput, setPostalCodeInput] = useState(postalCodeFilter);

  const handleClearFilters = () => {
    setStatusFilter([]);
    setStreetFilter("");
    setCityFilter("");
    setPostalCodeFilter("");
    setHouseNumberFilter("");
    setStreetInput("");
    setCityInput("");
    setPostalCodeInput("");
  };

  const hasActiveFilters = statusFilter.length > 0 || streetFilter || cityFilter || postalCodeFilter || houseNumberFilter;

  if (!open) return null;

  return (
    <div className="fixed right-4 top-20 w-80 bg-background border rounded-lg shadow-lg z-40 animate-in slide-in-from-right-4 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Filter</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter Content */}
      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
              >
                <span className="truncate">
                  {statusFilter.length > 0
                    ? `${statusFilter.length} ausgewählt`
                    : "Alle Status"}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Status suchen..." />
                <CommandList>
                  <CommandEmpty>Kein Status gefunden</CommandEmpty>
                  <CommandGroup>
                    {statusOptions.map((status) => (
                      <CommandItem
                        key={status.value}
                        onSelect={() => {
                          setStatusFilter(
                            statusFilter.includes(status.value)
                              ? statusFilter.filter((s) => s !== status.value)
                              : [...statusFilter, status.value]
                          );
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: status.color }}
                          />
                          <span>{status.label}</span>
                        </div>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            statusFilter.includes(status.value)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Street Filter */}
        <div className="space-y-2">
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
              list="street-suggestions"
            />
            <datalist id="street-suggestions">
              {uniqueStreets.map((street) => (
                <option key={street} value={street} />
              ))}
            </datalist>
            {streetFilter && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => {
                  setStreetFilter("");
                  setStreetInput("");
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* House Number Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Hausnummer</label>
          <Input
            placeholder="Hausnummer..."
            value={houseNumberFilter}
            onChange={(e) => setHouseNumberFilter(e.target.value)}
          />
        </div>

        {/* Postal Code Filter */}
        <div className="space-y-2">
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
              list="postal-code-suggestions"
            />
            <datalist id="postal-code-suggestions">
              {uniquePostalCodes.map((code) => (
                <option key={code} value={code} />
              ))}
            </datalist>
            {postalCodeFilter && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => {
                  setPostalCodeFilter("");
                  setPostalCodeInput("");
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* City Filter */}
        <div className="space-y-2">
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
              list="city-suggestions"
            />
            <datalist id="city-suggestions">
              {uniqueCities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
            {cityFilter && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => {
                  setCityFilter("");
                  setCityInput("");
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      {hasActiveFilters && (
        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleClearFilters}
          >
            Alle Filter löschen
          </Button>
        </div>
      )}
    </div>
  );
}
