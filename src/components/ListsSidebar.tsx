import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, User, ChevronDown, Edit2, Trash2, Merge, Trash, Search, ArrowUpDown, X, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { EditListModal } from "./EditListModal";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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

interface ListStatusCounts {
  [key: string]: {
    [status: string]: number;
  };
}

interface ListsSidebarProps {
  open: boolean;
  onClose: () => void;
  onListExpanded: (listIds: string[]) => void;
}

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

type SortOption = 'newest' | 'oldest' | 'size-asc' | 'size-desc';

export function ListsSidebar({ open, onClose, onListExpanded }: ListsSidebarProps) {
  const isMobile = useIsMobile();
  const [lists, setLists] = useState<Laufliste[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [editingList, setEditingList] = useState<Laufliste | null>(null);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [statusCounts, setStatusCounts] = useState<ListStatusCounts>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  useEffect(() => {
    if (open) {
      fetchLists();
      fetchStatusCounts();
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

  const fetchStatusCounts = async () => {
    const { data, error } = await supabase
      .from('lauflisten_addresses')
      .select('laufliste_id, addresses!inner(units)');

    if (error) {
      console.error('Error fetching status counts:', error);
      return;
    }

    // Calculate status counts for each list
    const counts: ListStatusCounts = {};
    data?.forEach((item) => {
      const listId = item.laufliste_id;
      if (!counts[listId]) {
        counts[listId] = {};
      }

      const units = (item.addresses as any)?.units as any[];
      if (units) {
        units.forEach((unit: any) => {
          const status = unit.status;
          counts[listId][status] = (counts[listId][status] || 0) + 1;
        });
      }
    });

    setStatusCounts(counts);
  };

  const toggleList = (listId: string) => {
    const newExpanded = new Set(expandedLists);
    const wasExpanded = newExpanded.has(listId);
    
    const newSelected = new Set(selectedLists);
    if (wasExpanded) {
      // Collapsing the list - remove from expanded and deselect
      newExpanded.delete(listId);
      newSelected.delete(listId);
    } else {
      // Expanding the list - add to expanded and select
      newExpanded.add(listId);
      newSelected.add(listId);
    }

    setExpandedLists(newExpanded);
    setSelectedLists(newSelected);
    onListExpanded(Array.from(newSelected));
  };

  const toggleSelectList = (listId: string) => {
    const newSelected = new Set(selectedLists);
    if (newSelected.has(listId)) {
      newSelected.delete(listId);
    } else {
      newSelected.add(listId);
    }
    setSelectedLists(newSelected);
    onListExpanded(Array.from(newSelected));
  };

  const handleDeleteList = async (listId: string) => {
    try {
      // Delete all address assignments for this list
      const { error: deleteError } = await supabase
        .from('lauflisten_addresses')
        .delete()
        .eq('laufliste_id', listId);

      if (deleteError) throw deleteError;

      // Delete the list itself
      const { error: listError } = await supabase
        .from('lauflisten')
        .delete()
        .eq('id', listId);

      if (listError) throw listError;

      toast.success('Laufliste gelöscht');
      fetchLists();
      fetchStatusCounts();
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error('Fehler beim Löschen der Laufliste');
    } finally {
      setDeletingListId(null);
    }
  };

  const handleMergeLists = async () => {
    if (selectedLists.size < 2) {
      toast.error('Bitte wählen Sie mindestens 2 Listen aus');
      return;
    }

    try {
      const selectedListsArray = Array.from(selectedLists);
      const primaryListId = selectedListsArray[0];
      const otherListIds = selectedListsArray.slice(1);

      // Get all addresses from the lists to be merged
      const { data: addresses, error: fetchError } = await supabase
        .from('lauflisten_addresses')
        .select('*')
        .in('laufliste_id', otherListIds);

      if (fetchError) throw fetchError;

      // Update all addresses to point to the primary list
      if (addresses && addresses.length > 0) {
        const { error: updateError } = await supabase
          .from('lauflisten_addresses')
          .update({ laufliste_id: primaryListId })
          .in('laufliste_id', otherListIds);

        if (updateError) throw updateError;
      }

      // Update the primary list's counts
      const primaryList = lists.find(l => l.id === primaryListId);
      const mergedLists = lists.filter(l => selectedLists.has(l.id));
      const totalAddresses = mergedLists.reduce((sum, l) => sum + l.address_count, 0);
      const totalUnits = mergedLists.reduce((sum, l) => sum + l.unit_count, 0);
      const newFactor = totalAddresses > 0 ? (totalUnits / totalAddresses).toFixed(2) : "0.00";

      const { error: listUpdateError } = await supabase
        .from('lauflisten')
        .update({
          address_count: totalAddresses,
          unit_count: totalUnits,
          factor: parseFloat(newFactor),
        })
        .eq('id', primaryListId);

      if (listUpdateError) throw listUpdateError;

      // Delete the other lists
      const { error: deleteError } = await supabase
        .from('lauflisten')
        .delete()
        .in('id', otherListIds);

      if (deleteError) throw deleteError;

      toast.success('Listen erfolgreich zusammengeführt');
      setSelectedLists(new Set());
      setShowMergeConfirm(false);
      fetchLists();
      fetchStatusCounts();
    } catch (error) {
      console.error('Error merging lists:', error);
      toast.error('Fehler beim Zusammenführen der Listen');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLists.size === 0) return;

    try {
      const selectedListsArray = Array.from(selectedLists);

      // Delete all address assignments for these lists
      const { error: deleteAddressesError } = await supabase
        .from('lauflisten_addresses')
        .delete()
        .in('laufliste_id', selectedListsArray);

      if (deleteAddressesError) throw deleteAddressesError;

      // Delete the lists
      const { error: deleteListsError } = await supabase
        .from('lauflisten')
        .delete()
        .in('id', selectedListsArray);

      if (deleteListsError) throw deleteListsError;

      toast.success(`${selectedLists.size} Lauflisten gelöscht`);
      setSelectedLists(new Set());
      setShowBulkDeleteConfirm(false);
      fetchLists();
      fetchStatusCounts();
    } catch (error) {
      console.error('Error deleting lists:', error);
      toast.error('Fehler beim Löschen der Lauflisten');
    }
  };

  const getFilteredAndSortedLists = () => {
    let filtered = lists;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(list => 
        list.name.toLowerCase().includes(query) ||
        list.profiles?.name.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'size-asc':
        sorted.sort((a, b) => a.address_count - b.address_count);
        break;
      case 'size-desc':
        sorted.sort((a, b) => b.address_count - a.address_count);
        break;
    }

    return sorted;
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'newest': return 'Neueste';
      case 'oldest': return 'Älteste';
      case 'size-asc': return 'Größe ↑';
      case 'size-desc': return 'Größe ↓';
    }
  };

  const handleSelectAll = () => {
    const filtered = getFilteredAndSortedLists();
    const allIds = filtered.map(l => l.id);
    const newSet = new Set(allIds);
    setSelectedLists(newSet);
    setExpandedLists(newSet); // Also expand all lists
    onListExpanded(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedLists(new Set());
    setExpandedLists(new Set()); // Also collapse all lists
    onListExpanded([]);
  };

  const toggleSelectAll = () => {
    const filtered = getFilteredAndSortedLists();
    if (selectedLists.size === filtered.length) {
      setSelectedLists(new Set());
      setExpandedLists(new Set()); // Collapse all
      onListExpanded([]);
    } else {
      const allIds = filtered.map(l => l.id);
      setSelectedLists(new Set(allIds));
      setExpandedLists(new Set(allIds)); // Expand all
      onListExpanded(allIds);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(openState) => { if (!openState) onClose(); }} modal={isMobile}>
        <SheetContent 
          side={isMobile ? "bottom" : "right"}
          className={cn(
            isMobile 
              ? "h-[60vh] w-full rounded-t-2xl" 
              : "w-[320px] sm:w-[380px] md:fixed md:right-0 md:top-0 md:h-full md:z-50"
          )}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <div className="flex items-center justify-between gap-4">
              <SheetTitle>Lauflisten ({lists.length})</SheetTitle>
              <div className="flex items-center gap-1">
                {selectedLists.size >= 2 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowMergeConfirm(true)}
                    className="h-9 w-9 text-primary hover:text-primary hover:bg-primary/10 transition-opacity"
                    title={`Zusammenführen (${selectedLists.size})`}
                  >
                    <Merge className="h-5 w-5" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className={cn(
                    "h-9 w-9 mr-6 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity",
                    selectedLists.size >= 1 ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                  title={selectedLists.size >= 1 ? `Löschen (${selectedLists.size})` : ''}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Search and Sort */}
            <div className="flex items-center gap-2 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Listen durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 border-border focus:border-foreground/30 bg-muted/20 focus:bg-muted/30 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 shrink-0">
                    <ArrowUpDown className="h-4 w-4" />
                    {getSortLabel()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuItem onClick={() => setSortBy('newest')}>
                    Neueste zuerst
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                    Älteste zuerst
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('size-asc')}>
                    Kleinste zuerst
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('size-desc')}>
                    Größte zuerst
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSelectAll} className="gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Alle auswählen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeselectAll} className="gap-2">
                    <Square className="h-4 w-4" />
                    Alle abwählen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center justify-end text-[11px] text-muted-foreground mt-0.5 px-1 min-h-[16px]">
              {selectedLists.size > 0 && (
                <button 
                  onClick={toggleSelectAll} 
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  {selectedLists.size === getFilteredAndSortedLists().length ? 'Aufheben' : 'Alle'}
                </button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className={cn(
            "mt-3",
            isMobile ? "h-[calc(60vh-160px)]" : "h-[calc(100vh-160px)]"
          )}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
              </div>
              <div className="text-sm text-muted-foreground">Lauflisten werden geladen...</div>
            </div>
          ) : lists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Noch keine Lauflisten erstellt</p>
              <p className="text-sm text-muted-foreground mt-2">
                Zeichnen Sie ein Polygon auf der Karte, um eine Liste zu erstellen
              </p>
            </div>
          ) : getFilteredAndSortedLists().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine Listen gefunden</p>
              <p className="text-sm text-muted-foreground mt-2">
                Versuchen Sie eine andere Suche
              </p>
            </div>
          ) : (
            <div className={cn(
              isMobile 
                ? "flex gap-3 overflow-x-auto pb-3" 
                : "space-y-3"
            )}>
              {getFilteredAndSortedLists().map((list) => (
                <Collapsible
                  key={list.id}
                  open={expandedLists.has(list.id)}
                  onOpenChange={() => toggleList(list.id)}
                >
                  <div
                    className={cn(
                      "rounded-lg border bg-card transition-all duration-200",
                      isMobile && "min-w-[280px] flex-shrink-0",
                      expandedLists.has(list.id) 
                        ? "border-l-4 shadow-lg bg-primary/10 ring-2 ring-primary/20" 
                        : "border-l-4 hover:shadow-sm hover:bg-muted/20"
                    )}
                    style={{ borderLeftColor: list.color }}
                  >
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={selectedLists.has(list.id)}
                          onCheckedChange={() => toggleSelectList(list.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <CollapsibleTrigger className="flex items-center justify-between flex-1 group">
                          <h3 className="font-semibold text-sm text-foreground">{list.name}</h3>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingList(list);
                              }}
                            >
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                          </div>
                        </CollapsibleTrigger>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <div className="text-base font-bold text-foreground">{list.address_count}</div>
                          <div className="text-[10px] text-muted-foreground">Adressen</div>
                        </div>
                        <div className="text-center">
                          <div className="text-base font-bold text-foreground">{list.unit_count}</div>
                          <div className="text-[10px] text-muted-foreground">Einheiten</div>
                        </div>
                        <div className="text-center">
                          <div className="text-base font-bold text-foreground">{list.factor}</div>
                          <div className="text-[10px] text-muted-foreground">Faktor</div>
                        </div>
                      </div>
                    </div>

                    <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                      <div className="px-3 pb-3 border-t border-border pt-2">
                        {/* Status Distribution */}
                        {statusCounts[list.id] && Object.keys(statusCounts[list.id]).length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-foreground mb-1">Statusverteilung</div>
                            <div className="max-h-[120px] overflow-y-auto space-y-0 pr-1"
                              style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'hsl(var(--muted-foreground)) transparent'
                              }}
                            >
                              {Object.entries(statusCounts[list.id])
                                .sort(([, a], [, b]) => b - a)
                                .map(([status, count], index) => {
                                  const totalUnits = list.unit_count;
                                  const percentage = totalUnits > 0 ? ((count / totalUnits) * 100).toFixed(0) : "0";
                                  const statusColor = statusColors[status] || "#6b7280";
                                  return (
                                    <div 
                                      key={status} 
                                      className={cn(
                                        "grid grid-cols-[1fr_2rem_2rem] gap-2 items-center text-[11px] px-2 py-0.5 transition-colors",
                                        index % 2 === 1 && "bg-muted/30",
                                        "hover:bg-muted/50"
                                      )}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-2 h-2 rounded-full flex-shrink-0"
                                          style={{ backgroundColor: statusColor }}
                                        />
                                        <span className="text-foreground capitalize">
                                          {status.replace('-', ' ')}
                                        </span>
                                      </div>
                                      <span className="font-semibold text-foreground text-left">{count}</span>
                                      <span className="font-semibold text-foreground text-left">{percentage}%</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>

    {/* Edit List Modal */}
    {editingList && (
      <EditListModal
        open={!!editingList}
        onClose={() => setEditingList(null)}
        list={editingList}
        allLists={lists}
        onSuccess={() => {
          setEditingList(null);
          fetchLists();
          fetchStatusCounts();
        }}
        onDelete={() => {
          setDeletingListId(editingList.id);
          setEditingList(null);
        }}
      />
    )}

    {/* Delete Confirmation */}
    <AlertDialog open={!!deletingListId} onOpenChange={() => setDeletingListId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Laufliste löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Alle Adressen werden aus dieser Liste entfernt. Die Adressen selbst bleiben erhalten und können erneut zugewiesen werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deletingListId && handleDeleteList(deletingListId)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Merge Confirmation */}
    <AlertDialog open={showMergeConfirm} onOpenChange={setShowMergeConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Listen zusammenführen?</AlertDialogTitle>
          <AlertDialogDescription>
            Alle ausgewählten Listen werden zur ersten ausgewählten Liste hinzugefügt. Die anderen Listen werden gelöscht.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={handleMergeLists}>
            Zusammenführen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Bulk Delete Confirmation */}
    <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{selectedLists.size} Lauflisten löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Alle Adressen werden aus diesen Listen entfernt. Die Adressen selbst bleiben erhalten und können erneut zugewiesen werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBulkDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
