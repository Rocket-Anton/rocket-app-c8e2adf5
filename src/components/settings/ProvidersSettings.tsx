import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  color: string;
  abbreviation: string | null;
  created_at: string;
}

export const ProvidersSettings = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    logo_url: "", 
    color: "#3b82f6", 
    abbreviation: "" 
  });

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error: any) {
      toast.error("Fehler beim Laden der Provider");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      if (editingProvider) {
        const { error } = await supabase
          .from("providers")
          .update({
            name: formData.name,
            description: formData.description,
            logo_url: formData.logo_url || null,
            color: formData.color,
            abbreviation: formData.abbreviation || null,
          })
          .eq("id", editingProvider.id);

        if (error) throw error;
        toast.success("Provider aktualisiert");
      } else {
        const { error } = await supabase
          .from("providers")
          .insert({
            name: formData.name,
            description: formData.description,
            logo_url: formData.logo_url || null,
            color: formData.color,
            abbreviation: formData.abbreviation || null,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("Provider erstellt");
      }

      setFormData({ name: "", description: "", logo_url: "", color: "#3b82f6", abbreviation: "" });
      setIsCreateOpen(false);
      setEditingProvider(null);
      loadProviders();
    } catch (error: any) {
      toast.error("Fehler beim Speichern");
      console.error(error);
    }
  };

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      description: provider.description || "",
      logo_url: provider.logo_url || "",
      color: provider.color || "#3b82f6",
      abbreviation: provider.abbreviation || "",
    });
    setIsCreateOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Provider wirklich löschen?")) return;

    try {
      const { error } = await supabase
        .from("providers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Provider gelöscht");
      loadProviders();
    } catch (error: any) {
      toast.error("Fehler beim Löschen");
      console.error(error);
    }
  };

  const handleDialogClose = () => {
    setIsCreateOpen(false);
    setEditingProvider(null);
    setFormData({ name: "", description: "", logo_url: "", color: "#3b82f6", abbreviation: "" });
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Provider</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingProvider(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Neuer Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? "Provider bearbeiten" : "Neuer Provider"}
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
              <div>
                <Label htmlFor="abbreviation">Kürzel</Label>
                <Input
                  id="abbreviation"
                  value={formData.abbreviation}
                  onChange={(e) =>
                    setFormData({ ...formData, abbreviation: e.target.value })
                  }
                  maxLength={10}
                  placeholder="z.B. TK, AOK"
                />
              </div>
              <div>
                <Label htmlFor="color">Farbe</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex-1"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) =>
                    setFormData({ ...formData, logo_url: e.target.value })
                  }
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Abbrechen
                </Button>
                <Button type="submit">Speichern</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Logo</TableHead>
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead className="w-[100px]">Kürzel</TableHead>
            <TableHead className="w-[80px]">Farbe</TableHead>
            <TableHead className="flex-1">Beschreibung</TableHead>
            <TableHead className="w-[120px] text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-10 w-10 rounded" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-12 rounded" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : (
            providers.map((provider) => (
              <TableRow key={provider.id}>
                <TableCell>
                  {provider.logo_url ? (
                    <img 
                      src={provider.logo_url} 
                      alt={provider.name} 
                      className="h-10 w-10 object-contain rounded"
                    />
                  ) : (
                    <div 
                      className="h-10 w-10 rounded flex items-center justify-center text-white font-semibold text-sm"
                      style={{ backgroundColor: provider.color }}
                    >
                      {provider.abbreviation || provider.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{provider.name}</TableCell>
                <TableCell>{provider.abbreviation || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-6 w-12 rounded border"
                      style={{ backgroundColor: provider.color }}
                    />
                  </div>
                </TableCell>
                <TableCell>{provider.description || "-"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(provider)}
                    className="mr-2"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(provider.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
