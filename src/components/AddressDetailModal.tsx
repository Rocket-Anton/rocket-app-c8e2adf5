import { useState, useEffect } from "react";
import { X, Plus, RotateCcw, FileText, Info, Clock, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

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
  
  // State for each unit's current status
  const [unitStatuses, setUnitStatuses] = useState<Record<number, string>>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [appointmentsOpen, setAppointmentsOpen] = useState(false);
  
  // Reset unit statuses when address changes or modal opens
  useEffect(() => {
    if (open) {
      setUnitStatuses(
        displayUnits.reduce((acc, unit) => ({ ...acc, [unit.id]: unit.status || "offen" }), {})
      );
    }
  }, [open, address.id]);

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

  const statusHistory = [
    {
      id: 1,
      status: "Potenzial",
      changedBy: "Abdullah Kater",
      changedAt: "16.07.25 18:41"
    },
    {
      id: 2,
      status: "Nicht angetroffen",
      changedBy: "Max Mustermann",
      changedAt: "15.07.25 14:30"
    },
    {
      id: 3,
      status: "Offen",
      changedBy: "System",
      changedAt: "10.07.25 09:00"
    }
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
            <Button variant="ghost" size="sm" className="text-blue-600 text-xs sm:text-sm gap-1">
              <Plus className="w-4 h-4" />
              Hinzufügen
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-full overflow-hidden">
          {/* Left Panel */}
          <div className={`flex-1 overflow-y-auto px-4 sm:px-6 ${wohneinheiten === 1 ? 'pt-1' : 'py-4'} ${wohneinheiten > 1 ? 'space-y-4 sm:space-y-6' : ''}`}>
            {/* Unit Cards */}
            <div className={wohneinheiten === 1 ? '' : 'space-y-4'}>
              {displayUnits.length > 0 ? (
                displayUnits.map((unit) => (
                  <div key={unit.id} className="space-y-3">
                    {/* Gray Container for Fields */}
                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                      {wohneinheiten > 1 ? (
                        <>
                          <Select defaultValue={unit.floor}>
                            <SelectTrigger className="w-full h-9 sm:h-10 border border-gray-400 rounded-lg shadow-none bg-background">
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
                            <SelectTrigger className="w-full h-9 sm:h-10 border border-gray-400 rounded-lg shadow-none bg-background">
                              <SelectValue placeholder="Lage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Links">Links</SelectItem>
                              <SelectItem value="Rechts">Rechts</SelectItem>
                              <SelectItem value="Mitte">Mitte</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      ) : null}

                      <div className="flex items-center gap-3">
                        <Select 
                          value={unitStatuses[unit.id] || "offen"}
                          onValueChange={(value) => setUnitStatuses(prev => ({ ...prev, [unit.id]: value }))}
                        >
                          <SelectTrigger className="flex-1 h-9 sm:h-10 border border-gray-400 rounded-lg shadow-none bg-background">
                            <SelectValue>
                              {(() => {
                                const currentStatus = unitStatuses[unit.id] || "offen";
                                const statusOption = statusOptions.find(s => s.value === currentStatus);
                                return statusOption ? (
                                  <div className={`px-2 py-1 text-xs font-medium rounded ${statusOption.color}`}>
                                    {statusOption.label}
                                  </div>
                                ) : null;
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions
                              .filter(status => status.value !== "offen" && status.value !== "neukunde" && status.value !== "termin")
                              .map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  <div className={`px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                                    {status.label}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0 max-h-[400px] overflow-y-auto" side="bottom" align="end" avoidCollisions={true}>
                            <div className="p-3">
                              <h3 className="font-medium mb-3 text-sm">Status Historie</h3>
                              <div className="space-y-2">
                                {statusHistory.map((history) => {
                                  const statusOption = statusOptions.find(s => s.label === history.status);
                                  return (
                                    <div key={history.id} className="pb-2 border-b last:border-0 last:pb-0">
                                      <div className={`inline-block px-2 py-1 text-xs font-medium rounded mb-1 ${statusOption?.color || 'bg-gray-500 text-white'}`}>
                                        {history.status}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {history.changedBy}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {history.changedAt}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {showStatusUpdateButton(unitStatuses[unit.id] || "offen") && (
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Status updaten
                        </Button>
                      )}

                      <p className="text-sm text-muted-foreground">
                        Aktualisiert: 16.07.2025 16:41
                      </p>
                    </div>

                    {/* Collapsible Notizen Section */}
                    <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                      <CollapsibleTrigger className="w-full flex items-center justify-between bg-muted/50 rounded-xl p-4 hover:bg-muted/70 transition-colors">
                        <span className="font-medium text-sm">Notizen</span>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-muted-foreground/20 text-foreground rounded-full flex items-center justify-center text-xs">
                            {notes.length}
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${notesOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2">
                        {notes.map((note) => (
                          <div key={note.id} className="bg-background rounded-lg p-3 relative border">
                            <button className="absolute top-2 right-2 w-4 h-4 text-muted-foreground hover:text-foreground">
                              <X className="w-4 h-4" />
                            </button>
                            <div className="font-medium text-sm">{note.author}</div>
                            <div className="text-xs text-muted-foreground mb-2">{note.timestamp}</div>
                            <div className="text-sm">{note.content}</div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Collapsible Termine Section */}
                    <Collapsible open={appointmentsOpen} onOpenChange={setAppointmentsOpen}>
                      <CollapsibleTrigger className="w-full flex items-center justify-between bg-muted/50 rounded-xl p-4 hover:bg-muted/70 transition-colors">
                        <span className="font-medium text-sm">Termine</span>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-muted-foreground/20 text-foreground rounded-full flex items-center justify-center text-xs">
                            0
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${appointmentsOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="bg-background rounded-lg p-3 text-center text-muted-foreground border">
                          Keine Termine
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Auftrag Button */}
                    <Button className="w-full bg-black hover:bg-gray-800 text-white text-sm rounded-xl">
                      <FileText className="w-4 h-4 mr-2" />
                      Auftrag
                    </Button>

                    {/* Mehr Button */}
                    <Button variant="secondary" className="w-full bg-muted hover:bg-muted/80 text-sm rounded-xl">
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