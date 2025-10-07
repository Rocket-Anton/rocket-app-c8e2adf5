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
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LogoUploader } from "./LogoUploader";
import { ColorPickerPopover } from "./ColorPickerPopover";

interface Provider {
  id: string;
  name: string;
  logo_url: string | null;
  color: string;
  abbreviation: string;
  is_active: boolean;
  created_at: string;
  project_count?: number;
  active_rockets_count?: number;
}

export const ProvidersSettings = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    logo_url: "", 
    color: "#3b82f6", 
    abbreviation: "",
    is_active: true
  });
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [suggestedColors, setSuggestedColors] = useState<string[]>([]);
  const [selectedColorOption, setSelectedColorOption] = useState<string>("other");

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      // First get providers
      const { data: providersData, error: providersError } = await supabase
        .from("providers")
        .select("*")
        .order("created_at", { ascending: false });

      if (providersError) throw providersError;

      // Then get counts for each provider
      const providersWithCounts = await Promise.all(
        (providersData || []).map(async (provider) => {
          const [projectsRes, raktenRes] = await Promise.all([
            supabase
              .from("projects")
              .select("*", { count: "exact", head: true })
              .eq("provider_id", provider.id),
            supabase
              .from("lauflisten")
              .select("*", { count: "exact", head: true })
          ]);

          return {
            ...provider,
            project_count: projectsRes.count || 0,
            active_rockets_count: raktenRes.count || 0
          };
        })
      );
      
      setProviders(providersWithCounts);
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
            is_active: formData.is_active,
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
            is_active: formData.is_active,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("Provider erstellt");
      }

      setFormData({ name: "", logo_url: "", color: "#3b82f6", abbreviation: "", is_active: true });
      setLogoBlob(null);
      setSuggestedColors([]);
      setSelectedColorOption("other");
      setIsCreateOpen(false);
      setEditingProvider(null);
      setIsDetailOpen(false);
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
      is_active: provider.is_active ?? true,
    });
    setSelectedColorOption("other");
    setIsDetailOpen(false);
    setIsCreateOpen(true);
  };

  const handleRowClick = (provider: Provider) => {
    setSelectedProvider(provider);
    setIsDetailOpen(true);
  };

  const handleToggleStatus = async (provider: Provider, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from("providers")
        .update({ is_active: !provider.is_active })
        .eq("id", provider.id);

      if (error) throw error;
      toast.success(provider.is_active ? "Provider deaktiviert" : "Provider aktiviert");
      loadProviders();
    } catch (error: any) {
      toast.error("Fehler beim Aktualisieren");
      console.error(error);
    }
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
    setFormData({ name: "", logo_url: "", color: "#3b82f6", abbreviation: "", is_active: true });
    setLogoBlob(null);
    setSuggestedColors([]);
    setSelectedColorOption("other");
  };

  const handleDetailDialogClose = () => {
    setIsDetailOpen(false);
    setSelectedProvider(null);
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

              <div className="flex items-center gap-2">
                <Switch 
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Aktiv</Label>
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

      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Logo</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[100px] text-center">Projekte</TableHead>
            <TableHead className="w-[140px] text-center">Aktive Raketen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-10 w-10 rounded" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
              </TableRow>
            ))
          ) : (
            providers.map((provider) => (
              <TableRow 
                key={provider.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(provider)}
              >
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
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={provider.is_active}
                      onCheckedChange={() => handleToggleStatus(provider, {} as React.MouseEvent)}
                    />
                    <Badge variant={provider.is_active ? "default" : "secondary"}>
                      {provider.is_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium">
                  {provider.project_count || 0}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {provider.active_rockets_count || 0}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Provider Details</DialogTitle>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                {selectedProvider.logo_url ? (
                  <img 
                    src={selectedProvider.logo_url} 
                    alt={selectedProvider.name} 
                    className="h-20 w-20 object-contain rounded border"
                  />
                ) : (
                  <div 
                    className="h-20 w-20 rounded flex items-center justify-center text-white font-semibold text-lg"
                    style={{ backgroundColor: selectedProvider.color }}
                  >
                    {selectedProvider.abbreviation || selectedProvider.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold">{selectedProvider.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">Kürzel: {selectedProvider.abbreviation}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div 
                      className="h-6 w-16 rounded border"
                      style={{ backgroundColor: selectedProvider.color }}
                    />
                    <span className="text-sm text-muted-foreground">{selectedProvider.color}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedProvider.is_active ? "default" : "secondary"} className="mt-2">
                    {selectedProvider.is_active ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Projekte</p>
                  <p className="text-2xl font-bold mt-1">{selectedProvider.project_count || 0}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Aktive Raketen</p>
                  <p className="text-2xl font-bold mt-1">{selectedProvider.active_rockets_count || 0}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={handleDetailDialogClose}>
                  Schließen
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    handleEdit(selectedProvider);
                  }}
                >
                  Bearbeiten
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    handleDelete(selectedProvider.id);
                    handleDetailDialogClose();
                  }}
                >
                  Löschen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
