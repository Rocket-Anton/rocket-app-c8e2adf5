import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Address {
  id: number;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  project_id?: string | null;
  projects?: { name: string };
}

interface Project {
  id: string;
  name: string;
}

export const AddressesSettings = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [formData, setFormData] = useState({
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    project_id: "",
  });

  useEffect(() => {
    loadData();
  }, [filterProject]);

  const loadData = async () => {
    try {
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load addresses - select all fields
      const query = supabase
        .from("addresses")
        .select("*");

      let addressesQuery = query.order("created_at", { ascending: false });

      if (filterProject !== "all") {
        if (filterProject === "none") {
          addressesQuery = addressesQuery.is("project_id", null);
        } else {
          addressesQuery = addressesQuery.eq("project_id", filterProject);
        }
      }

      const { data: addressesData, error: addressesError } = await addressesQuery;

      if (addressesError) throw addressesError;
      
      // Enrich with project names
      const enrichedAddresses = (addressesData as any[])?.map(addr => {
        const project = projectsData?.find(p => p.id === addr.project_id);
        return {
          id: addr.id,
          street: addr.street,
          house_number: addr.house_number,
          postal_code: addr.postal_code,
          city: addr.city,
          project_id: addr.project_id,
          projects: project ? { name: project.name } : undefined
        } as Address;
      });
      
      setAddresses(enrichedAddresses || []);
    } catch (error: any) {
      toast.error("Fehler beim Laden der Daten");
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

      const addressData = {
        street: formData.street,
        house_number: formData.house_number,
        postal_code: formData.postal_code,
        city: formData.city,
        project_id: formData.project_id || null,
        coordinates: { lat: 0, lng: 0 }, // Default coordinates
        units: [],
      };

      if (editingAddress) {
        const { error } = await supabase
          .from("addresses")
          .update(addressData)
          .eq("id", editingAddress.id);

        if (error) throw error;
        toast.success("Adresse aktualisiert");
      } else {
        const { error } = await supabase
          .from("addresses")
          .insert({
            ...addressData,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("Adresse erstellt");
      }

      setFormData({
        street: "",
        house_number: "",
        postal_code: "",
        city: "",
        project_id: "",
      });
      setIsCreateOpen(false);
      setEditingAddress(null);
      loadData();
    } catch (error: any) {
      toast.error("Fehler beim Speichern");
      console.error(error);
    }
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      street: address.street,
      house_number: address.house_number,
      postal_code: address.postal_code,
      city: address.city,
      project_id: address.project_id || "",
    });
    setIsCreateOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Adresse wirklich löschen?")) return;

    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Adresse gelöscht");
      loadData();
    } catch (error: any) {
      toast.error("Fehler beim Löschen");
      console.error(error);
    }
  };

  const handleDialogClose = () => {
    setIsCreateOpen(false);
    setEditingAddress(null);
    setFormData({
      street: "",
      house_number: "",
      postal_code: "",
      city: "",
      project_id: "",
    });
  };

  if (loading) {
    return <div>Lädt...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4 items-center">
          <h2 className="text-2xl font-semibold">Adressen</h2>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Projekt filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Projekte</SelectItem>
              <SelectItem value="none">Ohne Projekt</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingAddress(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Neue Adresse
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAddress ? "Adresse bearbeiten" : "Neue Adresse"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="street">Straße</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) =>
                    setFormData({ ...formData, street: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="house_number">Hausnummer</Label>
                <Input
                  id="house_number"
                  value={formData.house_number}
                  onChange={(e) =>
                    setFormData({ ...formData, house_number: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="postal_code">PLZ</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) =>
                    setFormData({ ...formData, postal_code: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">Stadt</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="project">Projekt</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, project_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Projekt wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Kein Projekt</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Straße</TableHead>
            <TableHead>Nr.</TableHead>
            <TableHead>PLZ</TableHead>
            <TableHead>Stadt</TableHead>
            <TableHead>Projekt</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {addresses.map((address) => (
            <TableRow key={address.id}>
              <TableCell className="font-medium">{address.street}</TableCell>
              <TableCell>{address.house_number}</TableCell>
              <TableCell>{address.postal_code}</TableCell>
              <TableCell>{address.city}</TableCell>
              <TableCell>
                {address.projects?.name || "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(address)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(address.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
