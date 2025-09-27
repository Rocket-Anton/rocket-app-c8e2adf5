import { useState, useEffect, useRef } from "react";
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

function attachQuickReturnFilter(
  scrollEl: HTMLElement,
  filterEl: HTMLElement,
  spacerEl: HTMLElement,
  headerEl: HTMLElement
) {
  const state = { offset: 0, filterH: 0, headerH: 0 };

  const measure = () => {
    state.filterH = filterEl.offsetHeight || 0;
    state.headerH = headerEl.offsetHeight || 0;
    filterEl.style.setProperty("--filter-height", `${state.filterH}px`);
    spacerEl.style.height = `${state.filterH}px`;
    (filterEl.style as any).top = `${state.headerH}px`;
  };

  const ro1 = new ResizeObserver(measure); ro1.observe(filterEl);
  const ro2 = new ResizeObserver(measure); ro2.observe(headerEl);
  measure();

  const clamp = () => {
    if (state.offset > 0) state.offset = 0;
    if (state.offset < -state.filterH) state.offset = -state.filterH;
    filterEl.style.setProperty("--filter-offset", `${state.offset}px`);
  };

  const handleDelta = (dy: number, e: Event) => {
    if (dy > 0) { // hochwischen -> Filter unter Header reinschieben
      state.offset -= dy; clamp();
      return;
    }
    if (dy < 0) { // runterwischen -> Filter zuerst herausziehen
      const need = 0 - state.offset;
      const use = Math.min(need, -dy);
      if (use > 0) {
        state.offset += use; clamp();
        (e as any).preventDefault?.();
      }
      const leftover = (-dy) - use;
      if (leftover > 0) (scrollEl as any).scrollTop -= leftover;
    }
  };

  const onWheel = (e: WheelEvent) => handleDelta(e.deltaY, e);
  let touchY = 0;
  const onTs = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
  const onTm = (e: TouchEvent) => {
    const dy = touchY - e.touches[0].clientY;
    touchY = e.touches[0].clientY;
    handleDelta(dy, e);
  };

  scrollEl.addEventListener("wheel", onWheel, { passive: false });
  scrollEl.addEventListener("touchstart", onTs, { passive: true });
  scrollEl.addEventListener("touchmove", onTm, { passive: false });

  return () => {
    scrollEl.removeEventListener("wheel", onWheel);
    scrollEl.removeEventListener("touchstart", onTs);
    scrollEl.removeEventListener("touchmove", onTm);
    ro1.disconnect(); ro2.disconnect();
  };
}

export const LauflistenContent = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [allFilter, setAllFilter] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const headerEl = document.querySelector(".app-header") as HTMLElement | null;
    if (!scrollRef.current || !filterRef.current || !spacerRef.current || !headerEl) return;
    return attachQuickReturnFilter(scrollRef.current, filterRef.current, spacerRef.current, headerEl);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="app-header p-6 border-b border-border">
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
      <div ref={scrollRef} className="scroll-root flex-1 overflow-y-auto">
        {/* Overlay Filter */}
        <div ref={filterRef} className="filter-wrap z-[900]">
          <div className="filter-card">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Adresse suchen"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

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
              </div>

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

        {/* Spacer to reserve space in flow */}
        <div ref={spacerRef} className="filter-spacer" />

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
  );
};