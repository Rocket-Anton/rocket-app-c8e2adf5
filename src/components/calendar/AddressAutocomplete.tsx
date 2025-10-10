import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, X } from 'lucide-react';
import { useAddressSearch, AddressSearchResult } from '@/hooks/useAddressSearch';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  value?: {
    address_id: number;
    unit_id?: string;
    display: string;
  };
  onChange: (value: {
    address_id: number;
    unit_id?: string;
    project_id?: string;
    display: string;
  } | undefined) => void;
  projectFilter?: string[];
  className?: string;
}

export const AddressAutocomplete = ({ value, onChange, projectFilter, className }: AddressAutocompleteProps) => {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: addresses = [], isLoading } = useAddressSearch(query, projectFilter);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (address: AddressSearchResult, unitId?: string) => {
    const display = `${address.street} ${address.house_number}, ${address.postal_code} ${address.city}${
      address.project_name ? ` (${address.project_name})` : ''
    }${unitId ? ` - Einheit ${unitId}` : ''}`;

    onChange({
      address_id: address.id,
      unit_id: unitId,
      project_id: address.project_id || undefined,
      display
    });

    setQuery(display);
    setShowDropdown(false);
    setSelectedUnitIndex(undefined);
  };

  const handleClear = () => {
    setQuery('');
    onChange(undefined);
    setSelectedUnitIndex(undefined);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setShowDropdown(newQuery.length >= 2);
    
    // Clear selection if query changes
    if (value) {
      onChange(undefined);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative space-y-2", className)}>
      <Label>Adresse</Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          placeholder="Straße, PLZ oder Ort eingeben..."
          className="pl-10 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-muted-foreground">Suche...</div>
          ) : addresses.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              Keine Adressen gefunden
            </div>
          ) : (
            <div className="py-1">
              {addresses.map((address) => (
                <div key={address.id}>
                  {/* Main address row */}
                  <button
                    type="button"
                    onClick={() => {
                      if (address.units && address.units.length > 0) {
                        setSelectedUnitIndex(
                          selectedUnitIndex === address.id ? undefined : address.id
                        );
                      } else {
                        handleSelect(address);
                      }
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                  >
                    <div className="font-medium text-sm">
                      {address.street} {address.house_number}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {address.postal_code} {address.city}
                      {address.project_name && (
                        <span className="ml-2 text-primary">({address.project_name})</span>
                      )}
                    </div>
                    {address.units && address.units.length > 0 && (
                      <div className="text-xs text-blue-600 mt-1">
                        {address.units.length} Einheit(en) verfügbar
                      </div>
                    )}
                  </button>

                  {/* Unit selection (if expanded) */}
                  {selectedUnitIndex === address.id && address.units && address.units.length > 0 && (
                    <div className="bg-muted/50 border-t">
                      {address.units.map((unit) => (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => handleSelect(address, unit.id)}
                          className="w-full px-6 py-2 text-left hover:bg-accent/70 transition-colors text-sm"
                        >
                          Einheit {unit.id}
                          {unit.etage && ` - ${unit.etage}`}
                          {unit.lage && ` (${unit.lage})`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
