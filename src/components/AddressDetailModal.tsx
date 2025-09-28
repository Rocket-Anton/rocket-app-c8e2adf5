import { useState } from "react";
import { X, Plus, User, Edit, Calendar, Clock } from "lucide-react";
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
  const [wohneinheiten] = useState(4);

  const statusColors = {
    LEAD: "bg-green-500 text-white",
    GEE: "bg-cyan-500 text-white", 
    POT: "bg-orange-500 text-white"
  };

  const notes = [
    {
      id: 1,
      author: "Oleg Slemnev",
      timestamp: "15.10.24 18:50",
      content: "Lorem ipsum dolor sit."
    },
    {
      id: 2,
      author: "Oleg Slemnev", 
      timestamp: "15.10.24 18:50",
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ..."
    }
  ];

  const appointments = [
    {
      id: 1,
      location: "Alt-Lindenau 7, 2",
      date: "17.10.24 15:40 - 16:40"
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
                  <span className="text-sm font-medium">Wohneinheiten</span>
                  <div className="w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-bold">
                    {wohneinheiten}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  <Plus className="w-4 h-4 mr-1" />
                  Hinzufügen
                </Button>
              </div>

              {/* First Unit */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Select defaultValue="LEAD">
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LEAD">
                          <Badge className={statusColors.LEAD}>LEAD</Badge>
                        </SelectItem>
                        <SelectItem value="POT">
                          <Badge className={statusColors.POT}>POT</Badge>
                        </SelectItem>
                        <SelectItem value="GEE">
                          <Badge className={statusColors.GEE}>GEE</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <Select defaultValue="3">
                    <SelectTrigger>
                      <SelectValue placeholder="OG" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1. OG</SelectItem>
                      <SelectItem value="2">2. OG</SelectItem>
                      <SelectItem value="3">3. OG</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Lage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="links">Links</SelectItem>
                      <SelectItem value="rechts">Rechts</SelectItem>
                      <SelectItem value="mitte">Mitte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <User className="w-4 h-4 mr-2" />
                    Lead öffnen
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Edit className="w-4 h-4 mr-2" />
                    Hinweis hinzufügen
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    Termin vereinbaren
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Lead hinzufügen
                  </Button>
                </div>

                <Button variant="secondary" size="sm" className="w-full">
                  Mehr
                </Button>
              </div>

              {/* Second Unit - GEE */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-3">
                  <Select defaultValue="GEE">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GEE">
                        <Badge className={statusColors.GEE}>GEE</Badge>
                      </SelectItem>
                      <SelectItem value="LEAD">
                        <Badge className={statusColors.LEAD}>LEAD</Badge>
                      </SelectItem>
                      <SelectItem value="POT">
                        <Badge className={statusColors.POT}>POT</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select defaultValue="3">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1. OG</SelectItem>
                      <SelectItem value="2">2. OG</SelectItem>
                      <SelectItem value="3">3. OG</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Lage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="links">Links</SelectItem>
                      <SelectItem value="rechts">Rechts</SelectItem>
                      <SelectItem value="mitte">Mitte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Third Unit - POT */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-3">
                  <Select defaultValue="POT">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POT">
                        <Badge className={statusColors.POT}>POT</Badge>
                      </SelectItem>
                      <SelectItem value="LEAD">
                        <Badge className={statusColors.LEAD}>LEAD</Badge>
                      </SelectItem>
                      <SelectItem value="GEE">
                        <Badge className={statusColors.GEE}>GEE</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select defaultValue="3">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1. OG</SelectItem>
                      <SelectItem value="2">2. OG</SelectItem>
                      <SelectItem value="3">3. OG</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Lage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="links">Links</SelectItem>
                      <SelectItem value="rechts">Rechts</SelectItem>
                      <SelectItem value="mitte">Mitte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <div className="space-y-2">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="bg-background rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{appointment.location}</div>
                      <div className="text-xs text-muted-foreground">{appointment.date}</div>
                    </div>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Notes Section */}
            <div className="p-4 border-t">
              <h3 className="font-medium mb-3">Notizen</h3>
              <div className="space-y-3">
                {notes.map((note, index) => (
                  <div key={`bottom-${note.id}-${index}`} className="bg-background rounded-lg p-3 relative">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};