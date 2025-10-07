import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronRight } from "lucide-react";
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
}

const LIST_COLORS = [
  { value: '#3b82f6', label: 'Blau' },
  { value: '#10b981', label: 'Grün' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#ef4444', label: 'Rot' },
  { value: '#8b5cf6', label: 'Lila' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#14b8a6', label: 'Türkis' },
  { value: '#f97316', label: 'Koralle' },
];

export function EditListModal({ open, onClose, list, onSuccess }: EditListModalProps) {
  const [name, setName] = useState(list.name);
  const [selectedColor, setSelectedColor] = useState(list.color);
  const [assignToUser, setAssignToUser] = useState(!!list.assigned_to);
  const [selectedUser, setSelectedUser] = useState<string>(list.assigned_to || "");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProfiles();
    }
  }, [open]);

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

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }

    if (assignToUser && !selectedUser) {
      toast.error('Bitte wählen Sie eine Rakete aus');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('lauflisten')
        .update({
          name: name.trim(),
          color: selectedColor,
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
              placeholder="z.B. Laufliste 1"
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Farbe</Label>
            <div className="flex gap-2 flex-wrap">
              {LIST_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    selectedColor === color.value
                      ? 'border-foreground scale-110'
                      : 'border-border hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
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
    </Dialog>
  );
}
