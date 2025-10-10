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
import { MoreVertical, Search, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { AvatarUploader } from "./AvatarUploader";
import { raketenFormSchema } from "@/utils/validation";

interface Rakete {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
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
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "rocket" as "rocket" | "project_manager",
    avatarBlob: null as Blob | null,
    avatarUrl: null as string | null
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

          // Get project count
          const { count } = await supabase
            .from("project_rockets")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", profile.id);

          return {
            ...profile,
            role: roleData?.role || "rocket",
            project_count: count || 0
          };
        })
      );

      return profilesWithRoles;
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const result = raketenFormSchema.safeParse({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      role: formData.role
    });

    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    try {
      if (editingRakete) {
        // Update existing user
        let avatarUrl = editingRakete.avatar_url;

        // Upload new avatar if provided
        if (formData.avatarBlob) {
          const fileName = `${editingRakete.id}_${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage
            .from('profile-avatars')
            .upload(`avatars/${fileName}`, formData.avatarBlob);
          
          if (uploadError) throw uploadError;
          
          const { data: urlData } = supabase.storage
            .from('profile-avatars')
            .getPublicUrl(`avatars/${fileName}`);
          
          avatarUrl = urlData.publicUrl;
        }

        const fullName = `${formData.firstName} ${formData.lastName}`;
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            name: fullName,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            avatar_url: avatarUrl,
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
        // Create new user with random password
        const randomPassword = crypto.randomUUID();
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: randomPassword,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName
            },
            emailRedirectTo: `${window.location.origin}/reset-password`
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("User creation failed");

        // Upload avatar if provided
        let avatarUrl = null;
        if (formData.avatarBlob) {
          const fileName = `${authData.user.id}_${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage
            .from('profile-avatars')
            .upload(`avatars/${fileName}`, formData.avatarBlob);
          
          if (uploadError) throw uploadError;
          
          const { data: urlData } = supabase.storage
            .from('profile-avatars')
            .getPublicUrl(`avatars/${fileName}`);
          
          avatarUrl = urlData.publicUrl;
        }

        // Update profile with additional info
        const fullName = `${formData.firstName} ${formData.lastName}`;
        const randomColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        const randomColor = randomColors[Math.floor(Math.random() * randomColors.length)];
        
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            name: fullName,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            avatar_url: avatarUrl,
            color: randomColor
          })
          .eq("id", authData.user.id);

        if (profileError) throw profileError;

        // Set role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: formData.role
          });

        if (roleError) throw roleError;

        toast.success("Rakete erstellt! Einladungsmail wird vorbereitet.");
        
        // TODO: Uncomment when SMTP is configured
        // await supabase.functions.invoke('send-invitation-email', {
        //   body: { userId: authData.user.id, email: formData.email }
        // });
      }

      setFormData({ 
        firstName: "", 
        lastName: "", 
        email: "", 
        phone: "", 
        role: "rocket", 
        avatarBlob: null,
        avatarUrl: null
      });
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
      firstName: rakete.first_name || "",
      lastName: rakete.last_name || "",
      email: "",
      phone: rakete.phone || "",
      role: (rakete.role as "rocket" | "project_manager") || "rocket",
      avatarBlob: null,
      avatarUrl: rakete.avatar_url || null,
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

      // Delete profile
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
    rakete.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rakete.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rakete.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
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

  const getInitials = (rakete: Rakete) => {
    if (rakete.first_name && rakete.last_name) {
      return `${rakete.first_name[0]}${rakete.last_name[0]}`.toUpperCase();
    }
    return rakete.name.split(' ').map(n => n[0]).join('').toUpperCase();
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
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {editingRakete ? "Rakete bearbeiten" : "Neue Rakete"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-4 px-1">
                  {/* Vorname & Nachname - Responsive Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Vorname *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nachname *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* E-Mail & Handy */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        disabled={!!editingRakete}
                      />
                      {editingRakete && (
                        <p className="text-xs text-muted-foreground mt-1">
                          E-Mail kann nicht geändert werden
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phone">Handy *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Rolle */}
                  <div>
                    <Label htmlFor="role">Rolle *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "rocket" | "project_manager") =>
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger className="border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rocket">Rakete</SelectItem>
                        <SelectItem value="project_manager">Projektleiter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Profilbild (optional) */}
                  <div>
                    <Label>Profilbild (optional)</Label>
                    <AvatarUploader 
                      onAvatarProcessed={(blob) => 
                        setFormData({...formData, avatarBlob: blob, avatarUrl: URL.createObjectURL(blob)})
                      }
                      currentAvatarUrl={formData.avatarUrl}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 mt-2 border-t">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsCreateOpen(false);
                    setEditingRakete(null);
                  }}>
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
                        {rakete.avatar_url && <AvatarImage src={rakete.avatar_url} />}
                        <AvatarFallback className="text-white">
                          {getInitials(rakete)}
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
                      {rakete.project_count || 0}
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