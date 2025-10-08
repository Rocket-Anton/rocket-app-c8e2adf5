import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
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
                  
                  <div className="bg-card p-6 rounded-lg border">
                    <p className="text-muted-foreground">
                      {project.description || "Keine Beschreibung vorhanden"}
                    </p>
                  </div>
                </div>
              ) : (
                <p>Projekt nicht gefunden</p>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ProjectDetail;
