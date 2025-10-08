import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, MoreVertical, Search, Filter, Upload, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LogoUploader } from "./LogoUploader";
import { ColorPickerPopover } from "./ColorPickerPopover";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

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
          // Count projects for this provider
          const { count: projectCount } = await supabase
            .from("projects")
            .select("*", { count: "exact", head: true })
            .eq("provider_id", provider.id);

          // Count lauflisten through projects -> addresses -> lauflisten_addresses
          const { data: projectIds } = await supabase
            .from("projects")
            .select("id")
            .eq("provider_id", provider.id);

          let rocketCount = 0;
          if (projectIds && projectIds.length > 0) {
            const { data: addressIds } = await supabase
              .from("addresses")
              .select("id")
              .in("project_id", projectIds.map(p => p.id));

            if (addressIds && addressIds.length > 0) {
              const { data: lauflistenLinks } = await supabase
                .from("lauflisten_addresses")
                .select("laufliste_id")
                .in("address_id", addressIds.map(a => a.id));

              if (lauflistenLinks && lauflistenLinks.length > 0) {
                const uniqueLauflistenIds = [...new Set(lauflistenLinks.map(l => l.laufliste_id))];
                rocketCount = uniqueLauflistenIds.length;
              }
            }
          }

          return {
            ...provider,
            project_count: projectCount || 0,
            active_rockets_count: rocketCount
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

  const filteredProviders = providers.filter(provider => 
    provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.abbreviation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProviders(new Set(filteredProviders.map(p => p.id)));
    } else {
      setSelectedProviders(new Set());
    }
  };

  const handleSelectProvider = (providerId: string, checked: boolean) => {
    const newSelected = new Set(selectedProviders);
    if (checked) {
      newSelected.add(providerId);
    } else {
      newSelected.delete(providerId);
    }
    setSelectedProviders(newSelected);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(providers, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'providers.json';
    link.click();
    toast.success('Provider exportiert');
  };

  const handleImport = () => {
    toast.info('Import-Funktion wird implementiert');
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Provider</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImport}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
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
                <Label htmlFor="is_active">Aktiv</Label>
                <input 
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => 
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4"
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
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Provider suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedProviders.size === filteredProviders.length && filteredProviders.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[300px]">Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Projekte</TableHead>
              <TableHead className="text-center">Raketen</TableHead>
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
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8 mx-auto" />
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
              filteredProviders.map((provider) => (
                <TableRow 
                  key={provider.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(provider)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedProviders.has(provider.id)}
                      onCheckedChange={(checked) => handleSelectProvider(provider.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {provider.logo_url ? (
                        <img 
                          src={provider.logo_url} 
                          alt={provider.name} 
                          className="h-10 w-10 object-contain rounded-full border border-border"
                        />
                      ) : (
                        <div 
                          className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm border border-border"
                          style={{ backgroundColor: provider.color }}
                        >
                          {provider.abbreviation || provider.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-muted-foreground">{provider.abbreviation}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={provider.is_active ? "default" : "secondary"}
                      className={provider.is_active ? "bg-green-500 hover:bg-green-600" : ""}
                    >
                      {provider.is_active ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {provider.project_count || 0}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {provider.active_rockets_count || 0}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(provider);
                        }}>
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(provider.id);
                          }}
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
