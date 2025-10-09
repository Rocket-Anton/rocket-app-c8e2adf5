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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    // DUMMY DATA FOR TESTING
    const dummyProjects: Project[] = [
      {
        id: 'dummy-1',
        name: 'VVM - Stuttgart Mitte',
        status: 'In Planung',
        area_name: 'Mitte',
        city: 'Stuttgart',
        coordinates: null,
        color: '#3b82f6',
        provider_id: 'vvm-id',
        providers: {
          id: 'vvm-id',
          name: 'VVM',
          color: '#3b82f6'
        }
      },
      {
        id: 'dummy-2',
        name: 'NC - Ravensburg',
        status: 'Laufend',
        area_name: null,
        city: 'Ravensburg',
        coordinates: null,
        color: '#10b981',
        provider_id: 'nc-id',
        providers: {
          id: 'nc-id',
          name: 'NC',
          color: '#10b981'
        }
      },
      {
        id: 'dummy-3',
        name: 'VVM - Karlsruhe Nord',
        status: 'Abgeschlossen',
        area_name: 'Nord',
        city: 'Karlsruhe',
        coordinates: null,
        color: '#3b82f6',
        provider_id: 'vvm-id',
        providers: {
          id: 'vvm-id',
          name: 'VVM',
          color: '#3b82f6'
        }
      }
    ];

    const dummyProviders: Provider[] = [
      { id: 'vvm-id', name: 'VVM', color: '#3b82f6' },
      { id: 'nc-id', name: 'NC', color: '#10b981' }
    ];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('ProjectSelector: No user found');
        // Set dummy data even without user for testing
        setProjects(dummyProjects);
        setProviders(dummyProviders);
        setLoading(false);
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

        // Merge with dummy providers
        dummyProviders.forEach(p => uniqueProviders.set(p.id, p));

        setProviders(Array.from(uniqueProviders.values()));
        
        // Merge real data with dummy data
        const allProjects = [...projectsWithColors, ...dummyProjects];
        setProjects(allProjects);
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

      // Merge with dummy providers
      dummyProviders.forEach(p => uniqueProviders.set(p.id, p));

      setProviders(Array.from(uniqueProviders.values()));
      
      // Merge real data with dummy data
      const allProjects = [...projectsWithColors, ...dummyProjects];
      setProjects(allProjects);
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
    if (statusFilter !== "all" && project.status !== statusFilter) return false;
    // Provider filter
    if (providerFilter !== "all" && project.provider_id !== providerFilter) return false;
    return true;
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("gap-1.5 h-8 text-xs px-2.5", className)}
          disabled={loading}
        >
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-xs whitespace-nowrap">{displayText}</span>
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[9px]">
              {selectedCount}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px] p-0 z-[1001] bg-background">
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

            {/* Filter Icon with Popup */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 relative">
                  <Filter className="h-3.5 w-3.5" />
                  {(statusFilter !== "all" || providerFilter !== "all") && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-semibold border-2 border-background">
                      {(statusFilter !== "all" ? 1 : 0) + (providerFilter !== "all" ? 1 : 0)}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2.5 z-[1002] max-h-[320px] overflow-y-auto" align="end">
                <div className="space-y-2.5">
                  {/* Status Select */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Status wählen" />
                      </SelectTrigger>
                      <SelectContent className="z-[1003] p-1">
                        <SelectItem value="all" className="mb-1">Alle Status</SelectItem>
                        <SelectItem value="In Planung" className="p-0 mb-1">
                          <div className="px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium w-fit mx-auto">
                            IN PLANUNG
                          </div>
                        </SelectItem>
                        <SelectItem value="Läuft" className="p-0 mb-1">
                          <div className="px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium w-fit mx-auto">
                            LÄUFT
                          </div>
                        </SelectItem>
                        <SelectItem value="Laufend" className="p-0 mb-1">
                          <div className="px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 text-xs font-medium w-fit mx-auto">
                            LAUFEND
                          </div>
                        </SelectItem>
                        <SelectItem value="Abgeschlossen" className="p-0">
                          <div className="px-2 py-1 rounded-md bg-red-100 text-red-800 text-xs font-medium w-fit mx-auto">
                            ABGESCHLOSSEN
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Provider Select */}
                  {providers.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium">Provider</label>
                      <Select value={providerFilter} onValueChange={setProviderFilter}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Provider wählen" />
                        </SelectTrigger>
                        <SelectContent className="z-[1003]">
                          <SelectItem value="all">Alle Provider</SelectItem>
                          {providers.map(provider => (
                            <SelectItem key={provider.id} value={provider.id}>
                              <div className="flex items-center gap-1.5">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: provider.color }}
                                />
                                <span>{provider.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Reset Button */}
                  {(statusFilter !== "all" || providerFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStatusFilter("all");
                        setProviderFilter("all");
                      }}
                      className="w-full h-6 text-[11px]"
                    >
                      Filter zurücksetzen
                    </Button>
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
        
        <ScrollArea className={cn("min-h-0", filteredProjects.length > 3 ? "h-[132px]" : "h-auto max-h-[132px]")}>
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
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleProjectToggle(project.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleProjectToggle(project.id);
                    }
                  }}
                  className="w-full flex items-start gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors text-left cursor-pointer"
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
                          "text-[10px] px-1 py-0 h-4 border-0 text-white rounded-sm",
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
                </div>
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