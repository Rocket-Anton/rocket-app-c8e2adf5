import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectAddListDialog } from "@/components/settings/ProjectAddListDialog";

interface Project {
  id: string;
  name: string;
  description: string | null;
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
                  <div className="flex items-center gap-4 mb-6">
                    {project.providers && (
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={project.providers.logo_url || undefined} />
                        <AvatarFallback>{project.providers.abbreviation}</AvatarFallback>
                      </Avatar>
                    )}
                    <h1 className="text-3xl font-bold">{project.name}</h1>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-card p-6 rounded-lg border">
                      <p className="text-muted-foreground">
                        {project.description || "Keine Beschreibung vorhanden"}
                      </p>
                    </div>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                          <CardTitle>Adresslisten</CardTitle>
                          <CardDescription>
                            Verwalten Sie die importierten Adresslisten für dieses Projekt
                          </CardDescription>
                        </div>
                        <Button onClick={() => setAddListDialogOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Liste hinzufügen
                        </Button>
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
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
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
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ProjectDetail;
