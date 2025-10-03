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
  houseNumber: string;
  postalCode: string;
  city: string;
  units?: { id: number; floor: string; position: string; status: string }[];
  filteredUnits?: { id: number; floor: string; position: string; status: string }[];
}

interface AddressDetailModalProps {
  address: Address;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddressDetailModal = ({ address, open, onOpenChange }: AddressDetailModalProps) => {
  // Use filteredUnits if available (from status filter), otherwise use all units
  const displayUnits = address.filteredUnits || address.units || [];
  const wohneinheiten = displayUnits.length;

  const statusOptions = [
    { value: "offen", label: "Offen", color: "bg-gray-500 text-white" },
    { value: "nicht-angetroffen", label: "Nicht angetroffen", color: "bg-yellow-500 text-white" },
    { value: "karte-eingeworfen", label: "Karte eingeworfen", color: "bg-amber-500 text-white" },
    { value: "potenzial", label: "Potenzial", color: "bg-green-500 text-white" },
    { value: "neukunde", label: "Neukunde", color: "bg-blue-500 text-white" },
    { value: "bestandskunde", label: "Bestandskunde", color: "bg-emerald-500 text-white" },
    { value: "kein-interesse", label: "Kein Interesse", color: "bg-red-500 text-white" },
    { value: "termin", label: "Termin", color: "bg-purple-500 text-white" },
    { value: "nicht-vorhanden", label: "Nicht vorhanden", color: "bg-gray-400 text-white" },
    { value: "gewerbe", label: "Gewerbe", color: "bg-orange-500 text-white" }
  ];

  const showStatusUpdateButton = (status: string) => {
    return ["nicht-angetroffen", "karte-eingeworfen", "potenzial"].includes(status);
  };

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
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full h-[90vh] sm:h-[80vh] overflow-hidden p-0 max-h-[90vh]">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            {address.street} {address.houseNumber}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {address.postalCode} {address.city}
          </p>
          
          <div className="flex items-center justify-between w-full pt-4 sm:pt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-medium">Wohneinheiten</span>
              <div className="w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-bold">
                {wohneinheiten}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-600 text-xs sm:text-sm">
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Hinzufügen</span>
              <span className="sm:hidden">+</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-full overflow-hidden">
          {/* Left Panel */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 sm:space-y-6">
            {/* Unit Cards */}
            <div className="space-y-4">
              {displayUnits.length > 0 ? (
                displayUnits.map((unit) => (
                  <div key={unit.id} className="p-3 sm:p-4 bg-muted/30 rounded-lg space-y-3 sm:space-y-4">
                    <div className="space-y-3">
                      {wohneinheiten > 1 && (
                        <>
                          <Select defaultValue={unit.floor}>
                            <SelectTrigger className="w-full border border-gray-300 shadow-none bg-background focus:border-gray-300 focus:ring-0">
                              <SelectValue placeholder="Stockwerk" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EG">EG</SelectItem>
                              <SelectItem value="1. OG">1. OG</SelectItem>
                              <SelectItem value="2. OG">2. OG</SelectItem>
                              <SelectItem value="3. OG">3. OG</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select defaultValue={unit.position}>
                            <SelectTrigger className="w-full border border-gray-300 shadow-none bg-background focus:border-gray-300 focus:ring-0">
                              <SelectValue placeholder="Lage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Links">Links</SelectItem>
                              <SelectItem value="Rechts">Rechts</SelectItem>
                              <SelectItem value="Mitte">Mitte</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      )}

                      <div className="flex items-center gap-3">
                        <Select defaultValue={unit.status}>
                          <SelectTrigger className="flex-1 border border-gray-300 shadow-none bg-background focus:border-gray-300 focus:ring-0">
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

                    {showStatusUpdateButton(unit.status) && (
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Status updaten
                      </Button>
                    )}

                    <p className="text-sm text-muted-foreground">
                      Aktualisiert: 16.07.2025 16:41
                    </p>

                    <Button className="w-full bg-black hover:bg-gray-800 text-white text-sm">
                      <FileText className="w-4 h-4 mr-2" />
                      Auftrag
                    </Button>

                    <Button variant="secondary" className="w-full bg-muted hover:bg-muted/80 text-sm">
                      <Info className="w-4 h-4 mr-2" />
                      Mehr
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground">
                  Keine Wohneinheiten vorhanden
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Hidden on mobile */}
          <div className="hidden sm:block sm:w-80 border-l bg-muted/30 overflow-y-auto">
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