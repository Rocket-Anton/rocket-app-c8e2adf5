import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, MoreVertical, Search, Filter, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Rakete {
  id: string;
  name: string;
  color: string;
  created_at: string;
  role?: string;
  project_count?: number;
}

export const RaketenSettings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRakete, setEditingRakete] = useState<Rakete | null>(null);
  const [formData, setFormData] = useState({ 
    name: "",
    email: "",
    password: "",
    role: "rocket" as "rocket" | "project_manager" | "admin",
    color: "#3b82f6"
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRaketen, setSelectedRaketen] = useState<Set<string>>(new Set());

  const { data: raketen = [], isLoading: loading } = useQuery({
    queryKey: ['raketen'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get roles for each user
      const profilesWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id)
            .maybeSingle();

          return {
            ...profile,
            role: roleData?.role || "rocket"
          };
        })
      );

      return profilesWithRoles;
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRakete) {
        // Update existing user
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            name: formData.name,
            color: formData.color,
          })
          .eq("id", editingRakete.id);

        if (profileError) throw profileError;

        // Update role
        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert({
            user_id: editingRakete.id,
            role: formData.role
          });

        if (roleError) throw roleError;

        toast.success("Rakete aktualisiert");
      } else {
        // Create new user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("User creation failed");

        // Update color in profile
        const { error: colorError } = await supabase
          .from("profiles")
          .update({ color: formData.color })
          .eq("id", authData.user.id);

        if (colorError) throw colorError;

        // Set role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: formData.role
          });

        if (roleError) throw roleError;

        toast.success("Rakete erstellt");
      }

      setFormData({ name: "", email: "", password: "", role: "rocket", color: "#3b82f6" });
      setIsCreateOpen(false);
      setEditingRakete(null);
      queryClient.invalidateQueries({ queryKey: ['raketen'] });
    } catch (error: any) {
      toast.error("Fehler beim Speichern: " + error.message);
      console.error(error);
    }
  };

  const handleEdit = (rakete: Rakete) => {
    setEditingRakete(rakete);
    setFormData({
      name: rakete.name,
      email: "",
      password: "",
      role: (rakete.role as any) || "rocket",
      color: rakete.color || "#3b82f6",
    });
    setIsCreateOpen(true);
  };

  const handleRowClick = (rakete: Rakete) => {
    navigate(`/settings/raketen/${rakete.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Rakete wirklich löschen? Dies löscht auch alle zugehörigen Daten.")) return;

    try {
      // Delete user roles first
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", id);

      // Delete profile (auth user will be deleted via trigger if configured)
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Rakete gelöscht");
      queryClient.invalidateQueries({ queryKey: ['raketen'] });
    } catch (error: any) {
      toast.error("Fehler beim Löschen");
      console.error(error);
    }
  };

  const filteredRaketen = raketen.filter(rakete => 
    rakete.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRaketen(new Set(filteredRaketen.map(r => r.id)));
    } else {
      setSelectedRaketen(new Set());
    }
  };

  const handleSelectRakete = (raketeId: string, checked: boolean) => {
    const newSelected = new Set(selectedRaketen);
    if (checked) {
      newSelected.add(raketeId);
    } else {
      newSelected.delete(raketeId);
    }
    setSelectedRaketen(newSelected);
  };

  const getRoleBadge = (role?: string) => {
    const roleColors = {
      super_admin: "bg-red-500",
      admin: "bg-orange-500",
      project_manager: "bg-blue-500",
      rocket: "bg-green-500"
    };

    const roleLabels = {
      super_admin: "Super Admin",
      admin: "Admin",
      project_manager: "Projektleiter",
      rocket: "Rakete"
    };

    return (
      <Badge className={roleColors[role as keyof typeof roleColors] || "bg-gray-500"}>
        {roleLabels[role as keyof typeof roleLabels] || role}
      </Badge>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Raketen</h2>
        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingRakete(null)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Neue Rakete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingRakete ? "Rakete bearbeiten" : "Neue Rakete"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                {!editingRakete && (
                  <>
                    <div>
                      <Label htmlFor="email">E-Mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="password">Passwort *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        minLength={6}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Mindestens 6 Zeichen
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="role">Rolle *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rocket">Rakete</SelectItem>
                      <SelectItem value="project_manager">Projektleiter</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="color">Farbe</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button type="submit">Speichern</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Raketen suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedRaketen.size === filteredRaketen.length && filteredRaketen.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[300px]">Rakete</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead className="text-center">Projekte</TableHead>
              <TableHead className="w-[80px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              filteredRaketen.map((rakete) => (
                <TableRow 
                  key={rakete.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(rakete)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRaketen.has(rakete.id)}
                      onCheckedChange={(checked) => handleSelectRakete(rakete.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar style={{ backgroundColor: rakete.color }}>
                        <AvatarFallback className="text-white">
                          {rakete.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{rakete.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(rakete.role)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      0
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-auto">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(rakete)}>
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(rakete.id)}
                          className="text-destructive"
                        >
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
