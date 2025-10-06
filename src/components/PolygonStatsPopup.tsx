import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";

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

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.2))',
          transition: 'all 0.3s ease'
        }}
      />
    </g>
  );
};

export function PolygonStatsPopup({ addresses, onClose, onCreateList, onAddToExisting }: PolygonStatsPopupProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  
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

  // Prepare data for pie chart
  const chartData = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
      color: statusColors[status],
    }));

  return (
    <Card className="fixed bottom-6 right-6 w-96 p-4 shadow-2xl z-[1000] bg-gradient-to-br from-background via-background to-muted/20 border-border backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-foreground">Polygon-Auswahl</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator className="mb-2" />

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Adressen</p>
          <p className="text-xl font-bold text-foreground">{totalAddresses}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Wohneinheiten</p>
          <p className="text-xl font-bold text-foreground">{totalUnits}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Faktor</p>
          <p className="text-xl font-bold text-foreground">{factor}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Kunden-Quote</p>
          <p className="text-xl font-bold text-foreground">{customerQuote}%</p>
        </div>
      </div>

      <Separator className="mb-2" />

      {/* Status Distribution Pie Chart */}
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-foreground mb-3">Status-Verteilung</h4>
        <div className="relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                innerRadius={60}
                outerRadius={85}
                fill="#8884d8"
                dataKey="value"
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
                style={{ cursor: 'pointer' }}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    style={{
                      filter: index === activeIndex ? 'brightness(1.1)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-background/80 backdrop-blur-sm rounded-full w-24 h-24 flex flex-col items-center justify-center shadow-lg">
              <p className="text-2xl font-bold text-foreground">{totalUnits}</p>
              <p className="text-xs text-muted-foreground">WE</p>
            </div>
          </div>
        </div>
      </div>

      <Separator className="mb-2" />

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
