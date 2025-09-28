import { useState } from "react";
import { X, Plus, RotateCcw, FileText, Info, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";

interface Address {
  id: number;
  street: string;
  postalCode: string;
  city: string;
}

interface AddressDetailModalProps {
  address: Address;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddressDetailModal = ({ address, open, onOpenChange }: AddressDetailModalProps) => {
  const [wohneinheiten] = useState(7);

  const statusOptions = [
    { value: "UNBEARBEITET", label: "Unbearbeitet", color: "bg-gray-500 text-white" },
    { value: "NICHT_ANGETROFFEN", label: "Nicht angetroffen", color: "bg-yellow-500 text-white" },
    { value: "POTENZIAL", label: "Potenzial", color: "bg-green-500 text-white" },
    { value: "BESTANDSKUNDE", label: "Bestandskunde", color: "bg-emerald-500 text-white" },
    { value: "KEIN_INTERESSE", label: "Kein Interesse", color: "bg-red-500 text-white" },
    { value: "NICHT_VORHANDEN", label: "Nicht vorhanden", color: "bg-gray-400 text-white" },
    { value: "GEWERBE", label: "Gewerbe", color: "bg-purple-500 text-white" }
  ];

  const notes = [
    {
      id: 1,
      author: "Abdullah Kater",
      timestamp: "16.07.25 18:41",
      content: "Möchte Nix."
    },
    {
      id: 2,
      author: "Abdullah Kater", 
      timestamp: "16.07.25 18:41",
      content: ""
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            {address.street}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {address.postalCode} {address.city}
          </p>
        </DialogHeader>

        <div className="flex h-full overflow-hidden">
          {/* Left Panel */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Wohneinheiten Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium">Wohneinheiten</span>
                  <div className="w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-bold">
                    {wohneinheiten}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  <Plus className="w-4 h-4 mr-1" />
                  Hinzufügen
                </Button>
              </div>

              {/* Unit Card */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <div className="space-y-3">
                  <select className="w-full p-3 border rounded-lg bg-background text-muted-foreground">
                    <option>Stockwerk</option>
                    <option>1. OG</option>
                    <option>2. OG</option>
                    <option>3. OG</option>
                  </select>

                  <select className="w-full p-3 border rounded-lg bg-background text-muted-foreground">
                    <option>Lage</option>
                    <option>Links</option>
                    <option>Rechts</option>
                    <option>Mitte</option>
                  </select>

                  <div className="flex items-center gap-3">
                    <Select defaultValue="UNBEARBEITET">
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <div className={`px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                              {status.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button className="p-2 text-muted-foreground hover:text-foreground">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Status updaten
                </Button>

                <p className="text-sm text-muted-foreground">
                  Aktualisiert: 16.07.2025 16:41
                </p>

                <Button className="w-full bg-black hover:bg-gray-800 text-white">
                  <FileText className="w-4 h-4 mr-2" />
                  Auftrag
                </Button>

                <Button variant="secondary" className="w-full bg-muted hover:bg-muted/80">
                  <Info className="w-4 h-4 mr-2" />
                  Mehr
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-80 border-l bg-muted/30 overflow-y-auto">
            {/* Notes Section */}
            <div className="p-4 border-b">
              <h3 className="font-medium mb-3">Notizen</h3>
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="bg-background rounded-lg p-3 relative">
                    <button className="absolute top-2 right-2 w-4 h-4 text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="font-medium text-sm">{note.author}</div>
                    <div className="text-xs text-muted-foreground mb-2">{note.timestamp}</div>
                    <div className="text-sm">{note.content}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Appointments Section */}
            <div className="p-4">
              <h3 className="font-medium mb-3">Termine</h3>
              <div className="bg-background rounded-lg p-3 text-center text-muted-foreground">
                Keine Termine
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};