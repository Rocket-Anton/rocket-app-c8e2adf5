import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, User } from "lucide-react";

interface Laufliste {
  id: string;
  name: string;
  color: string;
  address_count: number;
  unit_count: number;
  factor: number;
  assigned_to: string | null;
  created_at: string;
  profiles: {
    name: string;
    color: string;
  } | null;
}

interface ListsSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function ListsSidebar({ open, onClose }: ListsSidebarProps) {
  const [lists, setLists] = useState<Laufliste[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchLists();
    }
  }, [open]);

  const fetchLists = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('lauflisten')
      .select(`
        *,
        profiles!lauflisten_assigned_to_fkey (
          name,
          color
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lists:', error);
    } else {
      setLists(data || []);
    }

    setLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Lauflisten</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)] mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Lädt...</div>
            </div>
          ) : lists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Noch keine Lauflisten erstellt</p>
              <p className="text-sm text-muted-foreground mt-2">
                Zeichnen Sie ein Polygon auf der Karte, um eine Liste zu erstellen
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                  style={{ borderLeftWidth: '4px', borderLeftColor: list.color }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-foreground">{list.name}</h3>
                    <div
                      className="w-6 h-6 rounded-full border-2 border-background"
                      style={{ backgroundColor: list.color }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{list.address_count}</div>
                      <div className="text-xs text-muted-foreground">Adressen</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{list.unit_count}</div>
                      <div className="text-xs text-muted-foreground">Einheiten</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{list.factor}</div>
                      <div className="text-xs text-muted-foreground">Faktor</div>
                    </div>
                  </div>

                  {list.profiles && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: list.profiles.color }}
                        />
                        <span className="text-sm text-muted-foreground">{list.profiles.name}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {new Date(list.created_at).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
