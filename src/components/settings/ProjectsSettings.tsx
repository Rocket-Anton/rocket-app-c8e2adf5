import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  provider_id: string | null;
  created_at: string;
  providers?: { name: string };
}

interface Provider {
  id: string;
  name: string;
  abbreviation: string;
}

export const ProjectsSettings = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", provider_id: "" });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      // Load providers
      const providersResponse = await supabase
        .from("providers")
        .select("id, name, abbreviation")
        .order("name");

      if (providersResponse.error) throw providersResponse.error;
      setProviders(providersResponse.data || []);

      // Load projects
      const projectsResponse = await supabase
        .from("projects")
        .select("id, name, description, provider_id, created_at")
        .order("created_at", { ascending: false });

      if (projectsResponse.error) throw projectsResponse.error;
      
      // Enrich with provider names
      const enrichedProjects: Project[] = (projectsResponse.data || []).map((proj: any) => {
        const provider = providersResponse.data?.find(p => p.id === proj.provider_id);
        return {
          ...proj,
          providers: provider ? { name: provider.name } : undefined
        };
      });
      
      setProjects(enrichedProjects);
    } catch (error: any) {
      toast.error("Fehler beim Laden der Projekte");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      // Get provider abbreviation if provider is selected
      let projectName = formData.name;
      if (formData.provider_id && !editingProject) {
        const selectedProvider = providers.find(p => p.id === formData.provider_id);
        if (selectedProvider && selectedProvider.abbreviation) {
          // Only prepend if name doesn't already start with the abbreviation
          if (!projectName.startsWith(selectedProvider.abbreviation + "-")) {
            projectName = `${selectedProvider.abbreviation}-${projectName}`;
          }
        }
      }

      if (editingProject) {
        const { error } = await supabase
          .from("projects")
          .update({
            name: projectName,
            description: formData.description,
            provider_id: formData.provider_id || null,
          })
          .eq("id", editingProject.id);

        if (error) throw error;
        toast.success("Projekt aktualisiert");
      } else {
        const { error } = await supabase
          .from("projects")
          .insert({
            name: projectName,
            description: formData.description,
            provider_id: formData.provider_id || null,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("Projekt erstellt");
      }

      setFormData({ name: "", description: "", provider_id: "" });
      setIsCreateOpen(false);
      setEditingProject(null);
      loadProjects();
    } catch (error: any) {
      toast.error("Fehler beim Speichern");
      console.error(error);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      provider_id: project.provider_id || "",
    });
    setIsCreateOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Projekt wirklich löschen?")) return;

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Projekt gelöscht");
      loadProjects();
    } catch (error: any) {
      toast.error("Fehler beim Löschen");
      console.error(error);
    }
  };

  const handleDialogClose = () => {
    setIsCreateOpen(false);
    setEditingProject(null);
    setFormData({ name: "", description: "", provider_id: "" });
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Projekte</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingProject(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Neues Projekt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProject ? "Projekt bearbeiten" : "Neues Projekt"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={formData.provider_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, provider_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Provider wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Kein Provider</SelectItem>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Abbrechen
                </Button>
                <Button type="submit">Speichern</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/4">Name</TableHead>
            <TableHead className="w-2/5">Beschreibung</TableHead>
            <TableHead className="w-1/5">Provider</TableHead>
            <TableHead className="w-[120px] text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : (
            projects.map((project) => (
              <TableRow 
                key={project.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/settings/projects/${project.id}`)}
              >
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>{project.description || "-"}</TableCell>
                <TableCell>
                  {project.providers?.name || "-"}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(project)}
                    className="mr-2"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(project.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
