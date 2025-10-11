import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, FileText, CheckCircle, AlertCircle, Loader2, Download, Send, Info, BarChart3, DollarSign, Rocket, MessageCircle, List, Trash2, ChevronDown, Settings, AlertTriangle, PlayCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectAddListDialog } from "@/components/settings/ProjectAddListDialog";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FailedAddressesDialog } from "@/components/settings/FailedAddressesDialog";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  target_quota: number | null;
  unit_count: number | null;
  saleable_units: number | null;
  existing_customer_count: number | null;
  start_date: string | null;
  end_date: string | null;
  provider_id: string | null;
  providers?: {
    name: string;
    logo_url: string | null;
    abbreviation: string;
  };
}

interface AddressList {
  id: string;
  name: string;
  file_name: string | null;
  status: string;
  column_mapping: any;
  upload_stats: any;
  created_at: string;
}

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [lists, setLists] = useState<AddressList[]>([]);
  const [loading, setLoading] = useState(true);
  const [addListDialogOpen, setAddListDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentTab, setCurrentTab] = useState("details");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [failedDialogOpen, setFailedDialogOpen] = useState(false);
  const [failedListId, setFailedListId] = useState<string | null>(null);
  
  // Status settings states
  const [customStatuses, setCustomStatuses] = useState<any[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<any[]>([]);
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#3b82f6");
  const [newReason, setNewReason] = useState("");
  const [statusDeleteDialogOpen, setStatusDeleteDialogOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<any | null>(null);
  const [replacementStatus, setReplacementStatus] = useState("");
  const [affectedUnitsCount, setAffectedUnitsCount] = useState(0);

  const calculateDaysRemaining = () => {
    if (!project?.end_date) return null;
    const today = new Date();
    const endDate = new Date(project.end_date);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateCurrentQuota = () => {
    if (!project || !project.saleable_units || !project.existing_customer_count) return null;
    return Math.round((project.existing_customer_count / project.saleable_units) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Planung':
        return 'bg-blue-100 text-blue-800';
      case 'Läuft':
        return 'bg-green-100 text-green-800';
      case 'Laufend':
        return 'bg-yellow-100 text-yellow-800';
      case 'Abgeschlossen':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    loadProject();
    loadLists();
    loadCustomStatuses();
    loadRejectionReasons();
  }, [id]);

  // Separate effect for polling importing lists
  useEffect(() => {
    const hasActive = lists.some(l => l.status === 'importing' || l.status === 'analyzing' || l.status === 'geocoding');
    
    if (hasActive) {
      const interval = setInterval(() => {
        loadLists();
      }, 500); // Poll every 500ms for smoother progress updates
      
      return () => clearInterval(interval);
    }
  }, [lists]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          providers (
            name,
            logo_url,
            abbreviation
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error("Error loading project:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLists = async () => {
    try {
      const { data, error } = await supabase
        .from("project_address_lists")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLists(data || []);
    } catch (error) {
      console.error("Error loading lists:", error);
    }
  };

  const loadCustomStatuses = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("custom_statuses")
      .select("*")
      .eq("project_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setCustomStatuses(data);
    }
  };

  const loadRejectionReasons = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("rejection_reasons")
      .select("*")
      .eq("project_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setRejectionReasons(data);
    }
  };

  const addCustomStatus = async () => {
    if (!newStatusLabel) {
      toast.error("Bitte Label eingeben");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const generatedName = newStatusLabel.toLowerCase().replace(/\s+/g, '-');

    const { error } = await supabase.from("custom_statuses").insert({
      project_id: id,
      name: generatedName,
      label: newStatusLabel,
      color: newStatusColor,
      created_by: user.id,
    });

    if (error) {
      toast.error("Fehler beim Hinzufügen");
      return;
    }

    toast.success("Status hinzugefügt");
    setNewStatusLabel("");
    setNewStatusColor("#3b82f6");
    loadCustomStatuses();
  };

  const deleteCustomStatus = async (status: any) => {
    setAffectedUnitsCount(0); // TODO: Implement checking
    setStatusToDelete(status);
    setStatusDeleteDialogOpen(true);
  };

  const confirmDeleteStatus = async () => {
    if (!statusToDelete) return;

    const { error } = await supabase
      .from("custom_statuses")
      .update({ is_active: false })
      .eq("id", statusToDelete.id);

    if (error) {
      toast.error("Fehler beim Löschen");
      return;
    }

    toast.success("Status gelöscht");
    setStatusDeleteDialogOpen(false);
    setStatusToDelete(null);
    setReplacementStatus("");
    loadCustomStatuses();
  };

  const addRejectionReason = async () => {
    if (!newReason.trim()) {
      toast.error("Bitte Grund eingeben");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("rejection_reasons").insert({
      project_id: id,
      reason: newReason.trim(),
      created_by: user.id,
    });

    if (error) {
      toast.error("Fehler beim Hinzufügen");
      return;
    }

    toast.success("Grund hinzugefügt");
    setNewReason("");
    loadRejectionReasons();
  };

  const deleteRejectionReason = async (reasonId: string, reasonText: string) => {
    if (reasonText === "Anderer Grund") {
      toast.error("'Anderer Grund' kann nicht gelöscht werden");
      return;
    }

    const { error } = await supabase
      .from("rejection_reasons")
      .update({ is_active: false })
      .eq("id", reasonId);

    if (error) {
      toast.error("Fehler beim Löschen");
      return;
    }

    toast.success("Grund gelöscht");
    loadRejectionReasons();
  };

  const DEFAULT_STATUSES = [
    { value: "offen", label: "Offen", color: "bg-gray-500 text-white" },
    { value: "nicht-angetroffen", label: "Nicht angetroffen", color: "bg-yellow-500 text-white" },
    { value: "karte-eingeworfen", label: "Karte eingeworfen", color: "bg-amber-500 text-white" },
    { value: "potenzial", label: "Potenzial", color: "bg-green-500 text-white" },
    { value: "neukunde", label: "Neukunde", color: "bg-blue-500 text-white" },
    { value: "bestandskunde", label: "Bestandskunde", color: "bg-emerald-500 text-white" },
    { value: "kein-interesse", label: "Kein Interesse", color: "bg-red-500 text-white" },
    { value: "termin", label: "Termin", color: "bg-purple-500 text-white" },
    { value: "nicht-vorhanden", label: "Nicht vorhanden", color: "bg-gray-400 text-white" },
    { value: "gewerbe", label: "Gewerbe", color: "bg-orange-500 text-white" },
  ];

  const DEFAULT_REJECTION_REASONS = [
    "Zu alt",
    "Kein Besuch mehr erwünscht",
    "Ziehen bald weg",
    "Zur Miete",
    "Anderer Grund"
  ];

  const allStatuses = [...DEFAULT_STATUSES, ...customStatuses.map(s => ({
    value: s.name,
    label: s.label,
    color: s.color
  }))];

  const openFailedDialog = (listId: string) => {
    setFailedListId(listId);
    setFailedDialogOpen(true);
  };

  const openDeleteDialog = (listId: string) => {
    setListToDelete(listId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteList = async () => {
    if (!listToDelete) return;

    try {
      // First, get all addresses from this list
      const { data: listAddresses, error: fetchError } = await supabase
        .from("addresses")
        .select("id")
        .eq("list_id", listToDelete);

      if (fetchError) throw fetchError;

      // Delete all addresses associated with this list
      if (listAddresses && listAddresses.length > 0) {
        const addressIds = listAddresses.map(addr => addr.id);
        const { error: deleteAddressesError } = await supabase
          .from("addresses")
          .delete()
          .in("id", addressIds);

        if (deleteAddressesError) throw deleteAddressesError;
      }

      // Then delete the list itself
      const { error: deleteListError } = await supabase
        .from("project_address_lists")
        .delete()
        .eq("id", listToDelete);

      if (deleteListError) throw deleteListError;

      toast.success('Adressliste und alle zugehörigen Adressen erfolgreich gelöscht');
      loadLists();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Löschen fehlgeschlagen: ${error.message}`);
    } finally {
      setDeleteDialogOpen(false);
      setListToDelete(null);
    }
  };

  const handleExport = async (exportType: 'raw' | 'rocket', listId?: string) => {
    if (!id) return;
    
    setExporting(true);
    try {
      console.log('Starting export...', { projectId: id, exportType, listId });
      
      const { data, error } = await supabase.functions.invoke('export-project-addresses', {
        body: { 
          projectId: id, 
          exportType,
          listId
        },
        headers: { Accept: 'text/csv' },
      });

      console.log('Export response:', { typeofData: typeof data, isArrayBuffer: data instanceof ArrayBuffer });

      if (error) {
        console.error('Export error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Keine Daten erhalten');
      }

      // Create blob and download (handle string or ArrayBuffer)
      const blobData = (data instanceof ArrayBuffer)
        ? data
        : (typeof data === 'string')
          ? new TextEncoder().encode(data)
          : new TextEncoder().encode(String(data));
      const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = exportType === 'raw' 
        ? `rohdatei-export-${project?.name || id}.csv`
        : `rocket-app-export-${project?.name || id}.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Export erfolgreich heruntergeladen');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Export fehlgeschlagen: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Hochgeladen", icon: FileText },
      analyzing: { variant: "default" as const, label: "Analysiere...", icon: Loader2 },
      mapped: { variant: "default" as const, label: "Gemappt", icon: CheckCircle },
      importing: { variant: "default" as const, label: "Importiere Adressen...", icon: Loader2 },
      geocoding: { variant: "default" as const, label: "Geokodierung läuft...", icon: Loader2 },
      completed: { variant: "default" as const, label: "Abgeschlossen", icon: CheckCircle },
      failed: { variant: "destructive" as const, label: "Fehler", icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${status === 'analyzing' || status === 'importing' || status === 'geocoding' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset className="flex-1 p-0 m-0 border-0 overflow-hidden">
          <div className="h-full overflow-auto" style={{ scrollbarGutter: 'stable' }}>
            <div className="w-full max-w-7xl mx-auto p-6">
              <Button
                variant="ghost"
                onClick={() => navigate("/settings/projects")}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>

              {loading ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <Skeleton className="h-8 w-64" />
                  </div>
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : project ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {project.providers && (
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={project.providers.logo_url || undefined} />
                          <AvatarFallback>{project.providers.abbreviation}</AvatarFallback>
                        </Avatar>
                      )}
                      <h1 className="text-xl font-bold">{project.name}</h1>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Raketenstart
                      </Button>
                      <Button variant="default" size="sm" onClick={() => navigate(`/settings/projects/${id}/status`)}>
                        Status
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="text-xs">Status</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge className={`${getStatusColor(project.status)} border-0 font-normal`}>
                          {project.status}
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="text-xs">Zielquote</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{project.target_quota || 0}%</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="text-xs">Quote aktuell</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{calculateCurrentQuota() || 0}%</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription className="text-xs">Resttage</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{calculateDaysRemaining() || 0}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabs */}
                  <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                    <TabsList className="w-full justify-start border-b rounded-none h-12 p-0 bg-transparent overflow-x-auto flex-nowrap">
                      <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2 whitespace-nowrap">
                        <Info className="w-4 h-4" />
                        Details
                      </TabsTrigger>
                      <TabsTrigger value="dashboard" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2 whitespace-nowrap">
                        <BarChart3 className="w-4 h-4" />
                        Dashboard
                      </TabsTrigger>
                      <TabsTrigger value="revenue" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2 whitespace-nowrap">
                        <DollarSign className="w-4 h-4" />
                        Umsatz
                      </TabsTrigger>
                      <TabsTrigger value="rockets-active" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2 whitespace-nowrap">
                        <Rocket className="w-4 h-4" />
                        Raketen
                      </TabsTrigger>
                      <TabsTrigger value="commissions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2 whitespace-nowrap">
                        <DollarSign className="w-4 h-4" />
                        Tarife
                      </TabsTrigger>
                      <TabsTrigger value="telegram" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2 whitespace-nowrap">
                        <MessageCircle className="w-4 h-4" />
                        Telegram-Gruppe
                      </TabsTrigger>
                      <TabsTrigger value="address-lists" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2 whitespace-nowrap">
                        <List className="w-4 h-4" />
                        Adresslisten
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2 whitespace-nowrap">
                        <Settings className="w-4 h-4" />
                        Einstellungen
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-6">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle>Laufzeit</CardTitle>
                            <Button variant="outline" size="sm">Bearbeiten</Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Startdatum</p>
                              <p className="font-medium">
                                {project.start_date ? new Date(project.start_date).toLocaleDateString('de-DE') : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Enddatum</p>
                              <p className="font-medium">
                                {project.end_date ? new Date(project.end_date).toLocaleDateString('de-DE') : '-'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="dashboard" className="mt-6">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-center py-12">Dashboard wird noch implementiert</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="revenue" className="mt-6">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-center py-12">Umsatz-Übersicht wird noch implementiert</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="rockets-active" className="mt-6">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-center py-12">Raketen wird noch implementiert</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="commissions" className="mt-6">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-center py-12">Tarife wird noch implementiert</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="telegram" className="mt-6">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-center py-12">Telegram-Gruppe wird noch implementiert</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="address-lists" className="mt-6">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                          <div>
                            <CardTitle className="text-lg">Adresslisten</CardTitle>
                            <CardDescription className="text-sm">
                              Verwalten Sie die importierten Adresslisten für dieses Projekt
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  disabled={exporting}
                                  variant="outline"
                                  size="sm"
                                >
                                  {exporting ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5 mr-2" />
                                  )}
                                  Export
                                  <ChevronDown className="w-3.5 h-3.5 ml-2" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-background z-50">
                                <DropdownMenuItem 
                                  onSelect={(e) => { e.preventDefault(); handleExport('raw'); }}
                                  disabled={exporting}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Rohdatei
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onSelect={(e) => { e.preventDefault(); handleExport('rocket'); }}
                                  disabled={exporting}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Rocket Export
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button onClick={() => setAddListDialogOpen(true)} size="sm">
                              <Plus className="w-3.5 h-3.5 mr-2" />
                              Listen hinzufügen
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {lists.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p>Noch keine Listen importiert</p>
                              <p className="text-sm mt-2">Fügen Sie eine neue Liste hinzu, um zu beginnen</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {lists.map((list) => (
                                <div
                                  key={list.id}
                                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-medium truncate">{list.name}</h3>
                                        {getStatusBadge(list.status)}
                                      </div>
                                      {list.file_name && (
                                        <p className="text-sm text-muted-foreground truncate">
                                          Datei: {list.file_name}
                                        </p>
                                      )}
                                      {list.upload_stats && (list.status === 'completed' || list.status === 'importing' || list.status === 'geocoding' || list.status === 'failed') && (
                                        <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                                          <span className="text-muted-foreground">
                                            Adressen angelegt: <span className="font-medium text-foreground">{(list.upload_stats as any).successful || 0} / {(list.upload_stats as any).total || 0}</span>
                                          </span>
                                          <span className="text-muted-foreground">
                                            WE: <span className="font-medium text-foreground">{(list.upload_stats as any).units || 0}</span>
                                          </span>
                                          {(list.upload_stats as any).geocodingWarnings > 0 && (
                                            <span className="text-yellow-600 dark:text-yellow-500">
                                              ⚠ {(list.upload_stats as any).geocodingWarnings} ungenaue Koordinaten
                                            </span>
                                          )}
                                          {(list.upload_stats as any).failed > 0 && (
                                            <span className="flex items-center gap-2 text-red-600 dark:text-red-500">
                                              Fehler: <span className="font-medium">{(list.upload_stats as any).failed}</span>
                                              <Button variant="outline" size="xs" onClick={() => openFailedDialog(list.id)}>
                                                Fehler ansehen
                                              </Button>
                                            </span>
                                          )}
                                        </div>
                                      )}
                                        <p className="text-xs text-muted-foreground mt-2">
                                          Erstellt: {new Date(list.created_at).toLocaleDateString('de-DE', { 
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                         {(list.status === 'analyzing' || list.status === 'importing' || list.status === 'geocoding') && (
                                            <div className="mt-3">
                                             <div className="flex items-center justify-between text-xs mb-1">
                                               <span className="text-muted-foreground flex items-center gap-1.5">
                                                 <Loader2 className="h-3 w-3 animate-spin" />
                                                 {list.status === 'analyzing' && 'Analysiere...'}
                                                 {list.status === 'importing' && 'Importiere Adressen...'}
                                                 {list.status === 'geocoding' && 'Geokodierung läuft...'}
                                               </span>
                                               {list.upload_stats?.total && (
                                                 <span className="text-muted-foreground font-medium">
                                                   {(list as any).last_processed_index || 0} / {list.upload_stats.total}
                                                 </span>
                                               )}
                                             </div>
                                             <Progress 
                                               value={list.upload_stats?.total 
                                                 ? (((list as any).last_processed_index || 0) / list.upload_stats.total) * 100 
                                                 : 0} 
                                               className="h-2"
                                             />
                                             {(list as any).last_progress_at && (
                                               <p className="text-xs text-muted-foreground mt-1">
                                                 Zuletzt aktualisiert: {new Date((list as any).last_progress_at).toLocaleTimeString('de-DE')}
                                               </p>
                                             )}
                                           </div>
                                         )}
                                     </div>
                                     <div className="flex gap-2 ml-4">
                                       {(list.status === 'importing' || list.status === 'failed') && (
                                         <Button
                                           variant="outline"
                                           size="sm"
                                           onClick={async () => {
                                             try {
                                               const { error } = await supabase.functions.invoke('upload-street-list', {
                                                 body: { resumeListId: list.id }
                                               });
                                               
                                               if (error) throw error;
                                               
                                               toast.success('Import wird fortgesetzt...');
                                               loadLists();
                                             } catch (error) {
                                               console.error('Resume error:', error);
                                               toast.error('Import konnte nicht fortgesetzt werden');
                                             }
                                           }}
                                         >
                                           <PlayCircle className="h-4 w-4 mr-2" />
                                           Fortsetzen
                                         </Button>
                                       )}
                                       <DropdownMenu>
                                         <DropdownMenuTrigger asChild>
                                           <Button variant="outline" size="sm">
                                             <Download className="w-4 h-4 mr-2" />
                                             Export
                                             <ChevronDown className="w-4 h-4 ml-2" />
                                           </Button>
                                         </DropdownMenuTrigger>
                                          <DropdownMenuContent className="bg-background z-50">
                                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleExport('raw', list.id); }}>
                                              <Download className="w-4 h-4 mr-2" />
                                              Rohdatei
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleExport('rocket', list.id); }}>
                                              <Download className="w-4 h-4 mr-2" />
                                              Rocket Export
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                       </DropdownMenu>
                                       <Button 
                                         variant="outline" 
                                         size="sm"
                                         onClick={() => openDeleteDialog(list.id)}
                                       >
                                         <Trash2 className="w-4 h-4" />
                                       </Button>
                                     </div>
                                   </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="settings" className="mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Status Card */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Status-Einstellungen</CardTitle>
                            <CardDescription>
                              Verwalten Sie Standard- und eigene Status für dieses Projekt
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* Standard Status */}
                            <div>
                              <h3 className="text-sm font-semibold mb-3">Standard-Status</h3>
                              <p className="text-xs text-muted-foreground mb-3">
                                Diese Status sind immer verfügbar
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {DEFAULT_STATUSES.map((status) => (
                                  <div
                                    key={status.value}
                                    className={`px-3 py-1.5 text-sm font-medium rounded ${status.color}`}
                                  >
                                    {status.label}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Custom Status */}
                            <div>
                              <h3 className="text-sm font-semibold mb-3">Eigene Status</h3>
                              <div className="space-y-3">
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Label (z.B. Auf Rückruf warten)"
                                    value={newStatusLabel}
                                    onChange={(e) => setNewStatusLabel(e.target.value)}
                                    className="flex-1"
                                  />
                                  <Input
                                    type="color"
                                    value={newStatusColor}
                                    onChange={(e) => setNewStatusColor(e.target.value)}
                                    className="w-16"
                                  />
                                  <Button onClick={addCustomStatus} size="sm">
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>

                                {customStatuses.length > 0 && (
                                  <Select>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Eigene Status verwalten..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background z-50">
                                      {customStatuses.map((status) => (
                                        <div
                                          key={status.id}
                                          className="flex items-center justify-between p-2 hover:bg-muted"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="w-4 h-4 rounded"
                                              style={{ backgroundColor: status.color }}
                                            />
                                            <span className="text-sm">{status.label}</span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteCustomStatus(status);
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                          </Button>
                                        </div>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Rejection Reasons Card */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Kein-Interesse-Gründe</CardTitle>
                            <CardDescription>
                              Verwalten Sie Standard- und eigene Ablehnungsgründe
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* Standard Reasons */}
                            <div>
                              <h3 className="text-sm font-semibold mb-3">Standard-Gründe</h3>
                              <p className="text-xs text-muted-foreground mb-3">
                                "Anderer Grund" kann nicht gelöscht werden
                              </p>
                              <div className="space-y-2">
                                {DEFAULT_REJECTION_REASONS.map((reason) => (
                                  <div
                                    key={reason}
                                    className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                                  >
                                    <span>{reason}</span>
                                    {reason === "Anderer Grund" && (
                                      <span className="text-xs text-muted-foreground">(Pflicht)</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Custom Reasons */}
                            <div>
                              <h3 className="text-sm font-semibold mb-3">Eigene Gründe</h3>
                              <div className="space-y-3">
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Neuer Grund..."
                                    value={newReason}
                                    onChange={(e) => setNewReason(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addRejectionReason()}
                                    className="flex-1"
                                  />
                                  <Button onClick={addRejectionReason} size="sm">
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>

                                {rejectionReasons.length > 0 && (
                                  <Select>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Eigene Gründe verwalten..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background z-50">
                                      {rejectionReasons.map((reason) => (
                                        <div
                                          key={reason.id}
                                          className="flex items-center justify-between p-2 hover:bg-muted"
                                        >
                                          <span className="text-sm">{reason.reason}</span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteRejectionReason(reason.id, reason.reason);
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                          </Button>
                                        </div>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
          </div>
        ) : (
          <p>Projekt nicht gefunden</p>
        )}
      </div>
    </div>

    <ProjectAddListDialog
      projectId={id!}
      open={addListDialogOpen}
      onOpenChange={setAddListDialogOpen}
      onSuccess={loadLists}
    />

    <FailedAddressesDialog
      listId={failedListId}
      open={failedDialogOpen}
      onOpenChange={setFailedDialogOpen}
    />

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
                <AlertDialogTitle>Adressliste löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Wirklich alle Adressen dieser Liste löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteList} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={statusDeleteDialogOpen} onOpenChange={setStatusDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Status löschen
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {affectedUnitsCount > 0 ? (
                    <>
                      <p className="mb-4">
                        {affectedUnitsCount} Wohneinheit(en) verwenden diesen Status.
                        Bitte wählen Sie einen Ersatz-Status:
                      </p>
                      <Select value={replacementStatus} onValueChange={setReplacementStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Status auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {allStatuses
                            .filter(s => s.value !== statusToDelete?.name)
                            .map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    "Möchten Sie diesen Status wirklich löschen?"
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteStatus}
                  disabled={affectedUnitsCount > 0 && !replacementStatus}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ProjectDetail;
