import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Upload, Download, ChevronRight, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { useNavigate } from "react-router-dom";

interface Project {
  id: string;
  name: string;
  description?: string;
  provider_id?: string;
  status: string;
  created_at: string;
  created_by: string;
  marketing_type?: string;
  project_with_bonus?: boolean;
  target_quota?: number;
  unit_count?: number;
  saleable_units?: number;
  existing_customer_count?: number;
  rocket_count?: number;
  start_date?: string;
  end_date?: string;
  providers?: {
    name: string;
    abbreviation: string;
  };
}

const STATUS_OPTIONS = ['In Planung', 'Läuft', 'Laufend', 'Abgeschlossen'];

export const ProjectsSettings = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [expandedStatus, setExpandedStatus] = useState<Set<string>>(new Set());

  const { data: projects = [], isLoading: loading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          providers (
            name,
            abbreviation
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const STATUS_ORDER = ['In Planung', 'Läuft', 'Laufend', 'Abgeschlossen'];

  const { data: providers = [] } = useQuery({
    queryKey: ['providers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by provider, then by status
  const groupedByProvider = filteredProjects.reduce((acc, project) => {
    const providerId = project.provider_id || 'no-provider';
    const providerName = project.providers?.name || 'Kein Provider';
    
    if (!acc[providerId]) {
      acc[providerId] = {
        name: providerName,
        statuses: {}
      };
    }
    
    const status = project.status;
    if (!acc[providerId].statuses[status]) {
      acc[providerId].statuses[status] = [];
    }
    
    acc[providerId].statuses[status].push(project);
    return acc;
  }, {} as Record<string, { name: string; statuses: Record<string, Project[]> }>);

  // Sort statuses according to STATUS_ORDER
  const sortedGroupedByProvider = Object.entries(groupedByProvider).map(([providerId, providerData]) => {
    const sortedStatuses = STATUS_ORDER.reduce((acc, status) => {
      if (providerData.statuses[status]) {
        acc[status] = providerData.statuses[status];
      }
      return acc;
    }, {} as Record<string, Project[]>);
    
    return [providerId, { ...providerData, statuses: sortedStatuses }] as const;
  });

  const toggleProvider = (providerId: string) => {
    const newExpanded = new Set(expandedProviders);
    if (newExpanded.has(providerId)) {
      newExpanded.delete(providerId);
    } else {
      newExpanded.add(providerId);
    }
    setExpandedProviders(newExpanded);
  };

  const toggleStatus = (key: string) => {
    const newExpanded = new Set(expandedStatus);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedStatus(newExpanded);
  };

  const handleSelectProject = (projectId: string, checked: boolean) => {
    const newSelected = new Set(selectedProjects);
    if (checked) {
      newSelected.add(projectId);
    } else {
      newSelected.delete(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleStatusUpdate = async (projectId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Status aktualisiert');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(projects, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'projects.json';
    link.click();
    toast.success('Projekte exportiert');
  };

  const handleImport = () => {
    toast.info('Import-Funktion wird implementiert');
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

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'In Planung':
        return 'bg-blue-500';
      case 'Läuft':
        return 'bg-green-500';
      case 'Laufend':
        return 'bg-yellow-500';
      case 'Abgeschlossen':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Projekte</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImport}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Neues Projekt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Neues Projekt</DialogTitle>
              </DialogHeader>
              <CreateProjectDialog 
                providers={providers} 
                onClose={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Projekt suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg bg-card overflow-auto pb-4">
        <Table className="w-full min-w-max">
          <TableHeader className="bg-muted/30">
            <TableRow className="h-8">
              <TableHead className="min-w-[200px] h-8 py-1 text-xs font-semibold">GEBIET</TableHead>
              <TableHead className="min-w-[100px] h-8 py-1 text-xs font-semibold">STATUS</TableHead>
              <TableHead className="min-w-[150px] h-8 py-1 text-xs font-semibold">VERMARKTUNGSART</TableHead>
              <TableHead className="min-w-[100px] h-8 py-1 text-xs font-semibold">MIT BONUS</TableHead>
              <TableHead className="min-w-[120px] h-8 py-1 text-xs font-semibold">BONUS ABRECHNEN</TableHead>
              <TableHead className="min-w-[100px] h-8 py-1 text-xs font-semibold text-right">ZIELQUOTE</TableHead>
              <TableHead className="min-w-[100px] h-8 py-1 text-xs font-semibold text-right">QUOTE AKTUELL</TableHead>
              <TableHead className="min-w-[120px] h-8 py-1 text-xs font-semibold text-right">QUOTE DIFFERENZ</TableHead>
              <TableHead className="min-w-[100px] h-8 py-1 text-xs font-semibold text-right">ANZAHL WE</TableHead>
              <TableHead className="min-w-[100px] h-8 py-1 text-xs font-semibold text-right">SALEABLE WE</TableHead>
              <TableHead className="min-w-[120px] h-8 py-1 text-xs font-semibold text-right">RESTPOTENTIAL</TableHead>
              <TableHead className="min-w-[100px] h-8 py-1 text-xs font-semibold text-right">ANZAHL BK</TableHead>
              <TableHead className="min-w-[80px] h-8 py-1 text-xs font-semibold text-right">FAKTOR</TableHead>
              <TableHead className="min-w-[120px] h-8 py-1 text-xs font-semibold">STARTDATUM</TableHead>
              <TableHead className="min-w-[120px] h-8 py-1 text-xs font-semibold">ENDDATUM</TableHead>
              <TableHead className="min-w-[120px] h-8 py-1 text-xs font-semibold text-right">RAKETEN GESAMT</TableHead>
              <TableHead className="min-w-[120px] h-8 py-1 text-xs font-semibold text-right">RAKETEN DIFFERENZ</TableHead>
              <TableHead className="min-w-[110px] h-8 py-1 text-xs font-semibold text-right">RAKETEN AKTIV</TableHead>
              <TableHead className="min-w-[120px] h-8 py-1 text-xs font-semibold text-right">RAKETEN GEPLANT</TableHead>
              <TableHead className="min-w-[100px] h-8 py-1 text-xs font-semibold text-right">RAKETEN SOLL</TableHead>
              <TableHead className="min-w-[150px] h-8 py-1 text-xs font-semibold text-right">REST TAGE DES PROJEKT</TableHead>
              <TableHead className="min-w-[120px] h-8 py-1 text-xs font-semibold text-right">ZIELAUFTRÄGE</TableHead>
              <TableHead className="min-w-[150px] h-8 py-1 text-xs font-semibold text-right">IST - AUFTRÄGE GESAMT</TableHead>
              <TableHead className="min-w-[120px] h-8 py-1 text-xs font-semibold text-right">IST - AUFTRÄGE</TableHead>
              <TableHead className="min-w-[140px] h-8 py-1 text-xs font-semibold text-right">AUFTRÄGE DIFFERENZ</TableHead>
              <TableHead className="min-w-[150px] h-8 py-1 text-xs font-semibold">PROJEKTLEITER</TableHead>
              <TableHead className="min-w-[120px] h-8 py-1 text-xs font-semibold text-right">PROVISIONEN</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="h-8">
                  {Array.from({ length: 27 }).map((_, j) => (
                    <TableCell key={j} className="py-1">
                      <Skeleton className="h-3 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : sortedGroupedByProvider.length === 0 ? (
              <TableRow>
                <TableCell colSpan={27} className="text-center text-muted-foreground h-32">
                  Keine Projekte vorhanden
                </TableCell>
              </TableRow>
            ) : (
              sortedGroupedByProvider.map(([providerId, providerData]) => {
                const totalProjects = Object.values(providerData.statuses).flat().length;
                const isProviderExpanded = expandedProviders.has(providerId);
                
                return (
                  <React.Fragment key={providerId}>
                    {/* Provider Row */}
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/30 h-10"
                      onClick={() => toggleProvider(providerId)}
                    >
                      <TableCell className="py-2 relative" colSpan={27}>
                        <div className={`absolute left-1 top-1/2 -translate-y-1/2 w-1 ${isProviderExpanded ? 'h-8' : 'h-5'} rounded-full bg-blue-500`} />
                        <div className="flex items-center gap-2 pl-4">
                          {isProviderExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-normal text-foreground">{providerData.name}</span>
                          <Badge className="text-xs h-5 px-2 bg-blue-500 text-white border-0">
                            {totalProjects}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Status Rows (only if provider is expanded) */}
                    {isProviderExpanded && Object.entries(providerData.statuses).map(([status, statusProjects]) => {
                      const statusKey = `${providerId}-${status}`;
                      const isStatusExpanded = expandedStatus.has(statusKey);
                      
                      return (
                        <React.Fragment key={statusKey}>
                          <TableRow 
                            className="cursor-pointer hover:bg-muted/30 h-9 relative"
                            onClick={() => toggleStatus(statusKey)}
                          >
                            <TableCell className="py-2" colSpan={27}>
                              <div className={`absolute left-2 top-1/2 -translate-y-1/2 w-1 ${isStatusExpanded ? 'h-7' : 'h-4'} rounded-full ${getStatusBgColor(status)}`} />
                              <div className="flex items-center gap-2 pl-4">
                                {isStatusExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                                <span className="text-sm font-normal text-foreground">{status.toUpperCase()}</span>
                                <Badge className={`text-xs h-5 px-2 border-0 text-white ${getStatusBgColor(status)}`}>
                                  {statusProjects.length}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Project Rows (only if status is expanded) */}
                          {isStatusExpanded && statusProjects.map((project) => (
                            <TableRow 
                              key={project.id} 
                              className="cursor-pointer hover:bg-muted/50 h-9"
                              onClick={() => navigate(`/settings/projects/${project.id}`)}
                            >
                              <TableCell className="py-2 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium">
                                {project.name}
                              </TableCell>
                              <TableCell className="py-2 text-xs" onClick={(e) => e.stopPropagation()}>
                                <Select
                                  value={project.status}
                                  onValueChange={(value) => handleStatusUpdate(project.id, value)}
                                >
                                  <SelectTrigger className={`w-auto h-7 border-0 rounded-md px-3 ${getStatusColor(project.status)} hover:opacity-80`}>
                                    <SelectValue>
                                      <span className="text-xs font-normal">{project.status.toUpperCase()}</span>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STATUS_OPTIONS.map((status) => (
                                      <SelectItem key={status} value={status} className="cursor-pointer">
                                        <span className={`inline-block text-xs font-normal px-3 py-1 rounded-md ${getStatusColor(status)}`}>
                                          {status.toUpperCase()}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="py-2 text-xs">{project.marketing_type || '-'}</TableCell>
                              <TableCell className="py-2 text-xs">{project.project_with_bonus ? 'Ja' : 'Nein'}</TableCell>
                              <TableCell className="py-2 text-xs">-</TableCell>
                              <TableCell className="py-2 text-xs text-right">{project.target_quota ? `${project.target_quota}%` : '-'}</TableCell>
                              <TableCell className="py-2 text-xs text-right">0%</TableCell>
                              <TableCell className="py-2 text-xs text-right">-</TableCell>
                              <TableCell className="py-2 text-xs text-right">{project.unit_count || '-'}</TableCell>
                              <TableCell className="py-2 text-xs text-right">{project.saleable_units || '-'}</TableCell>
                              <TableCell className="py-2 text-xs text-right">-</TableCell>
                              <TableCell className="py-2 text-xs text-right">{project.existing_customer_count || '-'}</TableCell>
                              <TableCell className="py-2 text-xs text-right">-</TableCell>
                              <TableCell className="py-2 text-xs">
                                {project.start_date ? new Date(project.start_date).toLocaleDateString('de-DE') : '-'}
                              </TableCell>
                              <TableCell className="py-2 text-xs">
                                {project.end_date ? new Date(project.end_date).toLocaleDateString('de-DE') : '-'}
                              </TableCell>
                              <TableCell className="py-2 text-xs text-right">{project.rocket_count || '-'}</TableCell>
                              <TableCell className="py-2 text-xs text-right">-</TableCell>
                              <TableCell className="py-2 text-xs text-right">-</TableCell>
                              <TableCell className="py-2 text-xs text-right">-</TableCell>
                              <TableCell className="py-2 text-xs text-right">-</TableCell>
                              <TableCell className="py-2 text-xs text-right">-</TableCell>
                              <TableCell className="py-2 text-xs text-right">-</TableCell>
                              <TableCell className="py-2 text-xs text-right">-</TableCell>
                              <TableCell className="py-2 text-xs text-right">-</TableCell>
                              <TableCell className="py-2 text-xs text-right">-</TableCell>
                              <TableCell className="py-2 text-xs">-</TableCell>
                              <TableCell className="py-2 text-xs text-right">-</TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};