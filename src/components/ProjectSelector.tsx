import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, ChevronDown, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Provider {
  id: string;
  name: string;
  color: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  area_name: string | null;
  city: string | null;
  coordinates: any;
  color: string | null;
  provider_id: string | null;
  providers?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface ProjectSelectorProps {
  selectedProjectIds: Set<string>;
  onProjectsChange: (projectIds: Set<string>) => void;
  className?: string;
}

const statusColors: Record<string, string> = {
  "In Planung": "bg-yellow-500",
  "Aktiv": "bg-green-500",
  "Läuft": "bg-green-500",
  "Abgeschlossen": "bg-blue-500",
  "Pausiert": "bg-gray-500",
  "Abgebrochen": "bg-red-500",
};

export function ProjectSelector({ selectedProjectIds, onProjectsChange, className }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [providerFilter, setProviderFilter] = useState<string[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('ProjectSelector: No user found');
        return;
      }

      console.log('ProjectSelector: User ID:', user.id);

      // Check if user is admin
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('ProjectSelector: User roles:', userRoles, 'Error:', rolesError);

      const isAdmin = userRoles?.role === 'admin';
      console.log('ProjectSelector: Is admin?', isAdmin);

      let query = supabase
        .from('projects')
        .select('id, name, status, area_name, city, coordinates, provider_id, providers(id, name, color)')
        .order('name');

      // For non-admins, filter by assigned projects or project manager
      if (!isAdmin) {
        // Load assigned project IDs first (no subqueries in PostgREST filters)
        const { data: assignments, error: assignError } = await supabase
          .from('project_rockets')
          .select('project_id')
          .eq('user_id', user.id);

        console.log('ProjectSelector: assignments', assignments, 'Error:', assignError);

        const assignedIds = (assignments || []).map((a: any) => a.project_id).filter(Boolean);

        // Fetch managed projects
        const { data: managed = [], error: managedError } = await supabase
          .from('projects')
          .select('id, name, status, area_name, city, coordinates, provider_id, providers(id, name, color)')
          .eq('project_manager_id', user.id);
        if (managedError) console.warn('ProjectSelector: managed projects error', managedError);

        // Fetch assigned projects (if any)
        let assignedProjects: any[] = [];
        if (assignedIds.length > 0) {
          const { data: ap = [], error: apError } = await supabase
            .from('projects')
            .select('id, name, status, area_name, city, coordinates, provider_id, providers(id, name, color)')
            .in('id', assignedIds);
          if (apError) console.warn('ProjectSelector: assigned projects error', apError);
          assignedProjects = ap || [];
        }

        // Merge and de-duplicate
        const merged = [...managed, ...assignedProjects];
        const unique = Array.from(new Map(merged.map((p: any) => [p.id, p])).values());

        // Assign colors and extract providers
        const projectsWithColors = unique.map((project: any) => {
          const providerColor = project.providers?.color;
          const color = providerColor || '#3b82f6';
          return { ...project, color };
        });

        // Extract unique providers from user's projects
        const uniqueProviders = new Map<string, Provider>();
        unique.forEach((project: any) => {
          if (project.providers && project.providers.id) {
            uniqueProviders.set(project.providers.id, {
              id: project.providers.id,
              name: project.providers.name,
              color: project.providers.color || '#3b82f6'
            });
          }
        });

        setProviders(Array.from(uniqueProviders.values()));
        setProjects(projectsWithColors);
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      console.log('ProjectSelector: Projects data:', data, 'Error:', error);

      if (error) throw error;

      // Use provider color if available, otherwise fallback
      const projectsWithColors = (data || []).map(project => {
        const providerColor = project.providers?.color;
        const color = providerColor || '#3b82f6';
        return {
          ...project,
          color
        };
      });

      // Extract unique providers for admins
      const uniqueProviders = new Map<string, Provider>();
      (data || []).forEach((project: any) => {
        if (project.providers && project.providers.id) {
          uniqueProviders.set(project.providers.id, {
            id: project.providers.id,
            name: project.providers.name,
            color: project.providers.color || '#3b82f6'
          });
        }
      });

      setProviders(Array.from(uniqueProviders.values()));
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
    console.log('Project toggle - new selection:', Array.from(newSelected));
    onProjectsChange(newSelected);
  };

  const selectedCount = selectedProjectIds.size;
  const displayText = selectedCount === 0 
    ? "Projekte wählen" 
    : selectedCount === 1 
      ? projects.find(p => selectedProjectIds.has(p.id))?.name || "1 Projekt"
      : `${selectedCount} Projekte`;

  // Get unique statuses
  const uniqueStatuses = Array.from(new Set(projects.map(p => p.status)));

  // Apply filters to projects
  const filteredProjects = projects.filter(project => {
    // Search filter
    if (searchQuery && !project.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    // Status filter
    if (statusFilter.length > 0 && !statusFilter.includes(project.status)) return false;
    // Provider filter
    if (providerFilter.length > 0 && project.provider_id && !providerFilter.includes(project.provider_id)) return false;
    return true;
  });

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
      <DropdownMenuContent align="end" className="w-[280px] p-0 z-[1001] bg-background">
        <div className="p-2 border-b space-y-2">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Projekt suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-8 text-xs"
              />
            </div>

            {/* Combined Filter Dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                  <Filter className="h-3.5 w-3.5" />
                  {(statusFilter.length > 0 || providerFilter.length > 0) && (
                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary text-[8px] text-primary-foreground flex items-center justify-center">
                      {statusFilter.length + providerFilter.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0 z-[1002]" align="end">
                <div className="p-2 space-y-3">
                  {/* Status Filter Section */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                      Status
                    </div>
                    <div className="space-y-0.5">
                      {uniqueStatuses.map(status => (
                        <label key={status} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded text-xs">
                          <Checkbox
                            checked={statusFilter.includes(status)}
                            onCheckedChange={(checked) => {
                              setStatusFilter(prev =>
                                checked
                                  ? [...prev, status]
                                  : prev.filter(s => s !== status)
                              );
                            }}
                            className="h-3.5 w-3.5"
                          />
                          <span>{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Provider Filter Section */}
                  {providers.length > 0 && (
                    <>
                      <div className="border-t" />
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                          Provider
                        </div>
                        <div className="space-y-0.5">
                          {providers.map(provider => (
                            <label key={provider.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded text-xs">
                              <Checkbox
                                checked={providerFilter.includes(provider.id)}
                                onCheckedChange={(checked) => {
                                  setProviderFilter(prev =>
                                    checked
                                      ? [...prev, provider.id]
                                      : prev.filter(p => p !== provider.id)
                                  );
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <div className="flex items-center gap-1.5">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: provider.color }}
                                />
                                <span>{provider.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Reset Button */}
                  {(statusFilter.length > 0 || providerFilter.length > 0) && (
                    <>
                      <div className="border-t" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStatusFilter([]);
                          setProviderFilter([]);
                        }}
                        className="w-full h-7 text-xs"
                      >
                        Filter zurücksetzen
                      </Button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {filteredProjects.length} von {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekten'}
            </p>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="h-5 text-[10px] px-2"
              >
                Suche löschen
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Lädt...</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Keine Projekte verfügbar</div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Keine Projekte mit diesen Filtern</div>
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectToggle(project.id)}
                  className="w-full flex items-start gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors text-left"
                >
                  <Checkbox
                    checked={selectedProjectIds.has(project.id)}
                    onCheckedChange={() => handleProjectToggle(project.id)}
                    className="mt-0.5 h-3.5 w-3.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: project.color || '#3b82f6' }}
                      />
                      <span className="font-medium text-xs truncate">
                        {project.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] px-1 py-0 h-4 border-0 text-white",
                          statusColors[project.status]
                        )}
                      >
                        {project.status}
                      </Badge>
                      {(project.area_name || project.city) && (
                        <span className="text-[10px] text-muted-foreground truncate">
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