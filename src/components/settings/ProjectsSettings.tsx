import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Search, Filter, Upload, Download, ChevronDown } from "lucide-react";
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

interface Provider {
  id: string;
  name: string;
  abbreviation: string;
}

const STATUS_OPTIONS = ['In Planung', 'Läuft', 'Abgeschlossen'];

export const ProjectsSettings = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [groupByProvider, setGroupByProvider] = useState<string>("all");
  const [groupByStatus, setGroupByStatus] = useState<string>("all");

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

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, name, abbreviation")
        .order("name");

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = groupByProvider === "all" || project.provider_id === groupByProvider;
    const matchesStatus = groupByStatus === "all" || project.status === groupByStatus;
    return matchesSearch && matchesProvider && matchesStatus;
  });

  // Group projects by status
  const groupedProjects = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = filteredProjects.filter(p => p.status === status);
    return acc;
  }, {} as Record<string, Project[]>);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
    } else {
      setSelectedProjects(new Set());
    }
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

      {/* Grouping Section */}
      <div className="mb-4 p-4 border rounded-lg bg-muted/30">
        <div className="text-sm font-medium mb-3">Grouping</div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Select value={groupByProvider} onValueChange={setGroupByProvider}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Provider Name" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Alle Provider</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={groupByStatus} onValueChange={setGroupByStatus}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Alle Status</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Projekt suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="space-y-6">
        {STATUS_OPTIONS.map((status) => {
          const statusProjects = groupedProjects[status];
          if (statusProjects.length === 0) return null;

          return (
            <div key={status} className="border rounded-lg bg-card">
              <div className="bg-muted/50 px-4 py-2 font-semibold text-sm border-b">
                {status} ({statusProjects.length})
              </div>
              <div className="overflow-auto">
                <Table className="w-full min-w-max">
                  <TableHeader className="bg-muted/30">
                    <TableRow className="h-8">
                      <TableHead className="w-[40px] h-8 py-1">
                        <Checkbox
                          checked={statusProjects.every(p => selectedProjects.has(p.id))}
                          onCheckedChange={(checked) => {
                            statusProjects.forEach(p => handleSelectProject(p.id, checked as boolean));
                          }}
                        />
                      </TableHead>
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
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i} className="h-8">
                          <TableCell className="py-1">
                            <Skeleton className="h-4 w-4" />
                          </TableCell>
                          {Array.from({ length: 27 }).map((_, j) => (
                            <TableCell key={j} className="py-1">
                              <Skeleton className="h-3 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      statusProjects.map((project) => (
                        <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50 h-8">
                          <TableCell className="py-1" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedProjects.has(project.id)}
                              onCheckedChange={(checked) => handleSelectProject(project.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="py-1 text-xs font-medium">
                            {project.providers?.abbreviation && `${project.providers.abbreviation} - `}
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && !loading && (
          <div className="border rounded-lg bg-card p-8 text-center text-muted-foreground">
            Keine Projekte vorhanden
          </div>
        )}
      </div>
    </div>
  );
};