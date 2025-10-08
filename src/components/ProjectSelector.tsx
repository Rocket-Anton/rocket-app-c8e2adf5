import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  status: string;
  area_name: string | null;
  city: string | null;
  coordinates: any;
  color: string | null;
}

interface ProjectSelectorProps {
  selectedProjectIds: Set<string>;
  onProjectsChange: (projectIds: Set<string>) => void;
  className?: string;
}

const statusColors: Record<string, string> = {
  "In Planung": "bg-yellow-500",
  "Aktiv": "bg-green-500",
  "Abgeschlossen": "bg-blue-500",
  "Pausiert": "bg-gray-500",
  "Abgebrochen": "bg-red-500",
};

export function ProjectSelector({ selectedProjectIds, onProjectsChange, className }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is admin
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const isAdmin = userRoles?.role === 'admin';

      let query = supabase
        .from('projects')
        .select('id, name, status, area_name, city, coordinates')
        .order('name');

      // For non-admins, filter by assigned projects or project manager
      if (!isAdmin) {
        query = query.or(`project_manager_id.eq.${user.id},id.in.(
          select project_id from project_rockets where user_id = '${user.id}'
        )`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Assign colors based on project id for consistency
      const projectsWithColors = (data || []).map(project => {
        const hash = project.id.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        const color = `hsl(${Math.abs(hash) % 360}, 65%, 55%)`;
        return {
          ...project,
          color
        };
      });

      setProjects(projectsWithColors);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectToggle = (projectId: string) => {
    const newSelected = new Set(selectedProjectIds);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    onProjectsChange(newSelected);
  };

  const selectedCount = selectedProjectIds.size;
  const displayText = selectedCount === 0 
    ? "Projekte wählen" 
    : selectedCount === 1 
      ? projects.find(p => selectedProjectIds.has(p.id))?.name || "1 Projekt"
      : `${selectedCount} Projekte`;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("gap-2", className)}
          disabled={loading}
        >
          <MapPin className="h-4 w-4" />
          <span>{displayText}</span>
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selectedCount}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] p-0 z-[1001] bg-background">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Projekte auswählen</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'} verfügbar
          </p>
        </div>
        
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Lädt...</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Keine Projekte verfügbar</div>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectToggle(project.id)}
                  className="w-full flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                >
                  <Checkbox
                    checked={selectedProjectIds.has(project.id)}
                    onCheckedChange={() => handleProjectToggle(project.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: project.color || '#3b82f6' }}
                      />
                      <span className="font-medium text-sm truncate">
                        {project.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          statusColors[project.status] && "border-0 text-white",
                        )}
                        style={{
                          backgroundColor: statusColors[project.status] || undefined
                        }}
                      >
                        {project.status}
                      </Badge>
                      {(project.area_name || project.city) && (
                        <span className="text-xs text-muted-foreground truncate">
                          {project.area_name || project.city}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {selectedCount > 0 && (
          <div className="p-2 border-t flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onProjectsChange(new Set())}
            >
              Alle abwählen
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Anzeigen
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}