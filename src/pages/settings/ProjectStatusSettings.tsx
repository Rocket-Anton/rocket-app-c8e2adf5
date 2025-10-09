import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CustomStatus {
  id: string;
  name: string;
  label: string;
  color: string;
  is_default: boolean;
}

interface RejectionReason {
  id: string;
  reason: string;
  is_default: boolean;
}

const DEFAULT_STATUSES = [
  { value: "offen", label: "Offen", color: "bg-gray-500 text-white" },
  { value: "nicht-angetroffen", label: "Nicht angetroffen", color: "bg-yellow-500 text-white" },
  { value: "karte-eingeworfen", label: "Karte eingeworfen", color: "bg-amber-500 text-white" },
  { value: "potenzial", label: "Potenzial", color: "bg-green-500 text-white" },
  { value: "neukunde", label: "Neukunde", color: "bg-blue-500 text-white" },
  { value: "bestandskunde", label: "Bestandskunde", color: "bg-emerald-500 text-white" },
  { value: "kein-interesse", label: "Kein Interesse", color: "bg-red-500 text-white" },
  { value: "termin", label: "Termin", color: "bg-purple-500 text-white" },
  { value: "nicht-vorhanden", label: "Nicht vorhanden", color: "bg-gray-400 text-white" },
  { value: "gewerbe", label: "Gewerbe", color: "bg-orange-500 text-white" },
];

const DEFAULT_REJECTION_REASONS = [
  "Zu alt",
  "Kein Besuch mehr erwünscht",
  "Ziehen bald weg",
  "Zur Miete",
  "Anderer Grund"
];

