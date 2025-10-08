import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Search, Upload, Download, ChevronRight, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Project {
  id: string;
  name: string;
  description?: string;
  provider_id?: string;
  status: string;
  created_at: string;
  created_by: string;
  providers?: {
    name: string;
    abbreviation: string;
  };
}

const STATUS_OPTIONS = ['In Planung', 'Läuft', 'Abgeschlossen'];

export const ProjectsSettings = () => {
  const queryClient = useQueryClient();
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

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by provider, then by status
  const groupedByProvider = filteredProjects.reduce((acc, project) => {
    const providerId = project.provider_id || 'no-provider';
    const providerName = project.providers?.abbreviation || 'Kein Provider';
    
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neues Projekt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Dialog-Inhalte werden noch implementiert
                </p>
              </div>
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

      <div className="border rounded-lg bg-card overflow-auto">
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
            ) : Object.keys(groupedByProvider).length === 0 ? (
              <TableRow>
                <TableCell colSpan={27} className="text-center text-muted-foreground h-32">
                  Keine Projekte vorhanden
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(groupedByProvider).map(([providerId, providerData]) => {
                const totalProjects = Object.values(providerData.statuses).flat().length;
                const isProviderExpanded = expandedProviders.has(providerId);
                
                return (
                  <>
                    {/* Provider Row */}
                    <TableRow 
                      key={`provider-${providerId}`}
                      className="cursor-pointer hover:bg-muted/30 h-8 font-semibold"
                      onClick={() => toggleProvider(providerId)}
                    >
                      <TableCell className="py-1" colSpan={27}>
                        <div className="flex items-center gap-2">
                          {isProviderExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span className="text-xs">{providerData.name}</span>
                          <Badge variant="secondary" className="text-xs h-5 px-2">
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
                        <>
                          <TableRow 
                            key={`status-${statusKey}`}
                            className="cursor-pointer hover:bg-muted/20 h-8 bg-muted/10"
                            onClick={() => toggleStatus(statusKey)}
                          >
                            <TableCell className="py-1" colSpan={27}>
                              <div className="flex items-center gap-2 pl-6">
                                {isStatusExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                                <span className="text-xs font-medium">{status}</span>
                                <Badge variant="outline" className="text-xs h-5 px-2">
                                  {statusProjects.length}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Project Rows (only if status is expanded) */}
                          {isStatusExpanded && statusProjects.map((project) => (
                            <TableRow 
                              key={project.id} 
                              className="cursor-pointer hover:bg-muted/50 h-8"
                            >
                              <TableCell className="py-1 pl-12 text-xs">
                                {project.name}
                              </TableCell>
                              <TableCell className="py-1 text-xs">{project.status}</TableCell>
                              <TableCell className="py-1 text-xs">-</TableCell>
                              <TableCell className="py-1 text-xs">-</TableCell>
                              <TableCell className="py-1 text-xs">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs">-</TableCell>
                              <TableCell className="py-1 text-xs">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                              <TableCell className="py-1 text-xs">-</TableCell>
                              <TableCell className="py-1 text-xs text-right">-</TableCell>
                            </TableRow>
                          ))}
                        </>
                      );
                    })}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};