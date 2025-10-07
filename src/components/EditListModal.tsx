import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { ChevronRight, Trash2, Merge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  id: string;
  name: string;
  color: string;
}

interface Laufliste {
  id: string;
  name: string;
  color: string;
  assigned_to: string | null;
  address_count: number;
  unit_count: number;
  factor: number;
}

interface EditListModalProps {
  open: boolean;
  onClose: () => void;
  list: Laufliste;
  onSuccess: () => void;
  onDelete: () => void;
  allLists: Laufliste[];
}

export function EditListModal({ open, onClose, list, onSuccess, onDelete, allLists }: EditListModalProps) {
  const [name, setName] = useState(list.name);
  const [assignToUser, setAssignToUser] = useState(!!list.assigned_to);
  const [selectedUser, setSelectedUser] = useState<string>(list.assigned_to || "");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMergeSection, setShowMergeSection] = useState(false);
  const [selectedListsToMerge, setSelectedListsToMerge] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchProfiles();
      setName(list.name);
      setAssignToUser(!!list.assigned_to);
      setSelectedUser(list.assigned_to || "");
      setShowMergeSection(false);
      setSelectedListsToMerge(new Set());
    }
  }, [open, list]);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    setProfiles(data || []);
  };

  const toggleMergeList = (listId: string) => {
    const newSelected = new Set(selectedListsToMerge);
    if (newSelected.has(listId)) {
      newSelected.delete(listId);
    } else {
      newSelected.add(listId);
    }
    setSelectedListsToMerge(newSelected);
  };

  const handleMerge = async () => {
    if (selectedListsToMerge.size === 0) {
      toast.error('Bitte wählen Sie mindestens eine Liste zum Zusammenführen aus');
      return;
    }

    setLoading(true);

    try {
      const otherListIds = Array.from(selectedListsToMerge);

      // Get all addresses from the lists to be merged
      const { data: addresses, error: fetchError } = await supabase
        .from('lauflisten_addresses')
        .select('*')
        .in('laufliste_id', otherListIds);

      if (fetchError) throw fetchError;

      // Update all addresses to point to the current list
      if (addresses && addresses.length > 0) {
        const { error: updateError } = await supabase
          .from('lauflisten_addresses')
          .update({ laufliste_id: list.id })
          .in('laufliste_id', otherListIds);

        if (updateError) throw updateError;
      }

      // Calculate new counts
      const otherLists = allLists.filter(l => selectedListsToMerge.has(l.id));
      const totalAddresses = list.address_count + otherLists.reduce((sum, l) => sum + l.address_count, 0);
      const totalUnits = list.unit_count + otherLists.reduce((sum, l) => sum + l.unit_count, 0);
      const newFactor = totalAddresses > 0 ? (totalUnits / totalAddresses).toFixed(2) : "0.00";

      // Update the current list's counts
      const { error: listUpdateError } = await supabase
        .from('lauflisten')
        .update({
          address_count: totalAddresses,
          unit_count: totalUnits,
          factor: parseFloat(newFactor),
        })
        .eq('id', list.id);

      if (listUpdateError) throw listUpdateError;

      // Delete the other lists
      const { error: deleteError } = await supabase
        .from('lauflisten')
        .delete()
        .in('id', otherListIds);

      if (deleteError) throw deleteError;

      toast.success('Listen erfolgreich zusammengeführt');
      onSuccess();
    } catch (error) {
      console.error('Error merging lists:', error);
      toast.error('Fehler beim Zusammenführen der Listen');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (assignToUser && !selectedUser) {
      toast.error('Bitte wählen Sie eine Rakete aus');
      return;
    }

    setLoading(true);

    try {
      let finalName = name.trim();
      const wasAssigned = !!list.assigned_to;
      const isNowAssigned = assignToUser && selectedUser;
      const isNowUnassigned = !assignToUser;

      // If removing assignment, generate new "Laufliste X" name
      if (wasAssigned && isNowUnassigned) {
        // Count existing unassigned lists to get next number
        const { data, error } = await supabase
          .from('lauflisten')
          .select('id')
          .is('assigned_to', null);

        if (error) {
          console.error('Error counting unassigned lists:', error);
        } else {
          const count = (data?.length || 0) + 1;
          finalName = `Laufliste ${count}`;
        }
      }

      // If assigning to user (or changing user), generate new user-based name
      if ((!wasAssigned || list.assigned_to !== selectedUser) && isNowAssigned) {
        const profile = profiles.find(p => p.id === selectedUser);
        if (profile) {
          // Count existing lists for this user to get next number
          const { data, error } = await supabase
            .from('lauflisten')
            .select('id')
            .eq('assigned_to', selectedUser);

          if (error) {
            console.error('Error counting user lists:', error);
          } else {
            const count = (data?.length || 0) + 1;
            finalName = `${profile.name} ${count}`;
          }
        }
      }

      const { error } = await supabase
        .from('lauflisten')
        .update({
          name: finalName,
          assigned_to: assignToUser ? selectedUser : null,
        })
        .eq('id', list.id);

      if (error) throw error;

      toast.success('Laufliste aktualisiert');
      onSuccess();
    } catch (error) {
      console.error('Error updating list:', error);
      toast.error('Fehler beim Aktualisieren der Laufliste');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Laufliste bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{list.address_count}</div>
              <div className="text-sm text-muted-foreground">Adressen</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{list.unit_count}</div>
              <div className="text-sm text-muted-foreground">Wohneinheiten</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{list.factor}</div>
              <div className="text-sm text-muted-foreground">Faktor</div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="list-name">Name der Liste</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Jakob Burkart 1"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Name wird automatisch basierend auf Zuweisung gesetzt
            </p>
          </div>

          {/* Assign to User */}
          <div className="flex items-center justify-between">
            <Label htmlFor="assign-user">An Rakete zuweisen</Label>
            <Switch
              id="assign-user"
              checked={assignToUser}
              onCheckedChange={setAssignToUser}
            />
          </div>

          {/* User Selection */}
          {assignToUser && (
            <div className="space-y-2">
              <Label htmlFor="user-select">Rakete auswählen</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger id="user-select" className="w-full justify-between h-9 bg-background font-normal border border-border focus-visible:ring-0 focus-visible:border-border [&>svg]:hidden">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-muted-foreground text-sm">
                      {selectedUser 
                        ? profiles.find(p => p.id === selectedUser)?.name 
                        : "Rakete wählen..."}
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-50 flex-shrink-0" />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[1003] bg-background">
                  {profiles.map((profile) => {
                    const initials = profile.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    
                    return (
                      <SelectItem key={profile.id} value={profile.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback 
                              className="text-xs font-medium"
                              style={{ backgroundColor: profile.color, color: 'white' }}
                            >
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          {profile.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Merge Lists Section */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowMergeSection(!showMergeSection)}
            >
              <Merge className="h-4 w-4" />
              {showMergeSection ? 'Zusammenführen abbrechen' : 'Mit anderen Listen zusammenführen'}
            </Button>

            {showMergeSection && (
              <div className="space-y-2 p-4 border rounded-lg">
                <div className="text-sm font-medium text-foreground mb-2">
                  Listen zum Zusammenführen auswählen
                </div>
                <ScrollArea className="max-h-40">
                  <div className="space-y-2">
                    {allLists
                      .filter(l => l.id !== list.id)
                      .map((otherList) => (
                        <div key={otherList.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedListsToMerge.has(otherList.id)}
                            onCheckedChange={() => toggleMergeList(otherList.id)}
                          />
                          <div className="flex-1 flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: otherList.color }}
                            />
                            <span className="text-sm">{otherList.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({otherList.address_count} Adressen)
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
                {selectedListsToMerge.size > 0 && (
                  <Button
                    className="w-full mt-2"
                    onClick={handleMerge}
                    disabled={loading}
                  >
                    {loading ? 'Führt zusammen...' : `${selectedListsToMerge.size} Liste(n) zusammenführen`}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Delete Button */}
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
            Liste löschen
          </Button>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? 'Speichert...' : 'Speichern'}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
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
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete();
                onClose();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
