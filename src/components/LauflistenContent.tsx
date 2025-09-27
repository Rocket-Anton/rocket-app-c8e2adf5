import { useState } from "react";
import { Search, Filter, HelpCircle, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { AddressCard } from "./AddressCard";
import { SidebarTrigger } from "./ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const mockAddresses = [
  { id: 1, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 2, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 3, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 4, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 5, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 6, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 7, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
  { id: 8, street: "Alt-Lindenau 7", postalCode: "88175", city: "Lindenau" },
];

export const LauflistenContent = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [allFilter, setAllFilter] = useState("");

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <span>🏠</span>
                <span>Lauflisten</span>
                <span>&gt;</span>
                <span>Liste</span>
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Lauflisten</h1>
              <p className="text-sm text-muted-foreground">Insgesamt gefunden: {mockAddresses.length}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground" />
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2 mt-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Adresse suchen"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="offen">Offen</SelectItem>
                <SelectItem value="nicht-angetroffen">Nicht angetroffen</SelectItem>
                <SelectItem value="potenzial">Potenzial</SelectItem>
                <SelectItem value="neukunde">Neukunde</SelectItem>
                <SelectItem value="bestandskunde">Bestandskunde</SelectItem>
                <SelectItem value="kein-interesse">Kein Interesse</SelectItem>
                <SelectItem value="termin">Termin</SelectItem>
                <SelectItem value="nicht-vorhanden">Nicht vorhanden</SelectItem>
                <SelectItem value="gewerbe">Gewerbe</SelectItem>
              </SelectContent>
            </Select>

            <Select value={allFilter} onValueChange={setAllFilter}>
              <SelectTrigger className="w-20">
                <SelectValue placeholder="Nr." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle</SelectItem>
                <SelectItem value="gerade">Gerade</SelectItem>
                <SelectItem value="ungerade">Ungerade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Address List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {mockAddresses.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </div>
      </div>
    </div>
  );
};