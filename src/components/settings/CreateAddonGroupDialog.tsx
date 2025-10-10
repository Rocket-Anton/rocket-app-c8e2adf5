import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X } from "lucide-react";

interface CreateAddonGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  onGroupCreated: (groupId: string) => void;
}

export const CreateAddonGroupDialog = ({ 
  open, 
  onOpenChange, 
  providerId,
  onGroupCreated 
}: CreateAddonGroupDialogProps) => {
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());

  // Fetch active addons for this provider
  const { data: addons = [] } = useQuery({
    queryKey: ['provider-addons', providerId],
    queryFn: async () => {
      if (!providerId) return [];
      
      const { data, error } = await supabase
        .from("addons")
        .select(`
          id,
          name,
          addon_group_id,
          addon_groups:addon_group_id(name)
        `)
        .eq("provider_id", providerId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!providerId && open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName.trim()) {
      toast.error("Bitte gib einen Gruppennamen ein");
      return;
    }

    try {
      // Create the group
      const { data: newGroup, error: groupError } = await supabase
        .from("addon_groups")
        .insert({
          name: groupName.trim(),
          provider_id: providerId,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (groupError) {
        if (groupError.code === '23505') {
          toast.error("Eine Gruppe mit diesem Namen existiert bereits für diesen Provider");
        } else {
          throw groupError;
        }
        return;
      }

      // Update selected addons to belong to this group
      if (selectedAddons.size > 0) {
        const { error: updateError } = await supabase
          .from("addons")
          .update({ addon_group_id: newGroup.id })
          .in("id", Array.from(selectedAddons));

        if (updateError) throw updateError;
      }

      toast.success(`Gruppe "${groupName}" erfolgreich erstellt`);
      queryClient.invalidateQueries({ queryKey: ['addon-groups'] });
      queryClient.invalidateQueries({ queryKey: ['provider-addons'] });
      queryClient.invalidateQueries({ queryKey: ['addons'] });
      
      onGroupCreated(newGroup.id);
      setGroupName("");
      setSelectedAddons(new Set());
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Fehler beim Erstellen der Gruppe");
    }
  };

  const toggleAddon = (addonId: string) => {
    const newSelected = new Set(selectedAddons);
    if (newSelected.has(addonId)) {
      newSelected.delete(addonId);
    } else {
      newSelected.add(addonId);
    }
    setSelectedAddons(newSelected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Neue Einzeloption-Gruppe erstellen</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="group-name">Gruppenname *</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="z.B. Router, TV-Pakete, Modem"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Zusätze in dieser Gruppe schließen sich gegenseitig aus
            </p>
          </div>

          <div>
            <Label>Zusätze zur Gruppe hinzufügen (optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Wähle Zusätze aus, die Teil dieser Gruppe sein sollen
            </p>
            
            <div className="border rounded-md max-h-64 overflow-y-auto">
              {addons.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Keine aktiven Zusätze für diesen Provider vorhanden
                </div>
              ) : (
                <div className="divide-y">
                  {addons.map((addon) => {
                    const isSelected = selectedAddons.has(addon.id);
                    const currentGroup = addon.addon_groups?.name;
                    
                    return (
                      <div
                        key={addon.id}
                        className={`p-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => toggleAddon(addon.id)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{addon.name}</p>
                            {currentGroup && (
                              <p className="text-xs text-muted-foreground">
                                Aktuell in Gruppe: {currentGroup}
                                {isSelected && " → wird gewechselt"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedAddons.size > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from(selectedAddons).map((addonId) => {
                  const addon = addons.find(a => a.id === addonId);
                  if (!addon) return null;
                  
                  return (
                    <Badge key={addonId} variant="secondary" className="gap-1">
                      {addon.name}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAddon(addonId);
                        }}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit">Gruppe erstellen</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
