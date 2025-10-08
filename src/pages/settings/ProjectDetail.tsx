import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, FileText, CheckCircle, AlertCircle, Loader2, Download, Send, Info, BarChart3, DollarSign, Rocket, MessageCircle, List, Trash2, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectAddListDialog } from "@/components/settings/ProjectAddListDialog";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  }, [id]);

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

  const openDeleteDialog = (listId: string) => {
    setListToDelete(listId);
    setDeleteDialogOpen(true);
  };

  const handleExport = async () => {
    if (!id) return;
    
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-project-addresses', {
        body: { projectId: id },
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rocket-app-export-${project?.name || id}.csv`;
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
      pending: { variant: "secondary" as const, label: "Ausstehend", icon: FileText },
      analyzing: { variant: "default" as const, label: "Analysiere...", icon: Loader2 },
      mapped: { variant: "default" as const, label: "Gemappt", icon: CheckCircle },
      importing: { variant: "default" as const, label: "Importiert...", icon: Loader2 },
      completed: { variant: "default" as const, label: "Abgeschlossen", icon: CheckCircle },
      failed: { variant: "destructive" as const, label: "Fehler", icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${status === 'analyzing' || status === 'importing' ? 'animate-spin' : ''}`} />
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
                      <Button variant="default" size="sm">
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
                    <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
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
                        Raketen aktiv
                      </TabsTrigger>
                      <TabsTrigger value="rockets-planned" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2 whitespace-nowrap">
                        <Rocket className="w-4 h-4" />
                        Raketen geplant
                      </TabsTrigger>
                      <TabsTrigger value="commissions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2 whitespace-nowrap">
                        <DollarSign className="w-4 h-4" />
                        Provisionen
                      </TabsTrigger>
                      <TabsTrigger value="telegram" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2 whitespace-nowrap">
                        <MessageCircle className="w-4 h-4" />
                        Telegram-Gruppe
                      </TabsTrigger>
                      <TabsTrigger value="address-lists" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2 whitespace-nowrap">
                        <List className="w-4 h-4" />
                        Adresslisten
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
                          <p className="text-muted-foreground text-center py-12">Raketen aktiv wird noch implementiert</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="rockets-planned" className="mt-6">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-center py-12">Raketen geplant wird noch implementiert</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="commissions" className="mt-6">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground text-center py-12">Provisionen wird noch implementiert</p>
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
                            <CardTitle>Adresslisten</CardTitle>
                            <CardDescription>
                              Verwalten Sie die importierten Adresslisten für dieses Projekt
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={handleExport}
                              disabled={exporting || lists.length === 0}
                              variant="outline"
                            >
                              {exporting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 mr-2" />
                              )}
                              Rocket App Export
                            </Button>
                            <Button onClick={() => setAddListDialogOpen(true)}>
                              <Plus className="w-4 h-4 mr-2" />
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
                                      {list.upload_stats && (
                                        <div className="flex gap-4 mt-2 text-sm">
                                          <span className="text-muted-foreground">
                                            Gesamt: <span className="font-medium text-foreground">{list.upload_stats.total || 0}</span>
                                          </span>
                                          <span className="text-green-600 dark:text-green-500">
                                            Erfolgreich: <span className="font-medium">{list.upload_stats.successful || 0}</span>
                                          </span>
                                          {list.upload_stats.failed > 0 && (
                                            <span className="text-red-600 dark:text-red-500">
                                              Fehler: <span className="font-medium">{list.upload_stats.failed}</span>
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
                                       {(list.status === 'analyzing' || list.status === 'importing') && (
                                         <div className="mt-3">
                                           <div className="flex items-center justify-between text-xs mb-1">
                                             <span className="text-muted-foreground">
                                               {list.status === 'analyzing' ? 'Analysiere...' : 'Importiere...'}
                                             </span>
                                             {list.upload_stats?.total && (
                                               <span className="text-muted-foreground">
                                                 {list.upload_stats.successful || 0} / {list.upload_stats.total}
                                               </span>
                                             )}
                                           </div>
                                           <Progress 
                                             value={list.upload_stats?.total ? ((list.upload_stats.successful || 0) / list.upload_stats.total) * 100 : 0} 
                                             className="h-2"
                                           />
                                         </div>
                                       )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            <Download className="w-4 h-4 mr-2" />
                                            Export
                                            <ChevronDown className="w-4 h-4 ml-2" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-background z-50">
                                          <DropdownMenuItem>
                                            <Download className="w-4 h-4 mr-2" />
                                            Rohdatei
                                          </DropdownMenuItem>
                                          <DropdownMenuItem>
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
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ProjectDetail;
