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

const DUMMY_PROFILES: Profile[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Jakob Burkart', color: '#3b82f6' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Sarah Müller', color: '#10b981' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Tim Schmidt', color: '#f59e0b' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Lisa Weber', color: '#8b5cf6' },
];

export function CreateListModal({ open, onClose, addresses, onSuccess }: CreateListModalProps) {
  const [assignToUser, setAssignToUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedColors, setUsedColors] = useState<string[]>([]);

  const totalUnits = addresses.reduce((sum, addr) => sum + addr.units.length, 0);
  const factor = addresses.length > 0 ? (totalUnits / addresses.length).toFixed(2) : "0.00";

  useEffect(() => {
    if (open) {
      fetchProfiles();
      fetchUsedColors();
    }
  }, [open]);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching profiles:', error);
      // Fallback to dummy profiles if backend profiles are not available
      setProfiles(DUMMY_PROFILES);
      toast.message('Demo-Daten verwendet', { description: 'Raketen werden vorübergehend aus Dummies geladen.' });
      return;
    }

    console.log('Loaded profiles:', data);
    setProfiles(data && data.length > 0 ? data : DUMMY_PROFILES);
  };

  const fetchUsedColors = async () => {
    const { data, error } = await supabase
      .from('lauflisten')
      .select('color');

    if (error) {
      console.error('Error fetching used colors:', error);
      return;
    }

    const colors = data?.map(item => item.color) || [];
    setUsedColors(colors);

    // Select first available color
    const availableColor = LIST_COLORS.find(color => !colors.includes(color.value));
    if (availableColor) {
      setSelectedColor(availableColor.value);
    }
  };

  const generateListName = async (userId: string | null): Promise<string> => {
    if (userId) {
      // Get user name
      const profile = profiles.find(p => p.id === userId);
      if (!profile) return "Laufliste 1";

      // Count existing lists for this user
      const { data, error } = await supabase
        .from('lauflisten')
        .select('id')
        .eq('assigned_to', userId);

      if (error) {
        console.error('Error counting user lists:', error);
        return `${profile.name} 1`;
      }

      const count = (data?.length || 0) + 1;
      return `${profile.name} ${count}`;
    } else {
      // Count unassigned lists
      const { data, error } = await supabase
        .from('lauflisten')
        .select('id')
        .is('assigned_to', null);

      if (error) {
        console.error('Error counting unassigned lists:', error);
        return "Laufliste 1";
      }

      const count = (data?.length || 0) + 1;
      return `Laufliste ${count}`;
    }
  };

  const handleCreate = async () => {
    if (assignToUser && !selectedUser) {
      toast.error('Bitte wählen Sie eine Rakete aus');
      return;
    }

    if (!selectedColor) {
      toast.error('Keine verfügbare Farbe gefunden');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        toast.error('Sie müssen angemeldet sein. Bitte implementieren Sie Authentifizierung.');
        setLoading(false);
        return;
      }

      console.log('Creating list with user:', user.id);

      // Generate list name
      const listName = await generateListName(assignToUser ? selectedUser : null);
      console.log('Generated list name:', listName);

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

      if (listError) {
        console.error('Error creating list:', listError);
        throw listError;
      }

      console.log('List created:', laufliste);

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

      if (addressError) {
        console.error('Error adding addresses:', addressError);
        throw addressError;
      }

      toast.success(`Laufliste "${listName}" erfolgreich erstellt!`);
      onSuccess();
      onClose();
      
      // Reset form
      setAssignToUser(false);
      setSelectedUser("");
      setSelectedColor("");
    } catch (error) {
      console.error('Error creating list:', error);
      toast.error('Fehler beim Erstellen der Laufliste: ' + (error as any).message);
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
            <Button onClick={handleCreate} disabled={loading} className="flex-1">
              {loading ? 'Erstelle...' : 'Laufliste erstellen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