export default function ProjectStatusSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<RejectionReason[]>([]);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#3b82f6");
  const [newReason, setNewReason] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<CustomStatus | null>(null);
  const [replacementStatus, setReplacementStatus] = useState("");
  const [affectedUnitsCount, setAffectedUnitsCount] = useState(0);

  useEffect(() => {
    loadProject();
    loadCustomStatuses();
    loadRejectionReasons();
  }, [id]);

  const loadProject = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Fehler beim Laden des Projekts");
      return;
    }
    setProject(data);
  };

  const loadCustomStatuses = async () => {
    const { data, error } = await supabase
      .from("custom_statuses")
      .select("*")
      .eq("project_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setCustomStatuses(data);
    }
  };

  const loadRejectionReasons = async () => {
    const { data, error } = await supabase
      .from("rejection_reasons")
      .select("*")
      .eq("project_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setRejectionReasons(data);
    }
  };

  const addCustomStatus = async () => {
    if (!newStatusName || !newStatusLabel) {
      toast.error("Bitte Name und Label eingeben");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("custom_statuses").insert({
      project_id: id,
      name: newStatusName.toLowerCase().replace(/\s+/g, '-'),
      label: newStatusLabel,
      color: newStatusColor,
      created_by: user.id,
    });

    if (error) {
      toast.error("Fehler beim Hinzufügen");
      return;
    }

    toast.success("Status hinzugefügt");
    setNewStatusName("");
    setNewStatusLabel("");
    setNewStatusColor("#3b82f6");
    loadCustomStatuses();
  };

  const checkAffectedUnits = async (statusName: string) => {
    // TODO: Implement checking how many units use this status
    setAffectedUnitsCount(0);
    return 0;
  };

  const deleteCustomStatus = async (status: CustomStatus) => {
    const count = await checkAffectedUnits(status.name);
    setAffectedUnitsCount(count);
    setStatusToDelete(status);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteStatus = async () => {
    if (!statusToDelete) return;

    // TODO: Update all units with this status to the replacement status
    
    const { error } = await supabase
      .from("custom_statuses")
      .update({ is_active: false })
      .eq("id", statusToDelete.id);

    if (error) {
      toast.error("Fehler beim Löschen");
      return;
    }

    toast.success("Status gelöscht");
    setDeleteDialogOpen(false);
    setStatusToDelete(null);
    setReplacementStatus("");
    loadCustomStatuses();
  };

  const addRejectionReason = async () => {
    if (!newReason.trim()) {
      toast.error("Bitte Grund eingeben");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("rejection_reasons").insert({
      project_id: id,
      reason: newReason.trim(),
      created_by: user.id,
    });

    if (error) {
      toast.error("Fehler beim Hinzufügen");
      return;
    }

    toast.success("Grund hinzugefügt");
    setNewReason("");
    loadRejectionReasons();
  };

  const deleteRejectionReason = async (reasonId: string, reasonText: string) => {
    if (reasonText === "Anderer Grund") {
      toast.error("'Anderer Grund' kann nicht gelöscht werden");
      return;
    }

    const { error } = await supabase
      .from("rejection_reasons")
      .update({ is_active: false })
      .eq("id", reasonId);

    if (error) {
      toast.error("Fehler beim Löschen");
      return;
    }

    toast.success("Grund gelöscht");
    loadRejectionReasons();
  };

  const allStatuses = [...DEFAULT_STATUSES, ...customStatuses.map(s => ({
    value: s.name,
    label: s.label,
    color: s.color
  }))];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(`/settings/projects/${id}`)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zum Projekt
        </Button>

        <h1 className="text-3xl font-bold mb-6">Status-Einstellungen</h1>
        <p className="text-muted-foreground mb-8">{project?.name}</p>

        <Tabs defaultValue="statuses" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="statuses">Status</TabsTrigger>
            <TabsTrigger value="reasons">Kein-Interesse-Gründe</TabsTrigger>
          </TabsList>

          <TabsContent value="statuses" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Standard-Status</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Diese Status sind immer verfügbar und können nicht bearbeitet werden.
              </p>
              <div className="space-y-2">
                {DEFAULT_STATUSES.map((status) => (
                  <div
                    key={status.value}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1.5 text-sm font-medium rounded ${status.color}`}>
                        {status.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Eigene Status</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Name (z.B. warten)"
                    value={newStatusName}
                    onChange={(e) => setNewStatusName(e.target.value)}
                  />
                  <Input
                    placeholder="Anzeigename (z.B. Auf Rückruf warten)"
                    value={newStatusLabel}
                    onChange={(e) => setNewStatusLabel(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={newStatusColor}
                      onChange={(e) => setNewStatusColor(e.target.value)}
                      className="w-20"
                    />
                    <Button onClick={addCustomStatus} className="flex-1">
                      <Plus className="w-4 h-4 mr-2" />
                      Hinzufügen
                    </Button>
                  </div>
                </div>

                {customStatuses.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {customStatuses.map((status) => (
                      <div
                        key={status.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="px-3 py-1.5 text-sm font-medium rounded text-white"
                            style={{ backgroundColor: status.color }}
                          >
                            {status.label}
                          </div>
                          <span className="text-sm text-muted-foreground">({status.name})</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCustomStatus(status)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reasons" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Standard-Gründe</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Diese Gründe sind immer verfügbar. "Anderer Grund" kann nicht gelöscht werden.
              </p>
              <div className="space-y-2">
                {DEFAULT_REJECTION_REASONS.map((reason) => (
                  <div
                    key={reason}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                  >
                    <span className="text-sm font-medium">{reason}</span>
                    {reason === "Anderer Grund" && (
                      <span className="text-xs text-muted-foreground">(Pflichtfeld)</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Eigene Gründe</h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Neuer Grund..."
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addRejectionReason()}
                  />
                  <Button onClick={addRejectionReason}>
                    <Plus className="w-4 h-4 mr-2" />
                    Hinzufügen
                  </Button>
                </div>

                {rejectionReasons.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {rejectionReasons.map((reason) => (
                      <div
                        key={reason.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                      >
                        <span className="text-sm font-medium">{reason.reason}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRejectionReason(reason.id, reason.reason)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Status löschen
            </AlertDialogTitle>
            <AlertDialogDescription>
              {affectedUnitsCount > 0 ? (
                <>
                  <p className="mb-4">
                    {affectedUnitsCount} Wohneinheit(en) verwenden diesen Status.
                    Bitte wählen Sie einen Ersatz-Status:
                  </p>
                  <Select value={replacementStatus} onValueChange={setReplacementStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {allStatuses
                        .filter(s => s.value !== statusToDelete?.name)
                        .map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                "Möchten Sie diesen Status wirklich löschen?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStatus}
              disabled={affectedUnitsCount > 0 && !replacementStatus}
              className="bg-destructive hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
