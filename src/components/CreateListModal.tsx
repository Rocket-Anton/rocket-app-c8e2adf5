import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Address {
  id: number;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  coordinates: [number, number];
  units: Array<{ id: number; floor: string; position: string; status: string }>;
}

interface Profile {
  id: string;
  name: string;
  color: string;
}

interface CreateListModalProps {
  open: boolean;
  onClose: () => void;
  addresses: Address[];
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

export function CreateListModal({ open, onClose, addresses, onSuccess }: CreateListModalProps) {
  const [listName, setListName] = useState("");
  const [assignToUser, setAssignToUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState(LIST_COLORS[0].value);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const totalUnits = addresses.reduce((sum, addr) => sum + addr.units.length, 0);
  const factor = addresses.length > 0 ? (totalUnits / addresses.length).toFixed(2) : "0.00";

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
      toast.error('Fehler beim Laden der Raketen');
      return;
    }

    setProfiles(data || []);
  };

  const handleCreate = async () => {
    if (!listName.trim()) {
      toast.error('Bitte geben Sie einen Namen für die Laufliste ein');
      return;
    }

    if (assignToUser && !selectedUser) {
      toast.error('Bitte wählen Sie eine Rakete aus');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Sie müssen angemeldet sein');
        setLoading(false);
        return;
      }

      // Create laufliste
      const { data: laufliste, error: listError } = await supabase
        .from('lauflisten')
        .insert({
          name: listName,
          assigned_to: assignToUser ? selectedUser : null,
          color: selectedColor,
          address_count: addresses.length,
          unit_count: totalUnits,
          factor: parseFloat(factor),
          created_by: user.id,
        })
        .select()
        .single();

      if (listError) throw listError;

      // Add addresses to laufliste
      const addressInserts = addresses.map(addr => ({
        laufliste_id: laufliste.id,
        address_id: addr.id,
        street: addr.street,
        house_number: addr.houseNumber,
        postal_code: addr.postalCode,
        city: addr.city,
        coordinates: addr.coordinates,
        units: addr.units,
      }));

      const { error: addressError } = await supabase
        .from('lauflisten_addresses')
        .insert(addressInserts);

      if (addressError) throw addressError;

      toast.success('Laufliste erfolgreich erstellt!');
      onSuccess();
      onClose();
      
      // Reset form
      setListName("");
      setAssignToUser(false);
      setSelectedUser("");
      setSelectedColor(LIST_COLORS[0].value);
    } catch (error) {
      console.error('Error creating list:', error);
      toast.error('Fehler beim Erstellen der Laufliste');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Neue Laufliste erstellen</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{addresses.length}</div>
              <div className="text-sm text-muted-foreground">Adressen</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{totalUnits}</div>
              <div className="text-sm text-muted-foreground">Wohneinheiten</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{factor}</div>
              <div className="text-sm text-muted-foreground">Faktor</div>
            </div>
          </div>

          {/* List Name */}
          <div className="space-y-2">
            <Label htmlFor="list-name">Name der Laufliste</Label>
            <Input
              id="list-name"
              placeholder="z.B. Am Alten Turm"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
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
                    selectedColor === color.value ? 'border-foreground scale-110' : 'border-border'
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
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Rakete wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: profile.color }}
                        />
                        {profile.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={loading} className="flex-1">
              {loading ? 'Erstelle...' : 'Laufliste erstellen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
