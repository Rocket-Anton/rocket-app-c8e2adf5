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
import { supabase } from "@/integrations/supabase/client";
import { MapPin, User, ChevronDown, Edit2, Trash2, Merge } from "lucide-react";
import { toast } from "sonner";
import { EditListModal } from "./EditListModal";

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
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [editingList, setEditingList] = useState<Laufliste | null>(null);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);

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

  const toggleList = (listId: string) => {
    const newExpanded = new Set(expandedLists);
    if (newExpanded.has(listId)) {
      newExpanded.delete(listId);
    } else {
      newExpanded.add(listId);
    }
    setExpandedLists(newExpanded);
  };

  const toggleSelectList = (listId: string) => {
    const newSelected = new Set(selectedLists);
    if (newSelected.has(listId)) {
      newSelected.delete(listId);
    } else {
      newSelected.add(listId);
    }
    setSelectedLists(newSelected);
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
    } catch (error) {
      console.error('Error merging lists:', error);
      toast.error('Fehler beim Zusammenführen der Listen');
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Lauflisten</SheetTitle>
              {selectedLists.size > 1 && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setShowMergeConfirm(true)}
                  className="gap-2"
                >
                  <Merge className="h-4 w-4" />
                  Zusammenführen ({selectedLists.size})
                </Button>
              )}
            </div>
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
            <div className="space-y-3">
              {lists.map((list) => (
                <Collapsible
                  key={list.id}
                  open={expandedLists.has(list.id)}
                  onOpenChange={() => toggleList(list.id)}
                >
                  <div
                    className="rounded-lg border border-border bg-card"
                    style={{ borderLeftWidth: '4px', borderLeftColor: list.color }}
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Checkbox
                          checked={selectedLists.has(list.id)}
                          onCheckedChange={() => toggleSelectList(list.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <CollapsibleTrigger className="flex items-center justify-between flex-1 group">
                          <h3 className="font-semibold text-foreground">{list.name}</h3>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded-full border-2 border-background"
                              style={{ backgroundColor: list.color }}
                            />
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                          </div>
                        </CollapsibleTrigger>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
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
                    </div>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        {list.profiles && (
                          <div className="flex items-center gap-2">
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

                        <div>
                          <Badge variant="outline" className="text-xs">
                            {new Date(list.created_at).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </Badge>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => setEditingList(list)}
                          >
                            <Edit2 className="h-3 w-3" />
                            Bearbeiten
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-2 text-destructive hover:text-destructive"
                            onClick={() => setDeletingListId(list.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Löschen
                          </Button>
                        </div>
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
        onSuccess={() => {
          setEditingList(null);
          fetchLists();
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
  </>
  );
}
