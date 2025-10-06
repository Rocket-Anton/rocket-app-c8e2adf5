import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Address {
  id: number;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  coordinates: [number, number];
  units: Array<{
    id: number;
    floor: string;
    position: string;
    status: string;
  }>;
}

interface PolygonStatsPopupProps {
  addresses: Address[];
  onClose: () => void;
  onCreateList: () => void;
  onAddToExisting: () => void;
}

const statusLabels: Record<string, string> = {
  "offen": "Offen",
  "nicht-angetroffen": "Nicht angetroffen",
  "karte-eingeworfen": "Karte eingeworfen",
  "potenzial": "Potenzial",
  "neukunde": "Neukunde",
  "bestandskunde": "Bestandskunde",
  "kein-interesse": "Kein Interesse",
  "termin": "Termin",
  "nicht-vorhanden": "Nicht vorhanden",
  "gewerbe": "Gewerbe"
};

const statusColors: Record<string, string> = {
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

export function PolygonStatsPopup({ addresses, onClose, onCreateList, onAddToExisting }: PolygonStatsPopupProps) {
  // Calculate statistics
  const totalAddresses = addresses.length;
  const totalUnits = addresses.reduce((sum, addr) => sum + addr.units.length, 0);
  const factor = totalAddresses > 0 ? (totalUnits / totalAddresses).toFixed(1) : "0";

  // Count status distribution
  const statusCounts: Record<string, number> = {};
  let neukunden = 0;
  let bestandskunden = 0;

  addresses.forEach(address => {
    address.units.forEach(unit => {
      statusCounts[unit.status] = (statusCounts[unit.status] || 0) + 1;
      if (unit.status === "neukunde") neukunden++;
      if (unit.status === "bestandskunde") bestandskunden++;
    });
  });

  const customerTotal = neukunden + bestandskunden;
  const customerQuote = totalUnits > 0 ? ((customerTotal / totalUnits) * 100).toFixed(1) : "0";

  return (
    <Card className="fixed bottom-6 right-6 w-80 p-4 shadow-2xl z-[1000] bg-background border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Polygon-Auswahl</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator className="mb-4" />

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Adressen</p>
          <p className="text-2xl font-bold text-foreground">{totalAddresses}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Wohneinheiten</p>
          <p className="text-2xl font-bold text-foreground">{totalUnits}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Faktor</p>
          <p className="text-2xl font-bold text-foreground">{factor}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Kunden-Quote</p>
          <p className="text-2xl font-bold text-foreground">{customerQuote}%</p>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Status Distribution */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Status-Verteilung</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {Object.entries(statusCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: statusColors[status] }}
                  />
                  <span className="text-foreground">{statusLabels[status] || status}</span>
                </div>
                <span className="font-semibold text-foreground">{count}</span>
              </div>
            ))}
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Actions */}
      <div className="space-y-2">
        <Button onClick={onCreateList} className="w-full" size="sm">
          Laufliste erstellen
        </Button>
        <Button onClick={onAddToExisting} variant="outline" className="w-full" size="sm">
          Zu Laufliste hinzufügen
        </Button>
        <Button onClick={onClose} variant="ghost" className="w-full" size="sm">
          Abbrechen
        </Button>
      </div>
    </Card>
  );
}
