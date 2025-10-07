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
import { LogoUploader } from "./LogoUploader";
import { ColorPickerPopover } from "./ColorPickerPopover";

interface Provider {
  id: string;
  name: string;
  logo_url: string | null;
  color: string;
  abbreviation: string;
  created_at: string;
}

export const ProvidersSettings = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    logo_url: "", 
    color: "#3b82f6", 
    abbreviation: "" 
  });
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [suggestedColors, setSuggestedColors] = useState<string[]>([]);
  const [selectedColorOption, setSelectedColorOption] = useState<string>("other");

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

  const handleLogoProcessed = (blob: Blob, colors: string[]) => {
    setLogoBlob(blob);
    setSuggestedColors(colors);
    
    // Create object URL for preview
    const objectUrl = URL.createObjectURL(blob);
    setFormData(prev => ({ ...prev, logo_url: objectUrl }));
    
    // Set first color as default if colors are available
    if (colors.length > 0) {
      setFormData(prev => ({ ...prev, color: colors[0] }));
      setSelectedColorOption("color-0");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate logo is uploaded for new providers
    if (!editingProvider && !logoBlob) {
      toast.error("Bitte laden Sie ein Logo hoch");
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      let finalLogoUrl = formData.logo_url;

      // Upload logo if there's a new blob
      if (logoBlob) {
        const fileName = `${user.id}-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('provider-logos')
          .upload(fileName, logoBlob, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('provider-logos')
          .getPublicUrl(fileName);

        finalLogoUrl = publicUrl;
      }

      if (editingProvider) {
        const { error } = await supabase
          .from("providers")
          .update({
            name: formData.name,
            logo_url: finalLogoUrl || null,
            color: formData.color,
            abbreviation: formData.abbreviation,
          })
          .eq("id", editingProvider.id);

        if (error) throw error;
        toast.success("Provider aktualisiert");
      } else {
        const { error } = await supabase
          .from("providers")
          .insert({
            name: formData.name,
            logo_url: finalLogoUrl || null,
            color: formData.color,
            abbreviation: formData.abbreviation,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("Provider erstellt");
      }

      setFormData({ name: "", logo_url: "", color: "#3b82f6", abbreviation: "" });
      setLogoBlob(null);
      setSuggestedColors([]);
      setSelectedColorOption("other");
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
      logo_url: provider.logo_url || "",
      color: provider.color || "#3b82f6",
      abbreviation: provider.abbreviation || "",
    });
    // Set selectedColorOption to "other" when editing
    setSelectedColorOption("other");
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
    setFormData({ name: "", logo_url: "", color: "#3b82f6", abbreviation: "" });
    setLogoBlob(null);
    setSuggestedColors([]);
    setSelectedColorOption("other");
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
                <Label>Logo</Label>
                <LogoUploader 
                  onLogoProcessed={handleLogoProcessed}
                  currentLogoUrl={formData.logo_url}
                />
              </div>

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
                <Label htmlFor="abbreviation">Kürzel *</Label>
                <Input
                  id="abbreviation"
                  value={formData.abbreviation}
                  onChange={(e) =>
                    setFormData({ ...formData, abbreviation: e.target.value })
                  }
                  maxLength={10}
                  placeholder="z.B. TK, AOK"
                  required
                />
              </div>

              {suggestedColors.length > 0 && (
                <div>
                  <Label>Farbe</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {suggestedColors.map((color, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setSelectedColorOption(`color-${index}`);
                          setFormData({ ...formData, color });
                        }}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-md border-2 transition-all ${
                          selectedColorOption === `color-${index}`
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div 
                          className="h-8 w-16 rounded"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs font-medium">Farbe {index + 1}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedColorOption("other")}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-md border-2 transition-all ${
                        selectedColorOption === "other"
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="h-8 w-16 rounded bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500" />
                      <span className="text-xs font-medium">Andere</span>
                    </button>
                  </div>
                  {selectedColorOption === "other" && (
                    <div className="mt-4">
                      <ColorPickerPopover
                        color={formData.color}
                        onChange={(color) => setFormData({ ...formData, color })}
                        suggestedColors={[]}
                      />
                    </div>
                  )}
                </div>
              )}

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
