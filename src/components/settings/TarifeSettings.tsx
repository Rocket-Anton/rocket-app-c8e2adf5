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
import { Plus, MoreVertical, Search, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface Tariff {
  id: string;
  name: string;
  provider_id: string;
  is_active: boolean;
  commission_rocket?: number;
  commission_project_manager?: number;
  commission_sales_partner?: number;
  commission_recruiter?: number;
  created_at: string;
  provider_name?: string;
}

interface Addon {
  id: string;
  name: string;
  provider_id: string;
  is_active: boolean;
  created_at: string;
  provider_name?: string;
}

export const TarifeSettings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"tarife" | "addons">("tarife");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Tariff | Addon | null>(null);
  const [formData, setFormData] = useState({ 
    name: "",
    provider_id: "",
    revenue: 0,
    commission_rocket: 0,
    commission_project_manager: 0,
    commission_sales_partner: 0,
    has_bonus: false,
    bonus_revenue: 0,
    bonus_rocket: 0,
    bonus_project_manager: 0,
    bonus_sales_partner: 0,
    has_bonus_quota: false,
    bonus_quota_percentage: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, name, logo_url")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: tariffs = [], isLoading: loadingTariffs } = useQuery({
    queryKey: ['tariffs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tariffs")
        .select(`
          *,
          provider:providers(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        provider_name: t.provider?.name
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: addons = [], isLoading: loadingAddons } = useQuery({
    queryKey: ['addons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addons")
        .select(`
          *,
          provider:providers(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(a => ({
        ...a,
        provider_name: a.provider?.name
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      if (activeTab === "tarife") {
        if (editingItem) {
          const { error } = await supabase
            .from("tariffs")
            .update({
              name: formData.name,
              provider_id: formData.provider_id,
              revenue: formData.revenue,
              commission_rocket: formData.commission_rocket,
              commission_project_manager: formData.commission_project_manager,
              commission_sales_partner: formData.commission_sales_partner,
              has_bonus: formData.has_bonus,
              bonus_revenue: formData.bonus_revenue,
              bonus_rocket: formData.bonus_rocket,
              bonus_project_manager: formData.bonus_project_manager,
              bonus_sales_partner: formData.bonus_sales_partner,
              has_bonus_quota: formData.has_bonus_quota,
              bonus_quota_percentage: formData.bonus_quota_percentage,
            })
            .eq("id", editingItem.id);

          if (error) throw error;
          toast.success("Tarif aktualisiert");
        } else {
          const { error } = await supabase
            .from("tariffs")
            .insert({
              name: formData.name,
              provider_id: formData.provider_id,
              revenue: formData.revenue,
              commission_rocket: formData.commission_rocket,
              commission_project_manager: formData.commission_project_manager,
              commission_sales_partner: formData.commission_sales_partner,
              has_bonus: formData.has_bonus,
              bonus_revenue: formData.bonus_revenue,
              bonus_rocket: formData.bonus_rocket,
              bonus_project_manager: formData.bonus_project_manager,
              bonus_sales_partner: formData.bonus_sales_partner,
              has_bonus_quota: formData.has_bonus_quota,
              bonus_quota_percentage: formData.bonus_quota_percentage,
              created_by: user.id,
            });

          if (error) throw error;
          toast.success("Tarif erstellt");
        }
        queryClient.invalidateQueries({ queryKey: ['tariffs'] });
      } else {
        if (editingItem) {
          const { error } = await supabase
            .from("addons")
            .update({
              name: formData.name,
              provider_id: formData.provider_id,
            })
            .eq("id", editingItem.id);

          if (error) throw error;
          toast.success("Zusatz aktualisiert");
        } else {
          const { error } = await supabase
            .from("addons")
            .insert({
              name: formData.name,
              provider_id: formData.provider_id,
              created_by: user.id,
            });

          if (error) throw error;
          toast.success("Zusatz erstellt");
        }
        queryClient.invalidateQueries({ queryKey: ['addons'] });
      }

      setFormData({ 
        name: "", 
        provider_id: "", 
        revenue: 0,
        commission_rocket: 0,
        commission_project_manager: 0,
        commission_sales_partner: 0,
        has_bonus: false,
        bonus_revenue: 0,
        bonus_rocket: 0,
        bonus_project_manager: 0,
        bonus_sales_partner: 0,
        has_bonus_quota: false,
        bonus_quota_percentage: 0,
      });
      setIsCreateOpen(false);
      setEditingItem(null);
    } catch (error: any) {
      toast.error("Fehler beim Speichern");
      console.error(error);
    }
  };

  const handleEdit = (item: Tariff | Addon) => {
    setEditingItem(item);
    if ('commission_rocket' in item) {
      setFormData({
        name: item.name,
        provider_id: item.provider_id,
        revenue: (item as any).revenue || 0,
        commission_rocket: item.commission_rocket || 0,
        commission_project_manager: item.commission_project_manager || 0,
        commission_sales_partner: item.commission_sales_partner || 0,
        has_bonus: (item as any).has_bonus || false,
        bonus_revenue: (item as any).bonus_revenue || 0,
        bonus_rocket: (item as any).bonus_rocket || 0,
        bonus_project_manager: (item as any).bonus_project_manager || 0,
        bonus_sales_partner: (item as any).bonus_sales_partner || 0,
        has_bonus_quota: (item as any).has_bonus_quota || false,
        bonus_quota_percentage: (item as any).bonus_quota_percentage || 0,
      });
    } else {
      setFormData({
        name: item.name,
        provider_id: item.provider_id,
        revenue: 0,
        commission_rocket: 0,
        commission_project_manager: 0,
        commission_sales_partner: 0,
        has_bonus: false,
        bonus_revenue: 0,
        bonus_rocket: 0,
        bonus_project_manager: 0,
        bonus_sales_partner: 0,
        has_bonus_quota: false,
        bonus_quota_percentage: 0,
      });
    }
    setIsCreateOpen(true);
  };

  const handleRowClick = (item: Tariff | Addon) => {
    if (activeTab === "tarife") {
      navigate(`/settings/tarife/${item.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    const table = activeTab === "tarife" ? "tariffs" : "addons";
    if (!confirm(`${activeTab === "tarife" ? "Tarif" : "Zusatz"} wirklich löschen?`)) return;

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success(`${activeTab === "tarife" ? "Tarif" : "Zusatz"} gelöscht`);
      queryClient.invalidateQueries({ queryKey: [table] });
    } catch (error: any) {
      toast.error("Fehler beim Löschen");
      console.error(error);
    }
  };

  const filteredTariffs = tariffs.filter(tariff => 
    tariff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tariff.provider_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAddons = addons.filter(addon => 
    addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    addon.provider_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentItems = activeTab === "tarife" ? filteredTariffs : filteredAddons;
  const loading = activeTab === "tarife" ? loadingTariffs : loadingAddons;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Tarife & Zusätze</h2>
        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingItem(null)}>
                <Plus className="w-4 h-4 mr-2" />
                {activeTab === "tarife" ? "Neuer Tarif" : "Neuer Zusatz"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {editingItem 
                    ? `${activeTab === "tarife" ? "Tarif" : "Zusatz"} bearbeiten` 
                    : `Neuer ${activeTab === "tarife" ? "Tarif" : "Zusatz"}`
                  }
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-4 px-1 max-h-[60vh]">
                <div>
                  <Label htmlFor="provider">Provider *</Label>
                  <Select
                    value={formData.provider_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, provider_id: value })
                    }
                    required
                  >
                    <SelectTrigger className="border">
                      <SelectValue placeholder="Provider wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div className="flex items-center gap-2">
                            {provider.logo_url && (
                              <img src={provider.logo_url} alt={provider.name} className="h-5 w-5 object-contain" />
                            )}
                            <span>{provider.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

                {activeTab === "tarife" && (
                  <>
                    <div>
                      <Label htmlFor="revenue">Umsatz (€)</Label>
                      <Input
                        id="revenue"
                        type="number"
                        step="0.01"
                        value={formData.revenue}
                        onChange={(e) =>
                          setFormData({ ...formData, revenue: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="commission_rocket">Provision Rakete (€)</Label>
                      <Input
                        id="commission_rocket"
                        type="number"
                        step="0.01"
                        value={formData.commission_rocket}
                        onChange={(e) =>
                          setFormData({ ...formData, commission_rocket: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="commission_project_manager">Provision Projektleiter (€)</Label>
                      <Input
                        id="commission_project_manager"
                        type="number"
                        step="0.01"
                        value={formData.commission_project_manager}
                        onChange={(e) =>
                          setFormData({ ...formData, commission_project_manager: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="commission_sales_partner">Provision Werber (€)</Label>
                      <Input
                        id="commission_sales_partner"
                        type="number"
                        step="0.01"
                        value={formData.commission_sales_partner}
                        onChange={(e) =>
                          setFormData({ ...formData, commission_sales_partner: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="has_bonus">Bonus *</Label>
                      <Select
                        value={formData.has_bonus.toString()}
                        onValueChange={(value) =>
                          setFormData({ ...formData, has_bonus: value === "true" })
                        }
                        required
                      >
                        <SelectTrigger className="border">
                          <SelectValue placeholder="Bonus wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Ja</SelectItem>
                          <SelectItem value="false">Nein</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.has_bonus && (
                      <>
                        <div>
                          <Label htmlFor="bonus_revenue">Umsatz Bonus (€)</Label>
                          <Input
                            id="bonus_revenue"
                            type="number"
                            step="0.01"
                            value={formData.bonus_revenue}
                            onChange={(e) =>
                              setFormData({ ...formData, bonus_revenue: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="bonus_rocket">Bonus Rakete (€)</Label>
                          <Input
                            id="bonus_rocket"
                            type="number"
                            step="0.01"
                            value={formData.bonus_rocket}
                            onChange={(e) =>
                              setFormData({ ...formData, bonus_rocket: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="bonus_project_manager">Bonus Projektleiter (€)</Label>
                          <Input
                            id="bonus_project_manager"
                            type="number"
                            step="0.01"
                            value={formData.bonus_project_manager}
                            onChange={(e) =>
                              setFormData({ ...formData, bonus_project_manager: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="bonus_sales_partner">Bonus Werber (€)</Label>
                          <Input
                            id="bonus_sales_partner"
                            type="number"
                            step="0.01"
                            value={formData.bonus_sales_partner}
                            onChange={(e) =>
                              setFormData({ ...formData, bonus_sales_partner: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <Checkbox
                            id="has_bonus_quota"
                            checked={formData.has_bonus_quota}
                            onCheckedChange={(checked) => 
                              setFormData({ ...formData, has_bonus_quota: checked as boolean })
                            }
                          />
                          <Label htmlFor="has_bonus_quota">Bonus Quote</Label>
                        </div>

                        {formData.has_bonus_quota && (
                          <div>
                            <Label htmlFor="bonus_quota_percentage">Bonusquote (%)</Label>
                            <Input
                              id="bonus_quota_percentage"
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={formData.bonus_quota_percentage}
                              onChange={(e) =>
                                setFormData({ ...formData, bonus_quota_percentage: parseFloat(e.target.value) || 0 })
                              }
                            />
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                </div>

                <div className="flex gap-2 justify-end pt-4 mt-2 border-t sticky bottom-0 bg-background">
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="tarife">Tarife</TabsTrigger>
          <TabsTrigger value="addons">Zusätze</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`${activeTab === "tarife" ? "Tarife" : "Zusätze"} suchen...`}
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
                <Checkbox />
              </TableHead>
              <TableHead className="w-[300px]">Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
              {activeTab === "tarife" && (
                <TableHead className="text-right">Provision Rakete</TableHead>
              )}
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
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  {activeTab === "tarife" && (
                    <TableCell>
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                  )}
                  <TableCell>
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              currentItems.map((item) => (
                <TableRow 
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(item)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox />
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{item.name}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{item.provider_name}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </TableCell>
                  {activeTab === "tarife" && 'commission_rocket' in item && (
                    <TableCell className="text-right">
                      <span className="font-medium">
                        {typeof item.commission_rocket === 'number' ? item.commission_rocket.toFixed(2) : '0.00'} €
                      </span>
                    </TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-auto">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(item.id)}
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
