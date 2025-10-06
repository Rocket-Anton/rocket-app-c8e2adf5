import { useState, useEffect, useCallback, useRef, useLayoutEffect, forwardRef, useMemo } from "react";
import { X, Plus, RotateCcw, FileText, Info, Clock, ChevronDown, Check, Calendar as CalendarIcon, Star } from "lucide-react";
import useEmblaCarousel from 'embla-carousel-react';
import { useIsMobile } from "@/hooks/use-mobile";
import { AppointmentMap } from "./AppointmentMap";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SelectPrimitive from "@radix-ui/react-select";
import HorizontalModalPager from "./modal/HorizontalModalPager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { cn } from "@/lib/utils";

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
  onClose?: (finalIndex: number) => void;
}

export const AddressDetailModal = ({ address, allAddresses = [], initialIndex = 0, open, onOpenChange, onClose }: AddressDetailModalProps) => {
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
  
  // Handle dialog close and notify parent with final index
  const handleDialogChange = (open: boolean) => {
    if (!open && onClose) {
      onClose(currentIndex);
    }
    onOpenChange(open);
  };
  
  // Use filteredUnits if available (from status filter), otherwise use all units
  const displayUnits = currentAddress.filteredUnits || currentAddress.units || [];
  const wohneinheiten = displayUnits.length;
  
  // State for each unit's current status
  const [unitStatuses, setUnitStatuses] = useState<Record<string, string>>({});
  const [statusHistories, setStatusHistories] = useState<Record<string, Array<{id: number, status: string, changedBy: string, changedAt: string}>>>({});
  const [lastUpdated, setLastUpdated] = useState<Record<string, string>>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [appointmentsOpen, setAppointmentsOpen] = useState(false);
  const [confirmStatusUpdateOpen, setConfirmStatusUpdateOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<string | null>(null);
  const [popoverKey, setPopoverKey] = useState(0);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [deleteNoteDialogOpen, setDeleteNoteDialogOpen] = useState(false);
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState<number | null>(null);
  
  // Kein Interesse Dialog States
  const [keinInteresseDialogOpen, setKeinInteresseDialogOpen] = useState(false);
  const [pendingKeinInteresse, setPendingKeinInteresse] = useState<{addressId: number, unitId: number} | null>(null);
  const [keinInteresseReason, setKeinInteresseReason] = useState<string>("");
  const [keinInteresseCustomText, setKeinInteresseCustomText] = useState<string>("");
  
  // Potenzial Bewertung Dialog States
  const [potenzialDialogOpen, setPotenzialDialogOpen] = useState(false);
  const [pendingPotenzial, setPendingPotenzial] = useState<{addressId: number, unitId: number} | null>(null);
  const [potenzialRating, setPotenzialRating] = useState<number>(0);
  const [potenzialHoverRating, setPotenzialHoverRating] = useState<number>(0);
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
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [appointments, setAppointments] = useState<Array<{id: number, unitId: number, date: string, time: string, customer: string, notes: string, address: string, coordinates: [number, number]}>>([
    // Dummy-Termine in Alt-Lindenau
    {
      id: 1,
      unitId: 1,
      date: new Date().toLocaleDateString('de-DE'),
      time: "10:00",
      customer: "Max Mustermann",
      notes: "Erstbesichtigung",
      address: "Alt-Lindenau 12, 88175 Lindenau",
      coordinates: [10.0315, 47.5585]
    },
    {
      id: 2,
      unitId: 2,
      date: new Date().toLocaleDateString('de-DE'),
      time: "14:30",
      customer: "Anna Schmidt",
      notes: "Nachbesprechung",
      address: "Alt-Lindenau 15, 88175 Lindenau",
      coordinates: [10.0320, 47.5590]
    },
    {
      id: 3,
      unitId: 3,
      date: new Date(Date.now() + 86400000).toLocaleDateString('de-DE'), // Tomorrow
      time: "09:00",
      customer: "Peter Müller",
      notes: "",
      address: "Alt-Lindenau 20, 88175 Lindenau",
      coordinates: [10.0325, 47.5595]
    },
    {
      id: 4,
      unitId: 4,
      date: new Date(Date.now() + 86400000).toLocaleDateString('de-DE'), // Tomorrow
      time: "16:00",
      customer: "Lisa Weber",
      notes: "Vertragsübergabe",
      address: "Alt-Lindenau 25, 88175 Lindenau",
      coordinates: [10.0330, 47.5600]
    }
  ]);
  const [notes, setNotes] = useState<Array<{id: number, author: string, timestamp: string, content: string, permanent?: boolean}>>([
    {
      id: 1,
      author: "Abdullah Kater",
      timestamp: "16.07.25 18:41",
      content: "Möchte Nix.",
      permanent: false
    },
    {
      id: 2,
      author: "Abdullah Kater", 
      timestamp: "16.07.25 18:41",
      content: "",
      permanent: false
    }
  ]);
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const unitCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const currentAddressCoordsRef = useRef<[number, number]>([10.0310, 47.5580]); // Koordinaten für Lindenau

  // Memoize current address for map to prevent unnecessary re-renders
  const mapCurrentAddress = useMemo(() => ({
    street: currentAddress.street,
    houseNumber: currentAddress.houseNumber,
    postalCode: currentAddress.postalCode,
    city: currentAddress.city,
    coordinates: currentAddressCoordsRef.current
  }), [currentAddress.street, currentAddress.houseNumber, currentAddress.postalCode, currentAddress.city]);

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
  
  // Helper function to initialize states for an address
  const initializeAddressStates = useCallback((addr: Address) => {
    const units = addr.filteredUnits || addr.units || [];
    const initialTimestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    setUnitStatuses(prev => ({
      ...prev,
      ...units.reduce((acc, unit) => {
        const key = `${addr.id}:${unit.id}`;
        return { ...acc, [key]: unit.status || "offen" };
      }, {})
    }));
    
    setStatusHistories(prev => ({
      ...prev,
      ...units.reduce((acc, unit) => {
        const status = unit.status || "offen";
        const key = `${addr.id}:${unit.id}`;
        if (status === "offen") {
          return { ...acc, [key]: [] };
        }
        return { 
          ...acc, 
          [key]: [
            {
              id: 1,
              status: statusOptions.find(s => s.value === status)?.label || "Offen",
              changedBy: "System",
              changedAt: initialTimestamp
            }
          ]
        };
      }, {})
    }));
    
    setLastUpdated(prev => ({
      ...prev,
      ...units.reduce((acc, unit) => {
        const status = unit.status || "offen";
        const key = `${addr.id}:${unit.id}`;
        if (status === "offen") {
          return { ...acc, [key]: "" };
        }
        return { ...acc, [key]: initialTimestamp };
      }, {})
    }));
  }, []);
  
  // Prefetch states for current and neighbor addresses
  useEffect(() => {
    if (!open || allAddresses.length === 0) return;
    
    // Initialize current and neighbors (left and right)
    const indicesToPrefetch = [
      currentIndex - 1,
      currentIndex,
      currentIndex + 1
    ].filter(i => i >= 0 && i < allAddresses.length);
    
    indicesToPrefetch.forEach(idx => {
      initializeAddressStates(allAddresses[idx]);
    });
    
    setPopoverKey(0);
  }, [open, currentIndex, allAddresses, initializeAddressStates]);
  

  // Disable auto-closing popovers on scroll to ensure 'Historie' opens reliably on mobile
  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;
    // No listeners; rely on user interactions to close.
    return () => {
      // nothing
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
        style={{ maxHeight: maxH, ["--bounded-max-h" as any]: `${maxH ?? 0}px` }}
      >
        {children}
      </PopoverContent>
    );
  });

  // Select-Content, der die Höhe an die Unterkante der Modal begrenzt und nie nach oben flippt
  const BoundedSelectContent = forwardRef<
    HTMLDivElement,
    {
      modalRef: React.RefObject<HTMLElement>;
      className?: string;
      align?: "start" | "center" | "end";
      sideOffset?: number;
      children: React.ReactNode;
    }
  >(({ modalRef, className, align = "start", sideOffset = 8, children }, _ref) => {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const [maxH, setMaxH] = useState<number | undefined>();

    const update = useCallback(() => {
      const modalEl = modalRef?.current as HTMLElement | null;
      const contentEl = contentRef.current as HTMLElement | null;
      if (!modalEl || !contentEl) return;

      const modalRect = modalEl.getBoundingClientRect();
      const contentRect = contentEl.getBoundingClientRect();
      // freie Höhe bis zur Unterkante der Modal-Karte (kleines Padding)
      const available = Math.max(160, Math.floor(modalRect.bottom - contentRect.top - 8));
      setMaxH(available);
    }, [modalRef]);

    useLayoutEffect(() => {
      // Initial updates to ensure correct first open after popper positions
      update();
      const t = setTimeout(() => update(), 0);
      let r1 = 0, r2 = 0;
      r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => {
          update();
        });
      });

      const onScroll = () => update();
      window.addEventListener("resize", update);
      window.addEventListener("scroll", onScroll, true);

      const el = contentRef.current;
      const mo = el ? new MutationObserver(() => update()) : undefined;
      if (el) mo!.observe(el, { attributes: true, attributeFilter: ["style", "data-state", "data-side"] });

      // Observe size changes of the modal container and content
      const modalEl = modalRef?.current ?? null;
      const roModal = modalEl ? new ResizeObserver(() => update()) : undefined;
      if (modalEl) roModal!.observe(modalEl);

      const roContent = el ? new ResizeObserver(() => update()) : undefined;
      if (el) roContent!.observe(el);

      return () => {
        clearTimeout(t);
        cancelAnimationFrame(r1); cancelAnimationFrame(r2);
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", onScroll, true);
        mo?.disconnect();
        roModal?.disconnect();
        roContent?.disconnect();
      };
    }, [update, modalRef]);

    return (
      <SelectPrimitive.Portal container={modalRef?.current ?? undefined}>
        <SelectPrimitive.Content
          ref={contentRef}
          position="popper"
          side="bottom"
          align={align}
          sideOffset={sideOffset}
          avoidCollisions={false}
          className={cn(
            "z-[1200] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-xl",
            className
          )}
          style={{ maxHeight: maxH ? `${maxH}px` : undefined }}
        >
          <SelectPrimitive.Viewport
            className="p-1 overflow-y-auto overscroll-contain touch-pan-y w-full min-w-[var(--radix-select-trigger-width)]"
            onWheel={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            style={{ WebkitOverflowScrolling: "touch", maxHeight: "100%" } as any}
          >
            {children}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    );
  });
  BoundedSelectContent.displayName = "BoundedSelectContent";

  const showStatusUpdateButton = (status: string) => {
    return ["nicht-angetroffen", "karte-eingeworfen", "potenzial"].includes(status);
  };

  const handleStatusChange = (addressId: number, unitId: number, newStatus: string) => {
    const k = `${addressId}:${unitId}`;
    
    console.log("handleStatusChange called with:", { addressId, unitId, newStatus });
    
    // Wenn "kein-interesse" ausgewählt wird, öffne den Dialog zur Begründung
    if (newStatus === "kein-interesse") {
      console.log("Opening kein-interesse dialog");
      setPendingKeinInteresse({ addressId, unitId });
      setKeinInteresseDialogOpen(true);
      return; // Nicht direkt Status setzen
    }
    
    // Wenn "potenzial" ausgewählt wird, öffne den Bewertungs-Dialog
    if (newStatus === "potenzial") {
      console.log("Opening potenzial dialog");
      setPendingPotenzial({ addressId, unitId });
      setPotenzialDialogOpen(true);
      return; // Nicht direkt Status setzen
    }
    
    setUnitStatuses(prev => ({ ...prev, [k]: newStatus }));

    const statusLabel = statusOptions.find(s => s.value === newStatus)?.label || newStatus;
    const timestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    setLastUpdated(prev => ({ ...prev, [k]: timestamp }));

    setStatusHistories(prev => ({
      ...prev,
      [k]: [
        {
          id: Date.now(),
          status: statusLabel,
          changedBy: "Abdullah Kater",
          changedAt: timestamp
        },
        ...(prev[k] || [])
      ]
    }));

    toast({
      title: "✓ Status geändert",
      className: "bg-green-400 text-white border-0 w-auto max-w-[250px] p-3 py-2",
      duration: 1000,
    });
  };

  const handleSameStatusUpdate = (addressId: number, unitId: number) => {
    const k = `${addressId}:${unitId}`;
    setPendingStatusUpdate(k);
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
      className: "bg-green-400 text-white border-0 w-auto max-w-[250px] p-3 py-2",
      duration: 1000,
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
      className: "bg-green-400 text-white border-0 w-auto max-w-[250px] p-3 py-2",
      duration: 1000,
    });
  };

  const handleDeleteNote = (noteId: number) => {
    // Prüfen, ob die Notiz permanent ist
    const note = notes.find(n => n.id === noteId);
    if (note?.permanent) {
      toast({
        title: "Diese Notiz kann nicht gelöscht werden",
        className: "bg-red-400 text-white border-0 w-auto max-w-[250px] p-3 py-2",
        duration: 2000,
      });
      return;
    }
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
      className: "bg-green-400 text-white border-0 w-auto max-w-[250px] p-3 py-2",
      duration: 1000,
    });
  };
  
  const confirmKeinInteresse = () => {
    if (!pendingKeinInteresse || !keinInteresseReason) return;
    
    const { addressId, unitId } = pendingKeinInteresse;
    const k = `${addressId}:${unitId}`;
    
    // Grund-Text erstellen
    let reasonText = keinInteresseReason;
    if (keinInteresseReason === "Anderer Grund" && keinInteresseCustomText.trim()) {
      reasonText = keinInteresseCustomText.trim();
    }
    
    // Permanente Notiz hinzufügen
    const timestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const newNote = {
      id: Date.now(),
      author: "Abdullah Kater",
      timestamp: timestamp,
      content: `Kein Interesse: ${reasonText}`,
      permanent: true
    };
    
    setNotes(prev => [newNote, ...prev]);
    
    // Jetzt Status auf "kein-interesse" setzen
    setUnitStatuses(prev => ({ ...prev, [k]: "kein-interesse" }));
    
    const statusLabel = statusOptions.find(s => s.value === "kein-interesse")?.label || "Kein Interesse";
    const statusTimestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    setLastUpdated(prev => ({ ...prev, [k]: statusTimestamp }));
    
    setStatusHistories(prev => ({
      ...prev,
      [k]: [
        {
          id: Date.now(),
          status: statusLabel,
          changedBy: "Abdullah Kater",
          changedAt: statusTimestamp
        },
        ...(prev[k] || [])
      ]
    }));
    
    toast({
      title: "✓ Status geändert",
      className: "bg-green-400 text-white border-0 w-auto max-w-[250px] p-3 py-2",
      duration: 1000,
    });
    
    // Dialog schließen und zurücksetzen
    setKeinInteresseDialogOpen(false);
    setPendingKeinInteresse(null);
    setKeinInteresseReason("");
    setKeinInteresseCustomText("");
  };
  
  const confirmPotenzialRating = () => {
    if (!pendingPotenzial || potenzialRating === 0) return;
    
    const { addressId, unitId } = pendingPotenzial;
    const k = `${addressId}:${unitId}`;
    
    // Status auf "potenzial" setzen
    setUnitStatuses(prev => ({ ...prev, [k]: "potenzial" }));
    
    const statusLabel = statusOptions.find(s => s.value === "potenzial")?.label || "Potenzial";
    const timestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    setLastUpdated(prev => ({ ...prev, [k]: timestamp }));
    
    setStatusHistories(prev => ({
      ...prev,
      [k]: [
        {
          id: Date.now(),
          status: `${statusLabel} (${potenzialRating} ⭐)`,
          changedBy: "Abdullah Kater",
          changedAt: timestamp
        },
        ...(prev[k] || [])
      ]
    }));
    
    toast({
      title: "✓ Status geändert",
      className: "bg-green-400 text-white border-0 w-auto max-w-[250px] p-3 py-2",
      duration: 1000,
    });
    
    // Dialog schließen und zurücksetzen
    setPotenzialDialogOpen(false);
    setPendingPotenzial(null);
    setPotenzialRating(0);
    setPotenzialHoverRating(0);
  };

  const handleAddAppointment = (unitId: number) => {
    setPendingAppointmentUnitId(unitId);
    // Set map to show appointments for selected date when dialog opens
    if (appointmentDate) {
      setMapDisplayDate(appointmentDate);
      setShowAllAppointments(false);
    }
    setAddAppointmentDialogOpen(true);
  };

  const saveAppointment = () => {
    if (!appointmentDate || !appointmentTime || pendingAppointmentUnitId === null) return;

    // Generate coordinates around Lindenau for demo
    const baseCoords: [number, number] = [10.0310, 47.5580];
    const randomOffset = () => (Math.random() - 0.5) * 0.005;
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
    handleStatusChange(currentAddress.id, pendingAppointmentUnitId, "termin");

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
      className: "bg-green-400 text-white border-0 w-auto max-w-[250px] p-3 py-2",
      duration: 1000,
    });
  };

  const renderAddressContent = (addr: Address) => {
    const units = addr.filteredUnits || addr.units || [];
    const unitCount = units.length;
    
    return (
      <div className="flex flex-col h-full w-full overflow-hidden touch-pan-y">
        {/* Left Panel */}
        <div ref={scrollContainerRef} className={`flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden px-3 sm:px-6 pt-4 pb-6 touch-pan-y ${unitCount > 1 ? 'space-y-4 sm:space-y-6' : ''}`}>
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
                        <div className="flex-[2] min-w-0">
                          <Select defaultValue={(unitStatuses[`${addr.id}:${unit.id}`] || "offen") === "offen" ? undefined : unit.floor}>
                            <SelectTrigger className="w-full max-w-full min-w-0 h-9 sm:h-10 border border-border rounded-md shadow-none bg-background focus:ring-0 focus:outline-none">
                              <SelectValue placeholder="EG" />
                            </SelectTrigger>
                            <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10000]">
                              <SelectItem value="EG">EG</SelectItem>
                              <SelectItem value="1. OG">1. OG</SelectItem>
                              <SelectItem value="2. OG">2. OG</SelectItem>
                              <SelectItem value="3. OG">3. OG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex-1 min-w-0">
                          <Select defaultValue={(unitStatuses[`${addr.id}:${unit.id}`] || "offen") === "offen" ? undefined : unit.position}>
                            <SelectTrigger className="w-full max-w-full min-w-0 h-9 sm:h-10 border border-border rounded-md shadow-none bg-background focus:ring-0 focus:outline-none">
                              <SelectValue placeholder="Rechts" />
                            </SelectTrigger>
                            <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10000]">
                              <SelectItem value="Links">Links</SelectItem>
                              <SelectItem value="Rechts">Rechts</SelectItem>
                              <SelectItem value="Mitte">Mitte</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <div className="flex gap-3 min-w-0">
                        <div className="flex-[2] min-w-0">
                          <Select 
                            value={unitStatuses[`${addr.id}:${unit.id}`] || "offen"}
                            onValueChange={(value) => handleStatusChange(addr.id, unit.id, value)}
                          >
                            <SelectTrigger className="w-full h-9 sm:h-10 border border-border rounded-md shadow-none bg-background focus:ring-0 focus:outline-none">
                              <SelectValue>
                                {(() => {
                                  const currentStatus = unitStatuses[`${addr.id}:${unit.id}`] || "offen";
                                  const statusOption = statusOptions.find(s => s.value === currentStatus);
                                  return statusOption ? (
                                    <div className={`px-2 py-1.5 text-xs font-medium rounded ${statusOption.color}`}>
                                      {statusOption.label}
                                    </div>
                                  ) : null;
                                })()}
                              </SelectValue>
                            </SelectTrigger>
                            <BoundedSelectContent modalRef={modalContentRef} align="start" sideOffset={8}>
                              {statusOptions
                                .filter(status => status.value !== "offen" && status.value !== "neukunde" && status.value !== "termin")
                                .map((status) => (
                                  <SelectItem key={status.value} value={status.value}>
                                    <div className={`px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                                      {status.label}
                                    </div>
                                  </SelectItem>
                                ))}
                            </BoundedSelectContent>
                          </Select>
                        </div>

                        <div className="flex-1 min-w-0">
                          <Popover key={`popover-${unit.id}-${popoverKey}`}>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-full h-9 sm:h-10 border border-border rounded-md shadow-none bg-background justify-between text-sm font-normal relative px-3"
                              >
                                <span>Historie</span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                                {statusHistories[`${addr.id}:${unit.id}`] && statusHistories[`${addr.id}:${unit.id}`].length > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                    {statusHistories[`${addr.id}:${unit.id}`].length}
                                  </span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverPrimitive.Portal container={modalContentRef.current ?? undefined}>
                              <BoundedPopoverContent
                                modalRef={modalContentRef}
                                align="end"
                                sideOffset={8}
                                className="w-64 p-0 z-[9999] overflow-hidden rounded-md border bg-popover shadow-xl"
                              >
                                <div
                                  className="max-h-[var(--bounded-max-h)] overflow-y-auto overscroll-contain touch-pan-y"
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
                                      {(statusHistories[`${addr.id}:${unit.id}`] || []).length > 0 ? (
                                        (statusHistories[`${addr.id}:${unit.id}`] || []).map((history) => {
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
                                        })
                                      ) : (
                                        <div className="text-sm text-muted-foreground text-center py-4">
                                          Kein Update vorhanden
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </BoundedPopoverContent>
                            </PopoverPrimitive.Portal>
                          </Popover>
                        </div>
                      </div>
                    </div>

                    {showStatusUpdateButton(unitStatuses[`${addr.id}:${unit.id}`] || "offen") && (
                      <Button 
                        onClick={() => handleSameStatusUpdate(addr.id, unit.id)}
                        className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Gleicher Status
                      </Button>
                    )}

                    {lastUpdated[`${addr.id}:${unit.id}`] && (
                      <p className="text-xs text-muted-foreground">
                        Aktualisiert: {lastUpdated[`${addr.id}:${unit.id}`]}
                      </p>
                    )}

                    {/* Combined Notizen & Termine Container */}
                    <div className="bg-background border border-border rounded-md overflow-hidden box-border max-w-full w-full">
                      {/* Collapsible Notizen Section */}
                      <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                        <CollapsibleTrigger className="w-full h-11 md:h-12 flex items-center justify-between px-3 hover:bg-muted/50 transition-colors border-b border-gray-200 focus:ring-0 focus:outline-none">
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
                              className="p-1.5 md:p-2 hover:bg-muted rounded transition-colors"
                            >
                              <Plus className="w-4 md:w-5 h-4 md:h-5 text-blue-600" />
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
                        <CollapsibleTrigger className="w-full h-11 md:h-12 flex items-center justify-between px-3 hover:bg-muted/50 transition-colors focus:ring-0 focus:outline-none">
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
                              className="p-1.5 md:p-2 hover:bg-muted rounded transition-colors"
                            >
                              <Plus className="w-4 md:w-5 h-4 md:h-5 text-blue-600" />
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

  // Desktop or no carousel mode - REMOVED: Now we always use carousel when there are multiple addresses
  if (allAddresses.length <= 1) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogContent ref={modalContentRef} hideClose className="max-w-2xl w-[95vw] sm:w-full h-[90vh] sm:h-[80vh] overflow-hidden p-0 max-h-[90vh] rounded-xl">
            <DialogHeader className="relative px-4 sm:px-6 py-4 border-b flex-shrink-0">
              <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
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
            <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSameStatusUpdate}
              className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            >
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Kein Interesse Grund-Dialog */}
        <AlertDialog open={keinInteresseDialogOpen} onOpenChange={setKeinInteresseDialogOpen}>
          <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Kein Interesse - Grund angeben</AlertDialogTitle>
              <AlertDialogDescription>
                Bitte wähle einen Grund aus:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <Select value={keinInteresseReason} onValueChange={setKeinInteresseReason}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Grund auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Zu alt">Zu alt</SelectItem>
                  <SelectItem value="Kein Besuch mehr erwünscht">Kein Besuch mehr erwünscht</SelectItem>
                  <SelectItem value="Ziehen bald weg">Ziehen bald weg</SelectItem>
                  <SelectItem value="Anderer Grund">Anderer Grund</SelectItem>
                </SelectContent>
              </Select>
              {keinInteresseReason === "Anderer Grund" && (
                <Textarea
                  placeholder="Grund eingeben..."
                  value={keinInteresseCustomText}
                  onChange={(e) => setKeinInteresseCustomText(e.target.value)}
                  className="min-h-[80px] resize-none border-border focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              )}
            </div>
            <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
              <AlertDialogCancel 
                className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0"
                onClick={() => { setKeinInteresseReason(""); setKeinInteresseCustomText(""); }}
              >
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmKeinInteresse}
                disabled={!keinInteresseReason || (keinInteresseReason === "Anderer Grund" && !keinInteresseCustomText.trim())}
                className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bestätigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Potenzial Bewertung */}
        <AlertDialog open={potenzialDialogOpen} onOpenChange={setPotenzialDialogOpen}>
          <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Potenzial bewerten</AlertDialogTitle>
              <AlertDialogDescription>
                Wie schätzt du das Potenzial ein?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-center gap-2 py-6">
              {[1,2,3,4,5].map((star) => (
                <button key={star} type="button" onClick={() => setPotenzialRating(star)} onMouseEnter={() => setPotenzialHoverRating(star)} onMouseLeave={() => setPotenzialHoverRating(0)} className="transition-transform hover:scale-110">
                  <Star className={cn("w-12 h-12 transition-colors", (potenzialHoverRating >= star || (potenzialHoverRating === 0 && potenzialRating >= star)) ? "fill-yellow-400 text-yellow-400" : "fill-none text-gray-300")} />
                </button>
              ))}
            </div>
            {potenzialRating > 0 && (
              <p className="text-center text-sm text-muted-foreground">Bewertung: {potenzialRating} von 5 Sternen</p>
            )}
            <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
              <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0" onClick={() => { setPotenzialRating(0); setPotenzialHoverRating(0); }}>
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmPotenzialRating} disabled={potenzialRating === 0} className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white disabled:opacity-50 disabled:cursor-not-allowed">
                Bestätigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Carousel mode - Always enabled when multiple addresses exist
  // On mobile, use swipe deck; on desktop, use embla carousel
  if (isMobile) {
    // Mobile: Use ModalSwipeDeck for Tinder-style swiping
    const renderCompleteCard = (addr: Address, index: number, total: number) => {
      const addrUnits = addr.filteredUnits || addr.units || [];
      const addrUnitCount = addrUnits.length;
      
      return (
        <div className="flex flex-col h-full">
          {/* Card Header */}
          <div className="relative px-4 py-4 border-b flex-shrink-0 bg-background">
            <DialogClose 
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-50"
              onClick={() => handleDialogChange(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
            <div className="text-lg font-semibold">
              {addr.street} {addr.houseNumber}
            </div>
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
          </div>

          {/* Card Content */}
          <div className="flex-1 overflow-y-auto touch-pan-y overscroll-contain">
            {renderAddressContent(addr)}
          </div>
        </div>
      );
    };

    return (
      <>
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogContent 
            ref={modalContentRef}
            hideClose 
            className="p-0 overflow-visible bg-transparent border-0 shadow-none w-full h-[85vh]"
          >
            <HorizontalModalPager
              items={allAddresses}
              startIndex={initialIndex}
              renderCard={renderCompleteCard}
              onIndexChange={(idx) => {
                setCurrentIndex(idx);
              }}
            />
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
              <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0">
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmSameStatusUpdate}
                className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
              >
                Bestätigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Kein Interesse Grund-Dialog (Mobile) */}
        <AlertDialog open={keinInteresseDialogOpen} onOpenChange={setKeinInteresseDialogOpen}>
          <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Kein Interesse - Grund angeben</AlertDialogTitle>
              <AlertDialogDescription>
                Bitte wählen Sie einen Grund aus:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              {["Zu alt", "Kein Besuch mehr erwünscht", "Ziehen bald weg", "Anderer Grund"].map((reason) => (
                <label key={reason} className="flex items-center gap-3 cursor-pointer p-3 border rounded-md hover:bg-muted/50">
                  <input
                    type="radio"
                    name="keinInteresseReason"
                    value={reason}
                    checked={keinInteresseReason === reason}
                    onChange={(e) => setKeinInteresseReason(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{reason}</span>
                </label>
              ))}
              {keinInteresseReason === "Anderer Grund" && (
                <Textarea
                  placeholder="Grund eingeben..."
                  value={keinInteresseCustomText}
                  onChange={(e) => setKeinInteresseCustomText(e.target.value)}
                  className="min-h-[80px] resize-none border-border focus-visible:ring-0 focus-visible:ring-offset-0 mt-3"
                />
              )}
            </div>
            <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
              <AlertDialogCancel 
                className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0"
                onClick={() => { setKeinInteresseReason(""); setKeinInteresseCustomText(""); }}
              >
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmKeinInteresse}
                disabled={!keinInteresseReason || (keinInteresseReason === "Anderer Grund" && !keinInteresseCustomText.trim())}
                className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bestätigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Potenzial Bewertung (Mobile) */}
        <AlertDialog open={potenzialDialogOpen} onOpenChange={setPotenzialDialogOpen}>
          <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Potenzial bewerten</AlertDialogTitle>
              <AlertDialogDescription>
                Wie schätzen Sie das Potenzial ein?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-center gap-2 py-6">
              {[1,2,3,4,5].map((star) => (
                <button key={star} type="button" onClick={() => setPotenzialRating(star)} onMouseEnter={() => setPotenzialHoverRating(star)} onMouseLeave={() => setPotenzialHoverRating(0)} className="transition-transform hover:scale-110">
                  <Star className={cn("w-12 h-12 transition-colors", (potenzialHoverRating >= star || (potenzialHoverRating === 0 && potenzialRating >= star)) ? "fill-yellow-400 text-yellow-400" : "fill-none text-gray-300")} />
                </button>
              ))}
            </div>
            {potenzialRating > 0 && (
              <p className="text-center text-sm text-muted-foreground">Bewertung: {potenzialRating} von 5 Sternen</p>
            )}
            <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
              <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0" onClick={() => { setPotenzialRating(0); setPotenzialHoverRating(0); }}>
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmPotenzialRating} disabled={potenzialRating === 0} className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white disabled:opacity-50 disabled:cursor-not-allowed">
                Bestätigen
              </AlertDialogAction>
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
                variant="outline"
                onClick={() => {
                  setAddNoteDialogOpen(false);
                  setNewNoteText("");
                }}
                className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border-border"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleAddNote}
                className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
              >
                Bestätigen
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={addAppointmentDialogOpen} onOpenChange={setAddAppointmentDialogOpen}>
          <DialogContent className="w-[95vw] max-w-6xl rounded-2xl max-h-[90vh] overflow-y-auto py-4">
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
                          if (date) {
                            setMapDisplayDate(date);
                            setShowAllAppointments(false);
                          }
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
                      <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10000]">
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
                      <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10000]">
                        {[0, 10, 20, 30, 40, 50].map((minute) => (
                          <SelectItem key={minute} value={minute.toString().padStart(2, '0')}>
                            {minute.toString().padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Collapsible>
                  <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors border border-border rounded-md">
                    <span className="text-sm font-medium">Weitere Infos</span>
                    <ChevronDown className="w-4 h-4 transition-transform ui-expanded:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-4">
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
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Right Column - Map (nur Desktop) */}
              <div className="block space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
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
                          setMapDisplayDate(prevDay);
                        }
                      }}
                      className="h-8 w-8 p-0"
                    >
                      ←
                    </Button>
                    <span className="text-sm font-medium min-w-[100px] text-center">
                      {showAllAppointments 
                        ? 'Alle Termine' 
                        : mapDisplayDate?.toLocaleDateString('de-DE')}
                    </span>
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
                      className="h-8 w-8 p-0"
                    >
                      →
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm whitespace-nowrap cursor-pointer flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showAllAppointments}
                        onChange={(e) => {
                          setShowAllAppointments(e.target.checked);
                          if (e.target.checked) {
                            setMapDisplayDate(undefined);
                          } else {
                            setMapDisplayDate(appointmentDate || new Date());
                          }
                        }}
                        className="cursor-pointer"
                      />
                      <span>Alle</span>
                    </label>
                  </div>
                </div>
                
                <AppointmentMap 
                  appointments={appointments}
                  selectedDate={showAllAppointments ? undefined : mapDisplayDate}
                  currentAddress={mapCurrentAddress}
                  selectedAppointmentId={selectedAppointmentId}
                />
              </div>
            </div>
            
            {/* Termine Liste - immer sichtbar (Mobile + Desktop) */}
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-3">
                Deine Termine ({appointments.length})
              </h3>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                {appointments.length > 0 ? (
                  appointments.map((apt) => (
                    <div 
                      key={apt.id} 
                      onClick={() => {
                        if (selectedAppointmentId === apt.id) {
                          setSelectedAppointmentId(null);
                        } else {
                          setSelectedAppointmentId(apt.id);
                        }
                      }}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedAppointmentId === apt.id 
                          ? 'bg-blue-100 border-blue-400 shadow-md' 
                          : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
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

            <div className="flex gap-3 mt-6">
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
                className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border-border"
              >
                Abbrechen
              </Button>
              <Button
                onClick={saveAppointment}
                disabled={!appointmentDate || !appointmentTime}
                className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white disabled:opacity-50"
              >
                Bestätigen
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
              <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0">
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteNote}
                className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
              >
                Bestätigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Desktop: Use Embla Carousel
  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent ref={modalContentRef} hideClose className="box-border w-[92vw] max-w-[92vw] sm:max-w-2xl sm:w-[95vw] h-[85vh] sm:h-[80vh] p-0 overflow-hidden rounded-xl">
          <div className="embla h-full w-full overflow-hidden" ref={emblaRef}>
            <div className="embla__container h-full">
              {allAddresses.map((addr, index) => {
                const addrUnits = addr.filteredUnits || addr.units || [];
                const addrUnitCount = addrUnits.length;
                
                return (
                  <div 
                    key={addr.id} 
                    className="embla__slide flex-shrink-0 flex-grow-0 basis-full h-full"
                  >
                       <DialogHeader className="relative px-4 py-4 border-b flex-shrink-0 bg-background">
                        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                          <X className="h-4 w-4" />
                          <span className="sr-only">Close</span>
                        </DialogClose>
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

                      {renderAddressContent(addr)}
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
            <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSameStatusUpdate}
              className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            >
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={keinInteresseDialogOpen} onOpenChange={setKeinInteresseDialogOpen}>
        <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Kein Interesse - Grund angeben</AlertDialogTitle>
            <AlertDialogDescription>
              Bitte wählen Sie einen Grund aus:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            {["Zu alt", "Kein Besuch mehr erwünscht", "Ziehen bald weg", "Anderer Grund"].map((reason) => (
              <label key={reason} className="flex items-center gap-3 cursor-pointer p-3 border rounded-md hover:bg-muted/50">
                <input
                  type="radio"
                  name="keinInteresseReason"
                  value={reason}
                  checked={keinInteresseReason === reason}
                  onChange={(e) => setKeinInteresseReason(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{reason}</span>
              </label>
            ))}
            
            {keinInteresseReason === "Anderer Grund" && (
              <Textarea
                placeholder="Grund eingeben..."
                value={keinInteresseCustomText}
                onChange={(e) => setKeinInteresseCustomText(e.target.value)}
                className="min-h-[80px] resize-none border-border focus-visible:ring-0 focus-visible:ring-offset-0 mt-3"
              />
            )}
          </div>
          <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
            <AlertDialogCancel 
              className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0"
              onClick={() => {
                setKeinInteresseReason("");
                setKeinInteresseCustomText("");
              }}
            >
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmKeinInteresse}
              disabled={!keinInteresseReason || (keinInteresseReason === "Anderer Grund" && !keinInteresseCustomText.trim())}
              className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={potenzialDialogOpen} onOpenChange={setPotenzialDialogOpen}>
        <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Potenzial bewerten</AlertDialogTitle>
            <AlertDialogDescription>
              Wie schätzen Sie das Potenzial ein?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center gap-2 py-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setPotenzialRating(star)}
                onMouseEnter={() => setPotenzialHoverRating(star)}
                onMouseLeave={() => setPotenzialHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "w-12 h-12 transition-colors",
                    (potenzialHoverRating >= star || (potenzialHoverRating === 0 && potenzialRating >= star))
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-none text-gray-300"
                  )}
                />
              </button>
            ))}
          </div>
          {potenzialRating > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Bewertung: {potenzialRating} von 5 Sternen
            </p>
          )}
          <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
            <AlertDialogCancel 
              className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0"
              onClick={() => {
                setPotenzialRating(0);
                setPotenzialHoverRating(0);
              }}
            >
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmPotenzialRating}
              disabled={potenzialRating === 0}
              className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Bestätigen
            </AlertDialogAction>
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
              variant="outline"
              onClick={() => {
                setAddNoteDialogOpen(false);
                setNewNoteText("");
              }}
              className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border-border"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAddNote}
              className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            >
              Bestätigen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addAppointmentDialogOpen} onOpenChange={setAddAppointmentDialogOpen}>
        <DialogContent className="w-[95vw] max-w-6xl rounded-2xl max-h-[90vh] overflow-y-auto py-4">
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
                        // Update map to show selected date
                        if (date) {
                          setMapDisplayDate(date);
                          setShowAllAppointments(false);
                        }
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
                     <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10000]">
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
                    <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10000]">
                      {[0, 10, 20, 30, 40, 50].map((minute) => (
                        <SelectItem key={minute} value={minute.toString().padStart(2, '0')}>
                          {minute.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Collapsible>
                <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors border border-border rounded-md">
                  <span className="text-sm font-medium">Weitere Infos</span>
                  <ChevronDown className="w-4 h-4 transition-transform ui-expanded:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-4">
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
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Right Column - Map and Appointments */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="text-sm font-medium whitespace-nowrap">
                      {showAllAppointments ? (
                        "Alle"
                      ) : mapDisplayDate ? (
                        mapDisplayDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      ) : (
                        "Heute"
                      )}
                    </div>
                    
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
                      className="h-8 w-8 p-0"
                    >
                      ←
                    </Button>
                    
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
                      className="h-8 w-8 p-0"
                    >
                      →
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm whitespace-nowrap cursor-pointer flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showAllAppointments}
                        onChange={(e) => {
                          setShowAllAppointments(e.target.checked);
                          if (e.target.checked) {
                            setMapDisplayDate(undefined);
                          } else {
                            setMapDisplayDate(appointmentDate || new Date());
                          }
                        }}
                        className="cursor-pointer"
                      />
                      <span>Alle</span>
                    </label>
                  </div>
                </div>
                
                <AppointmentMap 
                  appointments={appointments}
                  selectedDate={showAllAppointments ? undefined : mapDisplayDate}
                  currentAddress={mapCurrentAddress}
                  selectedAppointmentId={selectedAppointmentId}
                />
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-3">
                  Deine Termine ({appointments.length})
                </h3>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {appointments.length > 0 ? (
                    appointments.map((apt) => (
                      <div 
                        key={apt.id} 
                        onClick={() => {
                          if (selectedAppointmentId === apt.id) {
                            setSelectedAppointmentId(null);
                          } else {
                            setSelectedAppointmentId(apt.id);
                          }
                        }}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                          selectedAppointmentId === apt.id 
                            ? 'bg-blue-100 border-blue-400 shadow-md' 
                            : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
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

          <div className="flex gap-3 mt-6">
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
              className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border-border"
            >
              Abbrechen
            </Button>
            <Button
              onClick={saveAppointment}
              disabled={!appointmentDate || !appointmentTime}
              className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white disabled:opacity-50"
            >
              Bestätigen
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
            <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteNote}
              className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            >
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
