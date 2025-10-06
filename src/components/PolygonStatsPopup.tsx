import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, Tooltip } from "recharts";

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
  
  const midAngle = (startAngle + endAngle) / 2;
  const radian = Math.PI / 180;
  const offsetX = Math.cos(-midAngle * radian) * 4;
  const offsetY = Math.sin(-midAngle * radian) * 4;
  
  return (
    <g>
      <Sector
        cx={cx + offsetX}
        cy={cy + offsetY}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 3}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={6}
        style={{
          filter: 'drop-shadow(0px 4px 10px rgba(0, 0, 0, 0.25))',
          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-foreground text-background px-3 py-1.5 rounded-md shadow-lg text-sm font-medium flex items-center gap-2 relative z-[2000]">
        <div 
          className="w-2 h-2 rounded-full flex-shrink-0" 
          style={{ backgroundColor: payload[0].payload.color }}
        />
        <span>{payload[0].name} • {payload[0].value}</span>
      </div>
    );
  }
  return null;
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
    <Card className="fixed bottom-6 right-6 w-80 p-4 shadow-2xl z-[1000] bg-gradient-to-br from-background via-background to-muted/20 border-border backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-foreground">Polygon-Auswahl</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator className="mb-3" />

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
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

      <Separator className="mb-3" />

      {/* Status Distribution */}
      <h4 className="text-sm font-semibold text-foreground mb-3">Status-Verteilung</h4>

      {/* Status List with Counts and Percentages */}
      <div className="mb-3 max-h-32 overflow-y-auto space-y-0.5">
        {chartData.map((item, index) => {
          const percentage = totalUnits > 0 ? ((item.value / totalUnits) * 100).toFixed(0) : "0";
          return (
            <div 
              key={index} 
              className="grid grid-cols-[1fr_3rem_3rem] gap-2 items-center text-sm hover:bg-muted/50 rounded px-2 py-1 transition-colors"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-foreground">{item.name}</span>
              </div>
              <span className="font-semibold text-foreground text-left">{item.value}</span>
              <span className="font-semibold text-foreground text-left">{percentage}%</span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={onClose} variant="ghost" size="sm" className="flex-shrink-0">
          Abbrechen
        </Button>
        <Button onClick={onAddToExisting} variant="outline" size="sm" className="flex-1">
          Zu Liste
        </Button>
        <Button onClick={onCreateList} size="sm" className="flex-1">
          Neue Liste
        </Button>
      </div>
    </Card>
  );
}
