import { useState, useEffect, useCallback, useRef, useLayoutEffect, forwardRef } from "react";
import { X, Plus, RotateCcw, FileText, Info, Clock, ChevronDown, Check, Calendar as CalendarIcon } from "lucide-react";
import useEmblaCarousel from 'embla-carousel-react';
import { useIsMobile } from "@/hooks/use-mobile";
import { AppointmentMap } from "./AppointmentMap";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "./ui/calendar";
import { Input } from "./ui/input";
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
import { Textarea } from "./ui/textarea";

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
  const { toast } = useToast();
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
  const [lastUpdated, setLastUpdated] = useState<Record<number, string>>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [appointmentsOpen, setAppointmentsOpen] = useState(false);
  const [confirmStatusUpdateOpen, setConfirmStatusUpdateOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<number | null>(null);
  const [popoverKey, setPopoverKey] = useState(0);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [deleteNoteDialogOpen, setDeleteNoteDialogOpen] = useState(false);
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState<number | null>(null);
  const [addAppointmentDialogOpen, setAddAppointmentDialogOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);
  const [mapDisplayDate, setMapDisplayDate] = useState<Date | undefined>(undefined);
  const [showAllAppointments, setShowAllAppointments] = useState(true);
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentHour, setAppointmentHour] = useState("");
  const [appointmentMinute, setAppointmentMinute] = useState("");
  const [appointmentCustomer, setAppointmentCustomer] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [pendingAppointmentUnitId, setPendingAppointmentUnitId] = useState<number | null>(null);
  const [appointments, setAppointments] = useState<Array<{id: number, unitId: number, date: string, time: string, customer: string, notes: string, address: string, coordinates: [number, number]}>>([
    // Dummy-Termine
    {
      id: 1,
      unitId: 1,
      date: new Date().toLocaleDateString('de-DE'),
      time: "10:00",
      customer: "Max Mustermann",
      notes: "Erstbesichtigung",
      address: "Hauptstraße 12, 10115 Berlin",
      coordinates: [13.3888, 52.5170]
    },
    {
      id: 2,
      unitId: 2,
      date: new Date().toLocaleDateString('de-DE'),
      time: "14:30",
      customer: "Anna Schmidt",
      notes: "Nachbesprechung",
      address: "Lindenstraße 45, 10969 Berlin",
      coordinates: [13.3982, 52.5035]
    },
    {
      id: 3,
      unitId: 3,
      date: new Date(Date.now() + 86400000).toLocaleDateString('de-DE'), // Tomorrow
      time: "09:00",
      customer: "Peter Müller",
      notes: "",
      address: "Kastanienallee 78, 10435 Berlin",
      coordinates: [13.4050, 52.5407]
    },
    {
      id: 4,
      unitId: 4,
      date: new Date(Date.now() + 86400000).toLocaleDateString('de-DE'), // Tomorrow
      time: "16:00",
      customer: "Lisa Weber",
      notes: "Vertragsübergabe",
      address: "Bergmannstraße 23, 10961 Berlin",
      coordinates: [13.3927, 52.4905]
    }
  ]);
  const [notes, setNotes] = useState([
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
  ]);
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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
      const initialTimestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      
      setUnitStatuses(
        displayUnits.reduce((acc, unit) => ({ ...acc, [unit.id]: unit.status || "offen" }), {})
      );
      // Initialize status histories for each unit - don't add entry for "offen"
      setStatusHistories(
        displayUnits.reduce((acc, unit) => {
          const status = unit.status || "offen";
          if (status === "offen") {
            return { ...acc, [unit.id]: [] };
          }
          return { 
            ...acc, 
            [unit.id]: [
              {
                id: 1,
                status: statusOptions.find(s => s.value === status)?.label || "Offen",
                changedBy: "System",
                changedAt: initialTimestamp
              }
            ]
          };
        }, {})
      );
      // Initialize last updated timestamps - only if not "offen"
      setLastUpdated(
        displayUnits.reduce((acc, unit) => {
          const status = unit.status || "offen";
          if (status === "offen") {
            return { ...acc, [unit.id]: "" };
          }
          return { ...acc, [unit.id]: initialTimestamp };
        }, {})
      );
      setPopoverKey(0);
    }
  }, [open, currentAddress.id]);

  // Close all status popovers when scrolling in the main container
  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      // Force re-render of all popovers to close them
      setPopoverKey(prev => prev + 1);
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
      // Wait for Radix/Popper to finish positioning, then measure (2x RAF avoids race)
      let raf1 = 0;
      let raf2 = 0;
      const rafUpdate = () => update();
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(rafUpdate);
      });

      const onScroll = () => update();
      window.addEventListener("resize", update);
      window.addEventListener("scroll", onScroll, true);

      // Observe attribute/style changes on the popover content (position updates)
      const el = contentRef.current;
      let mo: MutationObserver | undefined;
      if (el) {
        mo = new MutationObserver(() => update());
        mo.observe(el, { attributes: true, attributeFilter: ["style", "data-state", "data-side"] });
      }

      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", onScroll, true);
        mo?.disconnect();
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
    const timestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    // Update last updated time
    setLastUpdated(prev => ({ ...prev, [unitId]: timestamp }));
    
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

    // Show toast notification
    toast({
      title: "✓ Status geändert",
      className: "bg-green-400/80 text-white border-0 w-auto max-w-[250px] p-3 py-2",
    });
  };

  const handleSameStatusUpdate = (unitId: number) => {
    setPendingStatusUpdate(unitId);
    setConfirmStatusUpdateOpen(true);
  };

  const confirmSameStatusUpdate = () => {
    if (pendingStatusUpdate === null) return;
    
    const currentStatus = unitStatuses[pendingStatusUpdate] || "offen";
    const statusLabel = statusOptions.find(s => s.value === currentStatus)?.label || currentStatus;
    const timestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    // Update last updated time
    setLastUpdated(prev => ({ ...prev, [pendingStatusUpdate]: timestamp }));
    
    setStatusHistories(prev => ({
      ...prev,
      [pendingStatusUpdate]: [
        {
          id: Date.now(),
          status: statusLabel,
          changedBy: "Abdullah Kater",
          changedAt: timestamp
        },
        ...(prev[pendingStatusUpdate] || [])
      ]
    }));

    // Show toast notification
    toast({
      title: "✓ Status aktualisiert",
      className: "bg-green-400/80 text-white border-0 w-auto max-w-[250px] p-3 py-2",
    });
    
    setConfirmStatusUpdateOpen(false);
    setPendingStatusUpdate(null);
  };

  const handleAddNote = () => {
    if (newNoteText.trim() === "") return;
    
    const timestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    const newNote = {
      id: Date.now(),
      author: "Abdullah Kater",
      timestamp: timestamp,
      content: newNoteText.trim()
    };
    
    setNotes(prev => [newNote, ...prev]);
    setNewNoteText("");
    setAddNoteDialogOpen(false);
    
    // Show toast notification
    toast({
      title: "✓ Notiz hinzugefügt",
      className: "bg-green-400/80 text-white border-0 w-auto max-w-[250px] p-3 py-2",
    });
  };

  const handleDeleteNote = (noteId: number) => {
    setPendingDeleteNoteId(noteId);
    setDeleteNoteDialogOpen(true);
  };

  const confirmDeleteNote = () => {
    if (pendingDeleteNoteId === null) return;
    
    setNotes(prev => prev.filter(note => note.id !== pendingDeleteNoteId));
    setDeleteNoteDialogOpen(false);
    setPendingDeleteNoteId(null);
    
    // Show toast notification
    toast({
      title: "✓ Notiz gelöscht",
      className: "bg-green-400/80 text-white border-0 w-auto max-w-[250px] p-3 py-2",
    });
  };

  const handleAddAppointment = (unitId: number) => {
    setPendingAppointmentUnitId(unitId);
    setAddAppointmentDialogOpen(true);
  };

  const saveAppointment = () => {
    if (!appointmentDate || !appointmentTime || pendingAppointmentUnitId === null) return;

    // Generate random coordinates around Berlin for demo
    const baseCoords: [number, number] = [13.404954, 52.520008];
    const randomOffset = () => (Math.random() - 0.5) * 0.1;
    const coordinates: [number, number] = [
      baseCoords[0] + randomOffset(),
      baseCoords[1] + randomOffset()
    ];

    const newAppointment = {
      id: Date.now(),
      unitId: pendingAppointmentUnitId,
      date: appointmentDate.toLocaleDateString('de-DE'),
      time: appointmentTime,
      customer: appointmentCustomer,
      notes: appointmentNotes,
      address: `${currentAddress.street} ${currentAddress.houseNumber}, ${currentAddress.postalCode} ${currentAddress.city}`,
      coordinates
    };

    setAppointments(prev => [...prev, newAppointment].sort((a, b) => {
      const dateA = new Date(`${a.date.split('.').reverse().join('-')} ${a.time}`);
      const dateB = new Date(`${b.date.split('.').reverse().join('-')} ${b.time}`);
      return dateA.getTime() - dateB.getTime();
    }));
    
    // Set status to "termin"
    handleStatusChange(pendingAppointmentUnitId, "termin");

    // Reset form
    setAppointmentDate(undefined);
    setAppointmentTime("");
    setAppointmentHour("");
    setAppointmentMinute("");
    setAppointmentCustomer("");
    setAppointmentNotes("");
    setAddAppointmentDialogOpen(false);
    setPendingAppointmentUnitId(null);

    toast({
      title: "✓ Termin hinzugefügt",
      className: "bg-green-400/80 text-white border-0 w-auto max-w-[250px] p-3 py-2",
    });
  };

  const renderAddressContent = (addr: Address, isCurrentSlide: boolean = true) => {
    const units = addr.filteredUnits || addr.units || [];
    const unitCount = units.length;
    
    return (
      <div className="flex flex-col h-full w-full overflow-hidden touch-pan-y">
        {/* Left Panel */}
        <div ref={scrollContainerRef} className={`flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden px-3 sm:px-6 pt-4 touch-pan-y ${unitCount > 1 ? 'space-y-4 sm:space-y-6' : ''}`}>
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
                          <Select defaultValue={(unitStatuses[unit.id] || "offen") === "offen" ? undefined : unit.floor}>
                            <SelectTrigger className="w-full max-w-full min-w-0 h-9 sm:h-10 border border-border rounded-md shadow-none bg-background focus:ring-0 focus:outline-none">
                              <SelectValue placeholder="Auswählen" />
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
                          <Select defaultValue={(unitStatuses[unit.id] || "offen") === "offen" ? undefined : unit.position}>
                            <SelectTrigger className="w-full max-w-full min-w-0 h-9 sm:h-10 border border-border rounded-md shadow-none bg-background focus:ring-0 focus:outline-none">
                              <SelectValue placeholder="Auswählen" />
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
                          <SelectTrigger className="flex-1 h-9 sm:h-10 border border-border rounded-md shadow-none bg-background focus:ring-0 focus:outline-none">
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
                        <Popover key={`popover-${unit.id}-${popoverKey}`}>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-9 px-3 gap-2 text-xs font-medium shrink-0 relative"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Historie
                              {statusHistories[unit.id] && statusHistories[unit.id].length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                  {statusHistories[unit.id].length}
                                </span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverPrimitive.Portal container={modalContentRef.current ?? undefined}>
                            <BoundedPopoverContent
                              modalRef={modalContentRef}
                              align="end"
                              sideOffset={8}
                              className="w-64 p-0 z-[1200] overflow-hidden rounded-md border bg-popover shadow-xl"
                            >
                              <div
                                className="overflow-y-auto overscroll-contain touch-pan-y"
                                onWheel={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                style={{ WebkitOverflowScrolling: 'touch' }}
                              >
                                <div className="sticky top-0 bg-popover z-10 p-3 pb-2 border-b border-border">
                                  <h3 className="font-medium text-sm">Status Historie</h3>
                                </div>
                                <div className="p-3 pt-2">
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
                      <Button 
                        onClick={() => handleSameStatusUpdate(unit.id)}
                        className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Gleicher Status
                      </Button>
                    )}

                    {lastUpdated[unit.id] && (
                      <p className="text-xs text-muted-foreground">
                        Aktualisiert: {lastUpdated[unit.id]}
                      </p>
                    )}

                    {/* Combined Notizen & Termine Container */}
                    <div className="bg-background border border-border rounded-md overflow-hidden box-border max-w-full w-full">
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
                                setAddNoteDialogOpen(true);
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
                            {notes.length > 0 ? (
                              notes.map((note) => (
                                <div key={note.id} className="bg-muted/30 rounded-lg p-3 relative border">
                                  <button 
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="absolute top-2 right-2 w-4 h-4 text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <div className="font-medium text-sm">{note.author}</div>
                                  <div className="text-xs text-muted-foreground mb-2">{note.timestamp}</div>
                                  <div className="text-sm">{note.content}</div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground text-center py-4">
                                Keine Notizen vorhanden
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Collapsible Termine Section */}
                      <Collapsible open={appointmentsOpen} onOpenChange={setAppointmentsOpen}>
                        <CollapsibleTrigger className="w-full h-9 sm:h-10 flex items-center justify-between px-3 hover:bg-muted/50 transition-colors focus:ring-0 focus:outline-none">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm leading-6 min-w-[60px]">Termine</span>
                            <div className="w-5 h-5 bg-muted-foreground/20 text-foreground rounded-full flex items-center justify-center text-xs font-medium">
                              {appointments.filter(apt => apt.unitId === unit.id).length}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddAppointment(unit.id);
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
                            {appointments.filter(apt => apt.unitId === unit.id).length > 0 ? (
                              <div className="space-y-2">
                                {appointments.filter(apt => apt.unitId === unit.id).map((appointment) => (
                                  <div key={appointment.id} className="rounded-lg p-3 border bg-blue-50 border-blue-200">
                                    <div className="flex items-start gap-2 mb-2">
                                      <CalendarIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm">{appointment.date} - {appointment.time}</div>
                                        {appointment.customer && (
                                          <div className="text-sm text-muted-foreground">Kunde: {appointment.customer}</div>
                                        )}
                                        {appointment.notes && (
                                          <div className="text-xs text-muted-foreground mt-1">{appointment.notes}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground text-center py-4">
                                Keine Termine vorhanden
                              </div>
                            )}
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
      <>
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

        <AlertDialog open={confirmStatusUpdateOpen} onOpenChange={setConfirmStatusUpdateOpen}>
          <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Status aktualisieren</AlertDialogTitle>
              <AlertDialogDescription>
                Möchtest du den gleichen Status erneut setzen?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
              <AlertDialogAction 
                onClick={confirmSameStatusUpdate}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Bestätigen
              </AlertDialogAction>
              <AlertDialogCancel className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0 m-0">
                <X className="w-4 h-4 mr-2" />
                Abbrechen
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Mobile/Tablet Carousel mode
  return (
    <>
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

      <AlertDialog open={confirmStatusUpdateOpen} onOpenChange={setConfirmStatusUpdateOpen}>
        <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Status aktualisieren</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du den gleichen Status erneut setzen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
            <AlertDialogAction 
              onClick={confirmSameStatusUpdate}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Bestätigen
            </AlertDialogAction>
            <AlertDialogCancel className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0 m-0">
              <X className="w-4 h-4 mr-2" />
              Abbrechen
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addNoteDialogOpen} onOpenChange={setAddNoteDialogOpen}>
        <DialogContent className="w-[90vw] max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Notiz hinzufügen</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Notiz eingeben..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            className="min-h-[120px] resize-none border-border focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div className="flex gap-3">
            <Button
              onClick={handleAddNote}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Bestätigen
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAddNoteDialogOpen(false);
                setNewNoteText("");
              }}
              className="flex-1"
            >
              Abbrechen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addAppointmentDialogOpen} onOpenChange={setAddAppointmentDialogOpen}>
        <DialogContent className="w-[90vw] max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Termin hinzufügen</DialogTitle>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Datum *</label>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal border-border ${!appointmentDate && "text-muted-foreground"}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appointmentDate ? appointmentDate.toLocaleDateString('de-DE') : "Datum wählen"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={appointmentDate}
                      onSelect={(date) => {
                        setAppointmentDate(date);
                        setDatePopoverOpen(false);
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Uhrzeit *</label>
                <div className="flex gap-2">
                  <Select 
                    value={appointmentHour} 
                    onValueChange={(value) => {
                      setAppointmentHour(value);
                      if (value && appointmentMinute) {
                        setAppointmentTime(`${value}:${appointmentMinute}`);
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1 border-border focus:ring-0 focus:outline-none">
                      <SelectValue placeholder="Stunde" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 14 }, (_, i) => i + 8).map((hour) => (
                        <SelectItem key={hour} value={hour.toString().padStart(2, '0')}>
                          {hour.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={appointmentMinute} 
                    onValueChange={(value) => {
                      setAppointmentMinute(value);
                      if (appointmentHour && value) {
                        setAppointmentTime(`${appointmentHour}:${value}`);
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1 border-border focus:ring-0 focus:outline-none">
                      <SelectValue placeholder="Minute" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                        <SelectItem key={minute} value={minute.toString().padStart(2, '0')}>
                          {minute.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Kundenname</label>
                <Input
                  placeholder="Optional"
                  value={appointmentCustomer}
                  onChange={(e) => setAppointmentCustomer(e.target.value)}
                  className="border-border focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Notizen</label>
                <Textarea
                  placeholder="Optional"
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  className="min-h-[80px] resize-none border-border focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* Right Column - Map and Appointments */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (showAllAppointments) {
                        setMapDisplayDate(new Date());
                        setShowAllAppointments(false);
                      } else if (mapDisplayDate) {
                        const prevDay = new Date(mapDisplayDate);
                        prevDay.setDate(prevDay.getDate() - 1);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (prevDay >= today) {
                          setMapDisplayDate(prevDay);
                        }
                      }
                    }}
                    disabled={!showAllAppointments && mapDisplayDate && mapDisplayDate <= new Date(new Date().setHours(0, 0, 0, 0))}
                    className="h-8"
                  >
                    ←
                  </Button>
                  
                  <div className="flex-1 text-center">
                    <Button
                      variant={showAllAppointments ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setShowAllAppointments(true);
                        setMapDisplayDate(undefined);
                      }}
                      className="h-8 text-xs"
                    >
                      {showAllAppointments ? (
                        `Alle Termine (${appointments.length})`
                      ) : mapDisplayDate ? (
                        `Termine am ${mapDisplayDate.toLocaleDateString('de-DE')} (${appointments.filter(apt => apt.date === mapDisplayDate.toLocaleDateString('de-DE')).length})`
                      ) : (
                        "Alle Termine"
                      )}
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (showAllAppointments) {
                        setMapDisplayDate(new Date());
                        setShowAllAppointments(false);
                      } else if (mapDisplayDate) {
                        const nextDay = new Date(mapDisplayDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        setMapDisplayDate(nextDay);
                      } else {
                        setMapDisplayDate(new Date());
                      }
                    }}
                    className="h-8"
                  >
                    →
                  </Button>
                </div>
                
                <AppointmentMap 
                  appointments={appointments}
                  selectedDate={showAllAppointments ? undefined : mapDisplayDate}
                  currentAddress={{
                    street: currentAddress.street,
                    houseNumber: currentAddress.houseNumber,
                    postalCode: currentAddress.postalCode,
                    city: currentAddress.city,
                    coordinates: [13.404954 + (Math.random() - 0.5) * 0.05, 52.520008 + (Math.random() - 0.5) * 0.05]
                  }}
                />
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-3">Deine Termine</h3>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {appointments.length > 0 ? (
                    appointments.map((apt) => (
                      <div key={apt.id} className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-xs">
                        <div className="font-medium mb-1">{apt.date} - {apt.time}</div>
                        <div className="text-muted-foreground">{apt.address}</div>
                        {apt.customer && (
                          <div className="text-muted-foreground mt-1">Kunde: {apt.customer}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Noch keine Termine vorhanden
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={saveAppointment}
              disabled={!appointmentDate || !appointmentTime}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
            >
              <Check className="w-4 h-4 mr-2" />
              Speichern
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAddAppointmentDialogOpen(false);
                setAppointmentDate(undefined);
                setAppointmentTime("");
                setAppointmentHour("");
                setAppointmentMinute("");
                setAppointmentCustomer("");
                setAppointmentNotes("");
                setPendingAppointmentUnitId(null);
              }}
              className="flex-1"
            >
              Abbrechen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteNoteDialogOpen} onOpenChange={setDeleteNoteDialogOpen}>
        <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Notiz löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du diese Notiz wirklich löschen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
            <AlertDialogAction 
              onClick={confirmDeleteNote}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Bestätigen
            </AlertDialogAction>
            <AlertDialogCancel className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0 m-0">
              <X className="w-4 h-4 mr-2" />
              Abbrechen
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
