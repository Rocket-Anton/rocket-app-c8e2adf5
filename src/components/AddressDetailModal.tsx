import { useState, useEffect, useCallback, useRef, useLayoutEffect, forwardRef } from "react";
import { X, Plus, RotateCcw, FileText, Info, Clock, ChevronDown } from "lucide-react";
import useEmblaCarousel from 'embla-carousel-react';
import { useIsMobile } from "@/hooks/use-mobile";
import * as PopoverPrimitive from "@radix-ui/react-popover";
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
  allAddresses?: Address[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddressDetailModal = ({ address, allAddresses = [], initialIndex = 0, open, onOpenChange }: AddressDetailModalProps) => {
  const isMobile = useIsMobile();
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    skipSnaps: false,
    startIndex: initialIndex,
    align: 'center',
  });
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentAddress = allAddresses.length > 0 ? allAddresses[currentIndex] : address;
  
  // Use filteredUnits if available (from status filter), otherwise use all units
  const displayUnits = currentAddress.filteredUnits || currentAddress.units || [];
  const wohneinheiten = displayUnits.length;
  
  // State for each unit's current status
  const [unitStatuses, setUnitStatuses] = useState<Record<number, string>>({});
  const [statusHistories, setStatusHistories] = useState<Record<number, Array<{id: number, status: string, changedBy: string, changedAt: string}>>>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [appointmentsOpen, setAppointmentsOpen] = useState(false);
  const modalContentRef = useRef<HTMLDivElement | null>(null);

  // Update currentIndex when embla scrolls
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);
  
  // Reset embla to initial index when modal opens
  useEffect(() => {
    if (open && emblaApi) {
      emblaApi.scrollTo(initialIndex, true);
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex, emblaApi]);
  
  // Reset unit statuses when address changes or modal opens
  useEffect(() => {
    if (open) {
      setUnitStatuses(
        displayUnits.reduce((acc, unit) => ({ ...acc, [unit.id]: unit.status || "offen" }), {})
      );
      // Initialize status histories for each unit
      setStatusHistories(
        displayUnits.reduce((acc, unit) => ({ 
          ...acc, 
          [unit.id]: [
            {
              id: 1,
              status: statusOptions.find(s => s.value === (unit.status || "offen"))?.label || "Offen",
              changedBy: "System",
              changedAt: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            }
          ]
        }), {})
      );
    }
  }, [open, currentAddress.id]);

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

  // Popover-Inhalt, der die Höhe an die Unterkante der Modal begrenzt und nie nach oben flippt
  const BoundedPopoverContent = forwardRef<HTMLDivElement, any>(({ modalRef, className, children, sideOffset = 8, align = "end" }, forwardedRef) => {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const [maxH, setMaxH] = useState<number | undefined>();

    const update = useCallback(() => {
      const modalEl = modalRef?.current as HTMLElement | null;
      const contentEl = contentRef.current as HTMLElement | null;
      if (!modalEl || !contentEl) return;
      const modalRect = modalEl.getBoundingClientRect();
      const contentRect = contentEl.getBoundingClientRect();
      const available = Math.max(160, Math.floor(modalRect.bottom - contentRect.top - 8));
      setMaxH(available);
    }, [modalRef]);

    useLayoutEffect(() => {
      update();
      const onScroll = () => update();
      window.addEventListener("resize", update);
      window.addEventListener("scroll", onScroll, true);
      return () => {
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", onScroll, true);
      };
    }, [update]);

    return (
      <PopoverContent
        ref={contentRef}
        side="bottom"
        align={align}
        sideOffset={sideOffset}
        avoidCollisions={false}
        className={className}
        style={{ maxHeight: maxH }}
      >
        {children}
      </PopoverContent>
    );
  });

  const showStatusUpdateButton = (status: string) => {
    return ["nicht-angetroffen", "karte-eingeworfen", "potenzial"].includes(status);
  };

  const handleStatusChange = (unitId: number, newStatus: string) => {
    // Update the status
    setUnitStatuses(prev => ({ ...prev, [unitId]: newStatus }));
    
    // Add to history
    const statusLabel = statusOptions.find(s => s.value === newStatus)?.label || newStatus;
    const timestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    setStatusHistories(prev => ({
      ...prev,
      [unitId]: [
        {
          id: Date.now(),
          status: statusLabel,
          changedBy: "Abdullah Kater", // This should come from the current user
          changedAt: timestamp
        },
        ...(prev[unitId] || [])
      ]
    }));
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

  const renderAddressContent = (addr: Address, isCurrentSlide: boolean = true) => {
    const units = addr.filteredUnits || addr.units || [];
    const unitCount = units.length;
    
    return (
      <div className="flex flex-col h-full w-full overflow-hidden touch-pan-y">
        {/* Left Panel */}
        <div className={`flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden px-3 sm:px-6 pt-4 touch-pan-y ${unitCount > 1 ? 'space-y-4 sm:space-y-6' : ''}`}>
          {/* Unit Cards */}
          <div className={`${unitCount === 1 ? '' : 'space-y-4'} w-full`}>
            {units.length > 0 ? (
              units.map((unit, index) => (
                <div key={unit.id} className="space-y-2 w-full">
                  {/* Trennlinie zwischen Wohneinheiten (nicht vor der ersten) */}
                  {unitCount > 1 && index > 0 && (
                    <div className="border-t border-muted-foreground/20 mt-1 mb-4" />
                  )}
                  {/* Wohneinheit Heading - nur bei mehreren Einheiten */}
                  {unitCount > 1 && (
                    <h3 className="font-semibold text-base mb-2">Wohneinheit {index + 1}</h3>
                  )}
                  {/* Gray Container for Fields */}
                  <div className="bg-muted/70 rounded-lg p-3 sm:p-4 space-y-3 w-full box-border max-w-full">
                    {unitCount > 1 ? (
                      <div className="flex gap-3 min-w-0">
                        <div className="flex-1 min-w-0">
                          <label className="text-xs text-foreground mb-1 block font-medium">Stockwerk</label>
                          <Select defaultValue={unit.floor}>
                            <SelectTrigger className="w-full max-w-full min-w-0 h-9 sm:h-10 border border-gray-400 rounded-md shadow-none bg-background focus:ring-0 focus:outline-none">
                              <SelectValue placeholder="Stockwerk" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EG">EG</SelectItem>
                              <SelectItem value="1. OG">1. OG</SelectItem>
                              <SelectItem value="2. OG">2. OG</SelectItem>
                              <SelectItem value="3. OG">3. OG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex-1 min-w-0">
                          <label className="text-xs text-foreground mb-1 block font-medium">Lage</label>
                          <Select defaultValue={unit.position}>
                            <SelectTrigger className="w-full max-w-full min-w-0 h-9 sm:h-10 border border-gray-400 rounded-md shadow-none bg-background focus:ring-0 focus:outline-none">
                              <SelectValue placeholder="Lage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Links">Links</SelectItem>
                              <SelectItem value="Rechts">Rechts</SelectItem>
                              <SelectItem value="Mitte">Mitte</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <label className="text-xs text-foreground mb-1 block font-medium">Status</label>
                      <div className="flex items-center gap-3 min-w-0">
                        <Select 
                          value={unitStatuses[unit.id] || "offen"}
                          onValueChange={(value) => handleStatusChange(unit.id, value)}
                        >
                          <SelectTrigger className="flex-1 h-9 sm:h-10 border border-gray-400 rounded-md shadow-none bg-background focus:ring-0 focus:outline-none">
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
                          <PopoverPrimitive.Portal container={modalContentRef.current ?? undefined}>
                            <BoundedPopoverContent
                              modalRef={modalContentRef}
                              align="end"
                              sideOffset={8}
                              className="w-64 p-0 z-[1200] overflow-hidden rounded-md border bg-popover shadow-xl"
                            >
                              <div
                                className="overflow-y-auto overscroll-contain touch-pan-y pr-1"
                                onWheel={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                style={{ WebkitOverflowScrolling: 'touch' }}
                              >
                                <div className="p-3">
                                  <h3 className="font-medium mb-3 text-sm">Status Historie</h3>
                                  <div className="space-y-2">
                                    {(statusHistories[unit.id] || []).map((history) => {
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
                              </div>
                            </BoundedPopoverContent>
                          </PopoverPrimitive.Portal>
                        </Popover>
                      </div>
                    </div>

                    {showStatusUpdateButton(unitStatuses[unit.id] || "offen") && (
                      <Button className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Gleicher Status
                      </Button>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Aktualisiert: 16.07.2025 16:41
                    </p>

                    {/* Combined Notizen & Termine Container */}
                    <div className="bg-background border border-gray-400 rounded-md overflow-hidden box-border max-w-full w-full">
                      {/* Collapsible Notizen Section */}
                      <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                        <CollapsibleTrigger className="w-full h-9 sm:h-10 flex items-center justify-between px-3 hover:bg-muted/50 transition-colors border-b border-gray-200 focus:ring-0 focus:outline-none">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm leading-6 min-w-[60px]">Notizen</span>
                            <div className="w-5 h-5 bg-muted-foreground/20 text-foreground rounded-full flex items-center justify-center text-xs font-medium">
                              {notes.length}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Add note functionality
                              }}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              <Plus className="w-4 h-4 text-blue-600" />
                            </button>
                            <ChevronDown className={`w-4 h-4 transition-transform ${notesOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-b border-gray-200">
                          <div className="p-3 space-y-2">
                            {notes.map((note) => (
                              <div key={note.id} className="bg-muted/30 rounded-lg p-3 relative border">
                                <button className="absolute top-2 right-2 w-4 h-4 text-muted-foreground hover:text-foreground">
                                  <X className="w-4 h-4" />
                                </button>
                                <div className="font-medium text-sm">{note.author}</div>
                                <div className="text-xs text-muted-foreground mb-2">{note.timestamp}</div>
                                <div className="text-sm">{note.content}</div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Collapsible Termine Section */}
                      <Collapsible open={appointmentsOpen} onOpenChange={setAppointmentsOpen}>
                        <CollapsibleTrigger className="w-full h-9 sm:h-10 flex items-center justify-between px-3 hover:bg-muted/50 transition-colors focus:ring-0 focus:outline-none">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm leading-6 min-w-[60px]">Termine</span>
                            <div className="w-5 h-5 bg-muted-foreground/20 text-foreground rounded-full flex items-center justify-center text-xs font-medium">
                              0
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Add appointment functionality
                              }}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              <Plus className="w-4 h-4 text-blue-600" />
                            </button>
                            <ChevronDown className={`w-4 h-4 transition-transform ${appointmentsOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-3">
                            <div className="bg-muted/30 rounded-lg p-3 text-center text-muted-foreground border">
                              Keine Termine
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    {/* Auftrag Button */}
                    <Button className="w-full bg-black hover:bg-gray-800 text-white text-sm rounded-md">
                      <FileText className="w-4 h-4 mr-2" />
                      Auftrag
                    </Button>
                  </div>
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
    );
  };

  // Desktop or no carousel mode
  if (!isMobile || allAddresses.length <= 1) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent ref={modalContentRef} className="max-w-2xl w-[95vw] sm:w-full h-[90vh] sm:h-[80vh] overflow-hidden p-0 max-h-[90vh] rounded-xl">
          <DialogHeader className="px-4 sm:px-6 py-4 border-b flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl font-semibold">
              {currentAddress.street} {currentAddress.houseNumber}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {currentAddress.postalCode} {currentAddress.city}
            </p>
            
            <div className="flex items-center justify-between w-full pt-4 sm:pt-6">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-medium">Wohneinheiten</span>
                <div className="w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-bold">
                  {wohneinheiten}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-blue-600 text-xs sm:text-sm gap-1 border-0">
                <Plus className="w-4 h-4" />
                Hinzufügen
              </Button>
            </div>
          </DialogHeader>

          {renderAddressContent(currentAddress)}
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile/Tablet Carousel mode
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={modalContentRef} className="box-border w-[92vw] max-w-[92vw] sm:max-w-2xl sm:w-[95vw] h-[85vh] sm:h-[80vh] p-0 overflow-hidden rounded-xl">
        <div className="embla h-full w-full overflow-hidden" ref={emblaRef}>
          <div className="embla__container h-full flex">
            {allAddresses.map((addr, index) => {
              const addrUnits = addr.filteredUnits || addr.units || [];
              const addrUnitCount = addrUnits.length;
              
              return (
                <div 
                  key={addr.id} 
                  className="embla__slide flex-[0_0_100%] min-w-0 h-full"
                >
                  <div className="bg-background w-full h-full rounded-xl overflow-hidden shadow-lg flex flex-col box-border">
                    <DialogHeader className="px-4 py-4 border-b flex-shrink-0">
                      <DialogTitle className="text-lg font-semibold">
                        {addr.street} {addr.houseNumber}
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground">
                        {addr.postalCode} {addr.city}
                      </p>
                      
                      <div className="flex items-center justify-between w-full pt-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Wohneinheiten</span>
                          <div className="w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-bold">
                            {addrUnitCount}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-blue-600 text-xs gap-1 border-0">
                          <Plus className="w-4 h-4" />
                          Hinzufügen
                        </Button>
                      </div>
                    </DialogHeader>

                    {renderAddressContent(addr, index === currentIndex)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
