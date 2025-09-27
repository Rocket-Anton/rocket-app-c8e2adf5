import { useState, useEffect, useRef } from "react";
import { Search, Filter, HelpCircle } from "lucide-react";
import { Input } from "./ui/input";
import { AddressCard } from "./AddressCard";
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

  // Single filter bar that scrolls with content and overlays the addresses
  const scrollRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [filterH, setFilterH] = useState(0);
  const [showFilter, setShowFilter] = useState(true);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const measure = () => setFilterH(filterRef.current?.offsetHeight ?? 0);
    measure();
    const ro = new ResizeObserver(measure);
    if (filterRef.current) ro.observe(filterRef.current);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onScroll = () => {
      const st = root.scrollTop;
      const delta = 6;
      if (st <= 0) {
        setShowFilter(true);
      } else if (st < lastScrollTop.current - delta) {
        setShowFilter(true);
      } else if (st > lastScrollTop.current + delta) {
        setShowFilter(false);
      }
      lastScrollTop.current = st;
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="app-header p-6 relative z-20 bg-background">
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
      </div>

      {/* Address List - Scrollable */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div>
          <div
            ref={filterRef}
            className="sticky top-0 z-10 px-6"
          >
            <div className={`bg-background py-3 shadow-sm transition-transform duration-150 ${showFilter ? 'translate-y-0' : '-translate-y-full'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Adresse suchen"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
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
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Nr." />
                  </SelectTrigger>
                     <SelectContent position="popper" align="start" alignOffset={0} sideOffset={4} className="min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)] z-[60]">
                        <SelectItem value="alle" className="pl-3 pr-2">Alle</SelectItem>
                        <SelectItem value="gerade" className="pl-3 pr-2">Gerade</SelectItem>
                        <SelectItem value="ungerade" className="pl-3 pr-2">Ungerade</SelectItem>
                     </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Address Cards */}
          <div className="px-6 pb-6">
            <div className="space-y-4">
              {mockAddresses.map((address) => (
                <AddressCard key={address.id} address={address} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
