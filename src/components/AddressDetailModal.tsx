import { useState, useEffect, useCallback, useRef, useLayoutEffect, forwardRef, useMemo } from "react";
import { X, Plus, RotateCcw, FileText, Info, Clock, ChevronDown, ChevronLeft, ChevronRight, Check, Calendar as CalendarIcon, Star, Trash2 } from "lucide-react";
import useEmblaCarousel from 'embla-carousel-react';
import { useIsMobile } from "@/hooks/use-mobile";
import { AppointmentMap } from "./AppointmentMap";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SelectPrimitive from "@radix-ui/react-select";
import HorizontalModalPager from "./modal/HorizontalModalPager";
import confetti from 'canvas-confetti';
import { supabase } from "@/integrations/supabase/client";
import { orderFormSchema, noteSchema, customerNameSchema } from "@/utils/validation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
  DialogFooter,
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
  AlertDialogPortal,
  AlertDialogOverlay,
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
  coordinates?: [number, number];
  units?: { 
    id: number; 
    floor: string; 
    position: string; 
    status: string;
    marketable?: boolean;
    addedBy?: string; 
    addedAt?: string;
    deleted?: boolean;
    deletedBy?: string;
    deletedAt?: string;
  }[];
  filteredUnits?: { 
    id: number; 
    floor: string; 
    position: string; 
    status: string;
    marketable?: boolean;
    addedBy?: string; 
    addedAt?: string;
    deleted?: boolean;
    deletedBy?: string;
    deletedAt?: string;
  }[];
}

interface AddressDetailModalProps {
  address: Address;
  allAddresses?: Address[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: (finalIndex: number) => void;
  onOrderCreated?: () => void;
  onUpdateUnitStatus?: (addressId: number, unitId: number, newStatus: string) => void;
}

export const AddressDetailModal = ({ address, allAddresses = [], initialIndex = 0, open, onOpenChange, onClose, onOrderCreated, onUpdateUnitStatus }: AddressDetailModalProps) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  // Get authenticated user context
  const [currentUser, setCurrentUser] = useState<{id: string, name: string} | null>(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle();
        setCurrentUser({ 
          id: user.id, 
          name: profile?.name || user.email?.split('@')[0] || 'Unbekannt'
        });
      }
    };
    if (open) fetchUser();
  }, [open]);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    skipSnaps: false,
    startIndex: initialIndex,
    align: 'center',
  });
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Ensure currentAddress always has a valid value
  const currentAddress = useMemo(() => {
    if (allAddresses.length > 0) {
      // Make sure currentIndex is within bounds
      const validIndex = Math.max(0, Math.min(currentIndex, allAddresses.length - 1));
      return allAddresses[validIndex];
    }
    return address;
  }, [allAddresses, currentIndex, address]);
  
  // Handle dialog close and notify parent with final index
  const handleDialogChange = (open: boolean) => {
    if (!open && onClose) {
      onClose(currentIndex);
    }
    onOpenChange(open);
  };
  
  // Use filteredUnits if available (from status filter), otherwise use all units
  // ALWAYS filter out deleted units
  const allUnits = currentAddress?.filteredUnits || currentAddress?.units || [];
  const displayUnits = allUnits.filter(unit => !unit.deleted);
  const wohneinheiten = displayUnits.length;
  
  // Anzahl der aktuell sichtbaren (gefilterten & nicht gelöschten) Einheiten ermitteln
  const visibleUnitsCount = useMemo(() => {
    const base = currentAddress?.filteredUnits ?? currentAddress?.units ?? [];
    return base.filter(u => !u.deleted).length;
  }, [currentAddress?.filteredUnits, currentAddress?.units]);
  
  // Scroll zurücksetzen nur wenn aktiv gefiltert wird oder Adresse wechselt
  useEffect(() => {
    const el = scrollContainerRefs.current[currentAddress?.id ?? -1];
    if (!el) return;
    
    // Reset nur wenn filteredUnits aktiv ist (also Filter angewendet)
    const isFiltered = currentAddress?.filteredUnits !== undefined;
    if (isFiltered || !open) {
      el.scrollTop = 0;
    }
  }, [currentAddress?.id, currentAddress?.filteredUnits, open]);
  
  // State for each unit's current status
  const [unitStatuses, setUnitStatuses] = useState<Record<string, string>>({});
  const [statusHistories, setStatusHistories] = useState<Record<string, Array<{id: number, status: string, changedBy: string, changedAt: string}>>>({});
  const [lastUpdated, setLastUpdated] = useState<Record<string, string>>({});
  const [notesOpen, setNotesOpen] = useState<Record<number, boolean>>({});
  const [appointmentsOpen, setAppointmentsOpen] = useState<Record<number, boolean>>({});
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
  
  // Add Units Dialog States
  const [addUnitsDialogOpen, setAddUnitsDialogOpen] = useState(false);
  const [addUnitsCount, setAddUnitsCount] = useState<number>(1);
  const [pendingAddressId, setPendingAddressId] = useState<number | null>(null);
  
  // Delete Unit Dialog States
  const [deleteUnitDialogOpen, setDeleteUnitDialogOpen] = useState(false);
  const [pendingDeleteUnit, setPendingDeleteUnit] = useState<{addressId: number, unitId: number} | null>(null);
  
  // Order Creation Dialog States
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderUnitId, setOrderUnitId] = useState<number | null>(null);
  const [orderAddressId, setOrderAddressId] = useState<number | null>(null);
  const [orderForm, setOrderForm] = useState({
    vorname: '',
    nachname: '',
    tarif: '',
    zusaetze: [] as string[]
  });
  
  const [addAppointmentDialogOpen, setAddAppointmentDialogOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);
  const [mapDisplayDate, setMapDisplayDate] = useState<Date | undefined>(undefined);
  const [showAllAppointments, setShowAllAppointments] = useState(true);
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentHour, setAppointmentHour] = useState("");
  const [appointmentMinute, setAppointmentMinute] = useState("");
  const [appointmentDuration, setAppointmentDuration] = useState("");
  const [appointmentCustomer, setAppointmentCustomer] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [pendingAppointmentUnitId, setPendingAppointmentUnitId] = useState<number | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [appointments, setAppointments] = useState<Array<{id: number, unitId: number, date: string, time: string, customer: string, notes: string, address: string, coordinates: [number, number]}>>([
    // Dummy-Termine in Köln-Heumar, Am Alten Turm
    {
      id: 1,
      unitId: 1,
      date: new Date().toLocaleDateString('de-DE'),
      time: "10:00",
      customer: "Max Mustermann",
      notes: "Erstbesichtigung",
      address: "Am Alten Turm 1, 51107 Köln",
      coordinates: [7.0810, 50.9206]
    },
    {
      id: 2,
      unitId: 2,
      date: new Date().toLocaleDateString('de-DE'),
      time: "14:30",
      customer: "Anna Schmidt",
      notes: "Nachbesprechung",
      address: "Am Alten Turm 2, 51107 Köln",
      coordinates: [7.0812, 50.9206]
    },
    {
      id: 3,
      unitId: 3,
      date: new Date(Date.now() + 86400000).toLocaleDateString('de-DE'), // Tomorrow
      time: "09:00",
      customer: "Peter Müller",
      notes: "",
      address: "Am Alten Turm 4, 51107 Köln",
      coordinates: [7.0814, 50.9207]
    },
    {
      id: 4,
      unitId: 4,
      date: new Date(Date.now() + 86400000).toLocaleDateString('de-DE'), // Tomorrow
      time: "16:00",
      customer: "Lisa Weber",
      notes: "Vertragsübergabe",
      address: "Am Alten Turm 5, 51107 Köln",
      coordinates: [7.0815, 50.9207]
    }
  ]);
  const [notes, setNotes] = useState<Array<{id: number, author: string, timestamp: string, content: string, permanent?: boolean}>>([]);
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const unitCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Helper to set scroll ref per address
  const setScrollRef = (addrId: number) => (el: HTMLDivElement | null) => {
    scrollContainerRefs.current[addrId] = el;
  };

  // Memoize current address for map to prevent unnecessary re-renders
  const mapCurrentAddress = useMemo(() => ({
    street: currentAddress?.street || '',
    houseNumber: currentAddress?.houseNumber || '',
    postalCode: currentAddress?.postalCode || '',
    city: currentAddress?.city || '',
    coordinates: currentAddress?.coordinates || [6.9603, 50.9375] as [number, number] // Default to Köln
  }), [currentAddress?.street, currentAddress?.houseNumber, currentAddress?.postalCode, currentAddress?.city, currentAddress?.coordinates]);

  // Filter appointments for display
  const displayedAppointments = useMemo(() => {
    if (showAllAppointments) {
      return appointments;
    }
    if (!mapDisplayDate) {
      return appointments;
    }
    const filterDate = mapDisplayDate.toLocaleDateString('de-DE');
    return appointments.filter(apt => apt.date === filterDate);
  }, [appointments, showAllAppointments, mapDisplayDate]);

  // Map date navigation helpers
  const changeMapDate = useCallback((delta: number) => {
    const base = mapDisplayDate || appointmentDate || new Date();
    const next = new Date(base);
    next.setDate(next.getDate() + delta);
    setMapDisplayDate(next);
    setShowAllAppointments(false);
  }, [mapDisplayDate, appointmentDate]);

  const prevMapDay = useCallback(() => changeMapDate(-1), [changeMapDate]);
  const nextMapDay = useCallback(() => changeMapDate(1), [changeMapDate]);

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
    const allUnits = addr.filteredUnits || addr.units || [];
    const units = allUnits.filter(unit => !unit.deleted);
    const initialTimestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    setUnitStatuses(prev => ({
      ...prev,
      ...units.reduce((acc, unit) => {
        const key = `${addr.id}:${unit.id}`;
        // Normalize status to lowercase
        const normalizedStatus = (unit.status || "offen").toLowerCase();
        return { ...acc, [key]: normalizedStatus };
      }, {})
    }));
    
    setStatusHistories(prev => ({
      ...prev,
      ...units.reduce((acc, unit) => {
        // Normalize status to lowercase
        const status = (unit.status || "offen").toLowerCase();
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
        // Normalize status to lowercase
        const status = (unit.status || "offen").toLowerCase();
        const key = `${addr.id}:${unit.id}`;
        if (status === "offen") {
          return { ...acc, [key]: "" };
        }
        return { ...acc, [key]: initialTimestamp };
      }, {})
    }));
  }, []);
  
  // Prefetch states for current and neighbor addresses (deferred to next frame for snappy open)
  useEffect(() => {
    if (!open || allAddresses.length === 0) return;

    const raf = requestAnimationFrame(() => {
      const indicesToPrefetch = [
        currentIndex - 1,
        currentIndex,
        currentIndex + 1
      ].filter(i => i >= 0 && i < allAddresses.length);
  
      indicesToPrefetch.forEach(idx => {
        initializeAddressStates(allAddresses[idx]);
      });
  
      setPopoverKey(0);
    });

    return () => cancelAnimationFrame(raf);
  }, [open, currentIndex, allAddresses, initializeAddressStates]);
  

  // Disable auto-closing popovers on scroll to ensure 'Historie' opens reliably on mobile
  useEffect(() => {
    // Note: scrollContainerRefs now is a map, no single ref to attach to
    // This effect is now a no-op placeholder
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

  const handleStatusChange = useCallback((addressId: number, unitId: number, newStatus: string) => {
    const k = `${addressId}:${unitId}`;
    
    // Check if unit is marketable
    const targetAddress = allAddresses.length > 0 
      ? allAddresses.find(addr => addr.id === addressId) 
      : (currentAddress?.id === addressId ? currentAddress : null);
    
    const unit = targetAddress?.units?.find(u => u.id === unitId);
    
    // Prevent status change if unit is not marketable
    if (unit && unit.marketable === false) {
      toast({
        title: "⚠️ Nicht vermarktbar",
        description: "Diese Einheit kann nicht bearbeitet werden.",
        className: "bg-red-500 text-white border-0",
        duration: 2000,
      });
      return;
    }
    
    console.log("handleStatusChange called with:", { addressId, unitId, newStatus });
    
    // Wenn "kein-interesse" ausgewählt wird, öffne den Dialog zur Begründung
    if (newStatus === "kein-interesse") {
      console.log("Opening kein-interesse dialog");
      setPendingKeinInteresse({ addressId, unitId });
      setKeinInteresseReason(""); // Clear previous selection
      setKeinInteresseCustomText(""); // Clear previous custom text
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
          changedBy: currentUser?.name || "Unbekannt",
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
  }, [allAddresses, currentAddress, toast, statusOptions, currentUser]);

  const handleSameStatusUpdate = useCallback((addressId: number, unitId: number) => {
    const k = `${addressId}:${unitId}`;
    setPendingStatusUpdate(k);
    setConfirmStatusUpdateOpen(true);
  }, []);

  const confirmSameStatusUpdate = useCallback(() => {
    if (pendingStatusUpdate === null) return;
    
    const currentStatus = unitStatuses[pendingStatusUpdate] || "offen";
    
    // Wenn Status "potenzial" ist, Bewertungs-Dialog öffnen für Neubewertung
    if (currentStatus === "potenzial") {
      const [addressIdStr, unitIdStr] = pendingStatusUpdate.split(':');
      const addressId = parseInt(addressIdStr);
      const unitId = parseInt(unitIdStr);
      
      setConfirmStatusUpdateOpen(false);
      setPendingStatusUpdate(null);
      
      // Bewertungs-Dialog öffnen
      setPendingPotenzial({ addressId, unitId });
      setPotenzialRating(0); // Reset rating
      setPotenzialDialogOpen(true);
      return;
    }
    
    // Normales Status-Update für andere Status
    const statusLabel = statusOptions.find(s => s.value === currentStatus)?.label || currentStatus;
    const timestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    setLastUpdated(prev => ({ ...prev, [pendingStatusUpdate]: timestamp }));
    
    setStatusHistories(prev => ({
      ...prev,
      [pendingStatusUpdate]: [
        {
          id: Date.now(),
          status: statusLabel,
          changedBy: currentUser?.name || "Unbekannt",
          changedAt: timestamp
        },
        ...(prev[pendingStatusUpdate] || [])
      ]
    }));

    toast({
      title: "✓ Status aktualisiert",
      className: "bg-green-400 text-white border-0 w-auto max-w-[250px] p-3 py-2",
      duration: 1000,
    });
    
    setConfirmStatusUpdateOpen(false);
    setPendingStatusUpdate(null);
  }, [pendingStatusUpdate, unitStatuses, statusOptions, currentUser, toast]);

  const handleAddNote = () => {
    // Validate note content
    const validation = noteSchema.safeParse({ content: newNoteText.trim() });
    if (!validation.success) {
      toast({ 
        title: "Validierungsfehler", 
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }
    
    const timestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    const newNote = {
      id: Date.now(),
      author: currentUser?.name || "Unbekannt",
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
  
  const confirmKeinInteresse = useCallback(() => {
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
      author: currentUser?.name || "Unbekannt",
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
          changedBy: currentUser?.name || "Unbekannt",
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
  }, [pendingKeinInteresse, keinInteresseReason, keinInteresseCustomText, currentUser, statusOptions, toast]);
  
  const confirmPotenzialRating = useCallback(() => {
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
          changedBy: currentUser?.name || "Unbekannt",
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
  }, [pendingPotenzial, potenzialRating, currentUser, statusOptions, toast]);

  const handleAddUnitsClick = (addressId: number) => {
    setPendingAddressId(addressId);
    setAddUnitsCount(1);
    setAddUnitsDialogOpen(true);
  };

  const confirmAddUnits = () => {
    if (pendingAddressId === null || addUnitsCount < 1 || addUnitsCount > 3) return;

    const targetAddress = allAddresses.length > 0 
      ? allAddresses.find(addr => addr.id === pendingAddressId) 
      : (currentAddress?.id === pendingAddressId ? currentAddress : null);
    
    if (!targetAddress) return;
    
    // Initialize units array if it doesn't exist
    if (!targetAddress.units) targetAddress.units = [];

    const timestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    // Create new units with status "offen" - NO floor/position preset, NO notes
    const highestId = Math.max(...(targetAddress.units.length > 0 ? targetAddress.units.map(u => u.id) : [0]), 0);
    const newUnits = Array.from({ length: addUnitsCount }, (_, i) => ({
      id: highestId + i + 1,
      floor: "",
      position: "",
      status: "offen",
      addedBy: currentUser?.name || "Unbekannt",
      addedAt: timestamp
    }));

    // Add units to the address
    targetAddress.units.push(...newUnits);

    // Set status for each new unit - NO history, NO notes
    newUnits.forEach(unit => {
      const k = `${pendingAddressId}:${unit.id}`;
      setUnitStatuses(prev => ({ ...prev, [k]: "offen" }));
      setLastUpdated(prev => ({ ...prev, [k]: timestamp }));
    });

    toast({
      title: `✓ ${addUnitsCount} Wohneinheit${addUnitsCount > 1 ? 'en' : ''} hinzugefügt`,
      className: "bg-green-400 text-white border-0 w-auto max-w-[300px] p-3 py-2",
      duration: 1500,
    });

    // Close dialog and reset
    setAddUnitsDialogOpen(false);
    setPendingAddressId(null);
    setAddUnitsCount(1);
  };

  const handleDeleteUnitClick = (addressId: number, unitId: number) => {
    setPendingDeleteUnit({ addressId, unitId });
    setDeleteUnitDialogOpen(true);
  };

  const confirmDeleteUnit = () => {
    if (!pendingDeleteUnit) return;

    const { addressId, unitId } = pendingDeleteUnit;
    const targetAddress = allAddresses.length > 0 
      ? allAddresses.find(addr => addr.id === addressId) 
      : (currentAddress?.id === addressId ? currentAddress : null);
    
    if (!targetAddress || !targetAddress.units) return;

    const timestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    // Soft delete: Mark as deleted instead of removing
    const unit = targetAddress.units.find(u => u.id === unitId);
    if (unit) {
      unit.deleted = true;
      unit.deletedBy = currentUser?.name || "Unbekannt";
      unit.deletedAt = timestamp;
    }

    toast({
      title: "✓ Wohneinheit gelöscht",
      className: "bg-green-400 text-white border-0 w-auto max-w-[250px] p-3 py-2",
      duration: 1000,
    });

    // Close dialog and reset
    setDeleteUnitDialogOpen(false);
    setPendingDeleteUnit(null);
  };
  
  // Handle opening order dialog
  const handleOpenOrderDialog = (addressId: number, unitId: number) => {
    console.log('handleOpenOrderDialog called', { addressId, unitId });
    setOrderAddressId(addressId);
    setOrderUnitId(unitId);
    setOrderForm({
      vorname: '',
      nachname: '',
      tarif: '',
      zusaetze: []
    });
    console.log('Setting orderDialogOpen to true');
    setOrderDialogOpen(true);
  };

  // Handle order confirmation
  const handleConfirmOrder = () => {
    // Validate order form with zod schema
    const validation = orderFormSchema.safeParse(orderForm);
    if (!validation.success) {
      toast({
        title: "Validierungsfehler",
        description: validation.error.errors[0].message,
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (!orderUnitId || !orderAddressId) {
      toast({
        title: "Fehler",
        description: "Adresse oder Wohneinheit nicht gefunden.",
        className: "bg-red-500 text-white border-0",
        duration: 2000,
      });
      return;
    }

    const targetAddress = allAddresses.find(a => 
      a.units?.some(u => u.id === orderUnitId)
    ) || currentAddress;

    const k = `${orderAddressId}:${orderUnitId}`;
    const timestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const shortTimestamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    // Create order record with address information
    const newOrder = {
      id: Date.now(),
      vorname: orderForm.vorname.trim(),
      nachname: orderForm.nachname.trim(),
      tarif: orderForm.tarif,
      zusaetze: orderForm.zusaetze,
      adresse: `${targetAddress.street} ${targetAddress.houseNumber}, ${targetAddress.postalCode} ${targetAddress.city}`,
      wohneinheit: orderUnitId,
      createdAt: timestamp,
      createdBy: currentUser?.name || "Unbekannt"
    };
    
    console.log("Neuer Auftrag erstellt:", newOrder);
    
    // Update status to Neukunde in parent component
    if (onUpdateUnitStatus) {
      onUpdateUnitStatus(orderAddressId, orderUnitId, "neukunde");
    }
    
    // Update status to Neukunde in local state
    setUnitStatuses(prev => ({
      ...prev,
      [k]: "neukunde"
    }));

    // Update last updated timestamp
    setLastUpdated(prev => ({
      ...prev,
      [k]: timestamp
    }));

    // Add to history
    const statusLabel = statusOptions.find(s => s.value === "neukunde")?.label || "Neukunde";
    const historyEntry = {
      id: Date.now(),
      status: statusLabel,
      changedBy: currentUser?.name || "Unbekannt",
      changedAt: timestamp
    };
    
    setStatusHistories(prev => ({
      ...prev,
      [k]: [
        ...(prev[k] || []),
        historyEntry
      ]
    }));

    // Add note about the order
    const orderNote = {
      id: Date.now() + 1,
      author: currentUser?.name || "Unbekannt",
      timestamp: shortTimestamp,
      content: `Auftrag erstellt:\nTarif: ${orderForm.tarif}${orderForm.zusaetze.length > 0 ? '\nZusätze: ' + orderForm.zusaetze.join(', ') : ''}\nKunde: ${orderForm.vorname.trim()} ${orderForm.nachname.trim()}`,
      permanent: true
    };
    setNotes(prev => [orderNote, ...prev]);

    // Trigger confetti animation
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    toast({
      title: "🎉 Neuer Kunde!",
      className: "bg-green-500 text-white border-0 text-lg font-semibold",
      duration: 3000,
    });

    // Track order creation in user_activities
    const trackOrderCreation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_activities').insert({
            user_id: user.id,
            activity_type: 'order_created',
            metadata: {
              address_id: orderAddressId,
              unit_id: orderUnitId,
              tarif: orderForm.tarif,
              customer: `${orderForm.vorname} ${orderForm.nachname}`
            }
          });
        }
      } catch (error) {
        console.error('Error tracking order:', error);
      }
    };
    trackOrderCreation();

    // Notify parent component about order creation
    onOrderCreated?.();

    setOrderDialogOpen(false);
    setOrderUnitId(null);
    setOrderAddressId(null);
  };

  // Toggle zusatz selection
  const toggleZusatz = (zusatz: string) => {
    setOrderForm(prev => ({
      ...prev,
      zusaetze: prev.zusaetze.includes(zusatz)
        ? prev.zusaetze.filter(z => z !== zusatz)
        : [...prev.zusaetze, zusatz]
    }));
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
      duration: appointmentDuration || "30",
      customer: appointmentCustomer,
      notes: appointmentNotes,
      address: `${currentAddress?.street || ''} ${currentAddress?.houseNumber || ''}, ${currentAddress?.postalCode || ''} ${currentAddress?.city || ''}`,
      coordinates
    };

    setAppointments(prev => [...prev, newAppointment].sort((a, b) => {
      const dateA = new Date(`${a.date.split('.').reverse().join('-')} ${a.time}`);
      const dateB = new Date(`${b.date.split('.').reverse().join('-')} ${b.time}`);
      return dateA.getTime() - dateB.getTime();
    }));
    
    // Set status to "termin"
    handleStatusChange(currentAddress?.id, pendingAppointmentUnitId, "termin");

    // Reset form
    setAppointmentDate(undefined);
    setAppointmentTime("");
    setAppointmentHour("");
    setAppointmentMinute("");
    setAppointmentDuration("");
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
    const allUnits = addr.filteredUnits || addr.units || [];
    const units = allUnits.filter(unit => !unit.deleted);
    const unitCount = units.length;
    
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden touch-pan-y">
        {/* Single scrollable container */}
        <div 
          ref={setScrollRef(addr.id)} 
          className={`flex-1 min-h-0 w-full max-w-full overflow-y-auto overflow-x-hidden px-3 sm:px-6 pt-4 pb-6 touch-pan-y overscroll-contain ${unitCount > 1 ? 'space-y-4 sm:space-y-6' : ''}`} 
          style={{ WebkitOverflowScrolling: 'touch' }}
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {/* Unit Cards */}
          <div className={`${unitCount === 1 ? '' : 'space-y-4'} w-full`}>
            {units.length > 0 ? (
              units.map((unit, index) => {
                const isNotMarketable = unit.marketable === false;
                
                return (
                <div key={unit.id} className="space-y-2 w-full">
                  {/* Trennlinie zwischen Wohneinheiten (nicht vor der ersten) */}
                  {unitCount > 1 && index > 0 && (
                    <div className="border-t border-muted-foreground/20 mt-1 mb-6" />
                  )}
                  {/* Wohneinheit Heading - nur bei mehreren Einheiten */}
                  {unitCount > 1 && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-base">
                          Wohneinheit {index + 1}
                          {isNotMarketable && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Nicht vermarktbar
                            </Badge>
                          )}
                        </h3>
                        {unit.addedBy && unit.addedAt && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteUnitClick(addr.id, unit.id)}
                            disabled={isNotMarketable}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {unit.addedBy && unit.addedAt && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Hinzugefügt: {unit.addedBy}, {unit.addedAt}
                        </div>
                      )}
                    </div>
                  )}
                {/* Gray Container for Fields - Green background if Neukunde, Red if Kein Interesse */}
                    <div className={`rounded-lg p-3 sm:p-4 w-full box-border max-w-full ${
                      isNotMarketable 
                        ? "bg-gray-100 dark:bg-gray-900/50"
                        : unitStatuses[`${addr.id}:${unit.id}`] === "neukunde" 
                          ? "bg-green-100 dark:bg-green-950/30" 
                          : unitStatuses[`${addr.id}:${unit.id}`] === "kein-interesse"
                          ? "bg-red-100 dark:bg-red-950/30"
                          : "bg-muted/70"
                    }`}>
                    
                    {/* Desktop: 2-column layout with divider, Mobile: single column */}
                    <div className="flex flex-col md:grid md:grid-cols-[1fr,1px,1fr] md:gap-4">
                      {/* Left: Controls */}
                      <div className="space-y-3">
                        {unitCount > 1 && !isNotMarketable ? (
                          <div className="flex gap-3 min-w-0">
                            <div className="flex-[4] min-w-0">
                              <Select defaultValue={unit.floor || undefined} disabled={isNotMarketable}>
                                <SelectTrigger className="w-full max-w-full min-w-0 h-9 sm:h-10 border border-border rounded-md shadow-none bg-background focus:ring-0 focus:outline-none">
                                  <SelectValue placeholder="Stockwerk" />
                                </SelectTrigger>
                                <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10000]">
                                  <SelectItem value="EG">EG</SelectItem>
                                  <SelectItem value="1. OG">1. OG</SelectItem>
                                  <SelectItem value="2. OG">2. OG</SelectItem>
                                  <SelectItem value="3. OG">3. OG</SelectItem>
                                  <SelectItem value="4. OG">4. OG</SelectItem>
                                  <SelectItem value="5. OG">5. OG</SelectItem>
                                  <SelectItem value="6. OG">6. OG</SelectItem>
                                  <SelectItem value="7. OG">7. OG</SelectItem>
                                  <SelectItem value="8. OG">8. OG</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex-[2] min-w-0">
                              <Select defaultValue={unit.position || undefined} disabled={isNotMarketable}>
                                <SelectTrigger className="w-full max-w-full min-w-0 h-9 sm:h-10 border border-border rounded-md shadow-none bg-background focus:ring-0 focus:outline-none pr-2">
                                  <SelectValue placeholder="Lage" />
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
                            <div className="flex-[4] min-w-0">
                              <Select 
                                value={unitStatuses[`${addr.id}:${unit.id}`] || "offen"}
                                onValueChange={(value) => handleStatusChange(addr.id, unit.id, value)}
                                disabled={unitStatuses[`${addr.id}:${unit.id}`] === "neukunde" || isNotMarketable}
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
                                {!isNotMarketable && (
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
                                )}
                              </Select>
                            </div>

                            <div className="flex-[2] min-w-0">
                              <Popover key={`popover-${unit.id}-${popoverKey}`}>
                                <PopoverTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    className="w-full h-9 sm:h-10 border border-border rounded-md shadow-none bg-background text-sm font-normal relative pl-3 pr-6"
                                    disabled={isNotMarketable}
                                  >
                                    <span>Historie</span>
                                    <ChevronDown className="h-4 w-4 opacity-50 absolute right-2 top-1/2 -translate-y-1/2" />
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
                                    className="w-64 p-0 z-[10130] overflow-hidden rounded-md border bg-popover shadow-xl"
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
                                              const baseStatus = history.status.split('(')[0].trim();
                                              const statusOption = statusOptions.find(s => s.label === baseStatus);
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

                        {/* Auftrag Button - Only show on desktop if not Neukunde and marketable */}
                        {unitStatuses[`${addr.id}:${unit.id}`] !== "neukunde" && !isNotMarketable && (
                          <Button 
                            onClick={() => handleOpenOrderDialog(addr.id, unit.id)}
                            className="hidden md:flex w-full bg-black hover:bg-gray-800 text-white text-sm rounded-md"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Auftrag
                          </Button>
                        )}
                      </div>
                      
                      {/* Vertical Divider (Desktop only) */}
                      <div className="hidden md:block bg-border"></div>
                      
                      {/* Right: Notizen & Termine (Desktop only) */}
                      <div className="hidden md:flex md:flex-col md:space-y-3">
                        {/* Notizen Collapsible */}
                        <Collapsible open={notesOpen[unit.id] || false} onOpenChange={(open) => setNotesOpen(prev => ({ ...prev, [unit.id]: open }))}>
                          <CollapsibleTrigger className="w-full flex items-center justify-between p-2 hover:bg-background/50 transition-colors border border-border rounded-md bg-background">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Notizen</span>
                              {notes.length > 0 && (
                                <span className="text-xs text-muted-foreground">({notes.length})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddNoteDialogOpen(true);
                                }}
                                className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
                              >
                                <Plus className="w-4 h-4 text-blue-600" />
                              </div>
                              <ChevronDown className={`w-4 h-4 transition-transform ${notesOpen[unit.id] ? 'rotate-180' : ''}`} />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            {notes.length > 0 ? (
                              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                {notes.map((note) => (
                                  <div key={note.id} className="p-2 rounded-lg bg-background text-xs relative pr-7 border">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <span className="font-medium text-xs">{note.author}</span>
                                      {!note.permanent && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 -mt-1 -mr-1 text-destructive hover:text-destructive hover:bg-destructive/10 absolute top-1 right-1"
                                          onClick={() => {
                                            setPendingDeleteNoteId(note.id);
                                            setDeleteNoteDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mb-1">{note.timestamp}</div>
                                    <div className="whitespace-pre-wrap text-xs">{note.content}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground text-center py-3">
                                Noch keine Notizen vorhanden
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Termine Collapsible */}
                        <Collapsible 
                          open={appointmentsOpen[unit.id] || false} 
                          onOpenChange={(open) => setAppointmentsOpen(prev => ({ ...prev, [unit.id]: open }))}
                        >
                          <CollapsibleTrigger className="w-full flex items-center justify-between p-2 hover:bg-background/50 transition-colors border border-border rounded-md bg-background">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Termine</span>
                              {appointments.filter(apt => apt.unitId === unit.id).length > 0 && (
                                <span className="text-xs text-muted-foreground">({appointments.filter(apt => apt.unitId === unit.id).length})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddAppointment(unit.id);
                                }}
                                className={`p-1 hover:bg-muted rounded transition-colors ${isNotMarketable ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                <Plus className={`w-4 h-4 ${isNotMarketable ? 'text-gray-400' : 'text-blue-600'}`} />
                              </div>
                              <ChevronDown className={`w-4 h-4 transition-transform ${appointmentsOpen[unit.id] ? 'rotate-180' : ''}`} />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            {appointments.filter(apt => apt.unitId === unit.id).length > 0 ? (
                              <div className="space-y-2">
                                {appointments.filter(apt => apt.unitId === unit.id).map((appointment) => (
                                  <div key={appointment.id} className="rounded-lg p-2 border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                                    <div className="flex items-start gap-2">
                                      <CalendarIcon className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-xs">{appointment.date} - {appointment.time}</div>
                                        {appointment.customer && (
                                          <div className="text-xs text-muted-foreground">Kunde: {appointment.customer}</div>
                                        )}
                                        {appointment.notes && (
                                          <div className="text-[10px] text-muted-foreground mt-1">{appointment.notes}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground text-center py-3">
                                Keine Termine vorhanden
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </div>
                    
                    {/* Mobile: Notizen & Termine Collapsibles */}
                    <div className="md:hidden mt-3 space-y-3">
                      {/* Notizen Collapsible */}
                      <Collapsible open={notesOpen[unit.id] || false} onOpenChange={(open) => setNotesOpen(prev => ({ ...prev, [unit.id]: open }))}>
                        <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors border border-border rounded-md">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm leading-6 min-w-[60px]">Notizen</span>
                            <div className="w-5 h-5 bg-muted-foreground/20 text-foreground rounded-full flex items-center justify-center text-xs font-medium">
                              {notes.length}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddNoteDialogOpen(true);
                              }}
                              className="p-1.5 md:p-2 hover:bg-muted rounded transition-colors cursor-pointer"
                            >
                              <Plus className="w-4 md:w-5 h-4 md:h-5 text-blue-600" />
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${notesOpen[unit.id] ? 'rotate-180' : ''}`} />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-b border-gray-200">
                          <div className="p-3 space-y-2">
                            {notes.length > 0 ? (
                              notes.map((note) => (
                                <div key={note.id} className="bg-muted/30 rounded-lg p-3 relative border">
                                  <button 
                                    onClick={() => {
                                      setPendingDeleteNoteId(note.id);
                                      setDeleteNoteDialogOpen(true);
                                    }}
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

                      {/* Termine Collapsible */}
                      <Collapsible open={appointmentsOpen[unit.id] || false} onOpenChange={(open) => setAppointmentsOpen(prev => ({ ...prev, [unit.id]: open }))}>
                        <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors border border-border rounded-md">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm leading-6 min-w-[60px]">Termine</span>
                            <div className="w-5 h-5 bg-muted-foreground/20 text-foreground rounded-full flex items-center justify-center text-xs font-medium">
                              {appointments.filter(apt => apt.unitId === unit.id).length}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddAppointment(unit.id);
                              }}
                              className={`p-1.5 md:p-2 hover:bg-muted rounded transition-colors ${isNotMarketable ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <Plus className={`w-4 md:w-5 h-4 md:h-5 ${isNotMarketable ? 'text-gray-400' : 'text-blue-600'}`} />
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${appointmentsOpen[unit.id] ? 'rotate-180' : ''}`} />
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
                      
                      {/* Auftrag Button - Mobile only, show if not Neukunde and marketable */}
                      {unitStatuses[`${addr.id}:${unit.id}`] !== "neukunde" && !isNotMarketable && (
                        <Button 
                          onClick={() => handleOpenOrderDialog(addr.id, unit.id)}
                          className="w-full bg-black hover:bg-gray-800 text-white text-sm rounded-md h-11"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Auftrag
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
              })
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground">
                Keine Wohneinheiten vorhanden
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Guard: If no address is available, don't render
  if (!currentAddress) {
    return null;
  }

  // Desktop or no carousel mode - REMOVED: Now we always use carousel when there are multiple addresses
  if (allAddresses.length <= 1) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogContent ref={modalContentRef} hideClose className="max-w-2xl w-[95vw] sm:w-full h-[90vh] sm:h-[80vh] overflow-hidden p-0 max-h-[90vh] rounded-xl z-[10060] flex flex-col min-h-0">
            <DialogHeader className="relative px-4 sm:px-6 py-4 border-b flex-shrink-0">
              <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                {currentAddress?.street || ''} {currentAddress?.houseNumber || ''}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {currentAddress?.postalCode || ''} {currentAddress?.city || ''}
              </p>
              
              <div className="flex items-center justify-between w-full pt-4 sm:pt-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-medium">Wohneinheiten</span>
                  <div className="w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-bold">
                    {wohneinheiten}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-blue-600 text-xs sm:text-sm gap-1 border-0"
                  onClick={() => {
                    if (currentAddress?.id) {
                      handleAddUnitsClick(currentAddress.id);
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Hinzufügen
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0">
              {renderAddressContent(currentAddress)}
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

        {/* Add Units Dialog */}
        <AlertDialog open={addUnitsDialogOpen} onOpenChange={setAddUnitsDialogOpen}>
          <AlertDialogPortal>
            <AlertDialogOverlay className="fixed inset-0 z-[10090] bg-black/60" onClick={() => setAddUnitsDialogOpen(false)} />
            <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl z-[10100]">
              <button
                onClick={() => setAddUnitsDialogOpen(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Schließen</span>
              </button>
              <AlertDialogHeader>
                <AlertDialogTitle>Wohneinheit hinzufügen</AlertDialogTitle>
                <AlertDialogDescription>
                  Wie viele Wohneinheiten möchtest du hinzufügen? (max. 3 pro Aktion)
                </AlertDialogDescription>
              </AlertDialogHeader>
            <div className="py-4">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setAddUnitsCount(Math.max(1, addUnitsCount - 1))}
                  disabled={addUnitsCount <= 1}
                  className="h-10 w-10 rounded-full"
                >
                  -
                </Button>
                <div className="w-20 text-center">
                  <Input
                    type="number"
                    min="1"
                    max="3"
                    value={addUnitsCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setAddUnitsCount(Math.min(3, Math.max(1, val)));
                    }}
                    className="text-center text-xl font-semibold h-12"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setAddUnitsCount(Math.min(3, addUnitsCount + 1))}
                  disabled={addUnitsCount >= 3}
                  className="h-10 w-10 rounded-full"
                >
                  +
                </Button>
              </div>
            </div>
            <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
              <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0">
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmAddUnits}
                className="flex-1 bg-gradient-to-b from-[#60C0E8] to-[#0EA5E9] hover:from-[#4FB0D8] hover:to-[#0284C7] text-white shadow-[0_2px_8px_rgba(14,165,233,0.3)] rounded-lg font-medium"
              >
                Hinzufügen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
          </AlertDialogPortal>
        </AlertDialog>

        {/* Delete Unit Dialog */}
        <AlertDialog open={deleteUnitDialogOpen} onOpenChange={setDeleteUnitDialogOpen}>
          <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Wohneinheit löschen</AlertDialogTitle>
              <AlertDialogDescription>
                Diese Wohneinheit löschen?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
              <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0">
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUnit}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Order Creation Dialog (Single Address) */}
        {orderDialogOpen && (
          <div className="fixed inset-0 bg-black/60 z-[10090]" onClick={() => setOrderDialogOpen(false)} />
        )}
        <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
          <DialogContent className="w-[90vw] max-w-md rounded-2xl z-[10100]" hideOverlay onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Auftrag anlegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Vorname *</label>
                <input
                  type="text"
                  value={orderForm.vorname}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, vorname: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:border-primary"
                  placeholder="Vorname eingeben"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nachname *</label>
                <input
                  type="text"
                  value={orderForm.nachname}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, nachname: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:border-primary"
                  placeholder="Nachname eingeben"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tarif *</label>
                <Select value={orderForm.tarif} onValueChange={(value) => setOrderForm(prev => ({ ...prev, tarif: value }))}>
                  <SelectTrigger className="w-full px-3 py-2 border border-border rounded-md bg-background">
                    <SelectValue placeholder="Tarif auswählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-[10000]">
                    <SelectItem value="100/20 Mbit/s" className="text-blue-600 dark:text-blue-400 font-medium">100/20 Mbit/s</SelectItem>
                    <SelectItem value="300/60 Mbit/s" className="text-green-600 dark:text-green-400 font-medium">300/60 Mbit/s</SelectItem>
                    <SelectItem value="500/100 Mbit/s" className="text-purple-600 dark:text-purple-400 font-medium">500/100 Mbit/s</SelectItem>
                    <SelectItem value="1000/250 Mbit/s" className="text-orange-600 dark:text-orange-400 font-medium">1000/250 Mbit/s</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Zusätze</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={orderForm.zusaetze.includes('NC TV')}
                      onChange={() => toggleZusatz('NC TV')}
                      className="w-4 h-4 rounded border-border text-primary mr-2"
                    />
                    <span className="text-sm">NC TV</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={orderForm.zusaetze.includes('NC Router')}
                      onChange={() => toggleZusatz('NC Router')}
                      className="w-4 h-4 rounded border-border text-primary mr-2"
                    />
                    <span className="text-sm">NC Router</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setOrderDialogOpen(false);
                  setOrderUnitId(null);
                  setOrderAddressId(null);
                }}
                className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border-border"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleConfirmOrder}
                className="flex-1 bg-gradient-to-b from-[#60C0E8] to-[#0EA5E9] hover:from-[#4FB0D8] hover:to-[#0284C7] text-white shadow-[0_2px_8px_rgba(14,165,233,0.3)] rounded-lg font-medium"
              >
                Bestätigen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Carousel mode - Always enabled when multiple addresses exist
  // On mobile, use swipe deck; on desktop, use embla carousel
  if (isMobile) {
    // Mobile: Use ModalSwipeDeck for Tinder-style swiping
    const renderCompleteCard = (addr: Address, index: number, total: number) => {
      const allAddrUnits = addr.filteredUnits || addr.units || [];
      const addrUnits = allAddrUnits.filter(unit => !unit.deleted);
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
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-600 text-xs gap-1 border-0"
                onClick={() => handleAddUnitsClick(addr.id)}
              >
                <Plus className="w-4 h-4" />
                Hinzufügen
              </Button>
            </div>
          </div>

          {/* Card Content */}
          <div className="flex-1 min-h-0">
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
            className="p-0 overflow-visible bg-transparent border-0 shadow-none w-full h-[85vh] z-[10060]"
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
              <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0 rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmSameStatusUpdate}
                className="flex-1 bg-gradient-to-b from-[#60C0E8] to-[#0EA5E9] hover:from-[#4FB0D8] hover:to-[#0284C7] text-white shadow-[0_2px_8px_rgba(14,165,233,0.3)] rounded-lg font-medium"
              >
                Bestätigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Note Dialog */}
        {addNoteDialogOpen && (
          <div className="fixed inset-0 bg-black/60 z-[10090]" onClick={() => setAddNoteDialogOpen(false)} />
        )}
        <Dialog open={addNoteDialogOpen} onOpenChange={setAddNoteDialogOpen}>
          <DialogContent className="w-[90vw] max-w-md rounded-2xl z-[10100]" hideOverlay onClick={(e) => e.stopPropagation()}>
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
                className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border-border rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleAddNote}
                className="flex-1 bg-gradient-to-b from-[#60C0E8] to-[#0EA5E9] hover:from-[#4FB0D8] hover:to-[#0284C7] text-white shadow-[0_2px_8px_rgba(14,165,233,0.3)] rounded-lg font-medium"
              >
                Bestätigen
              </Button>
            </div>
          </DialogContent>
        </Dialog>


        {/* Delete Note Dialog */}
        {deleteNoteDialogOpen && (
          <div className="fixed inset-0 bg-black/60 z-[10090]" onClick={() => setDeleteNoteDialogOpen(false)} />
        )}
        <AlertDialog open={deleteNoteDialogOpen} onOpenChange={setDeleteNoteDialogOpen}>
          <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl z-[10100]" hideOverlay onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Notiz löschen</AlertDialogTitle>
              <AlertDialogDescription>
                Möchtest du diese Notiz wirklich löschen?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
              <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0 rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteNote}
                className="flex-1 bg-gradient-to-b from-[#60C0E8] to-[#0EA5E9] hover:from-[#4FB0D8] hover:to-[#0284C7] text-white shadow-[0_2px_8px_rgba(14,165,233,0.3)] rounded-lg font-medium"
              >
                Bestätigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Units Dialog (Mobile) */}
        <AlertDialog open={addUnitsDialogOpen} onOpenChange={setAddUnitsDialogOpen}>
          <AlertDialogPortal>
            <AlertDialogOverlay className="fixed inset-0 z-[10090] bg-black/60" onClick={() => setAddUnitsDialogOpen(false)} />
            <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl z-[10100]">
              <button
                onClick={() => setAddUnitsDialogOpen(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Schließen</span>
              </button>
              <AlertDialogHeader>
                <AlertDialogTitle>Wohneinheit hinzufügen</AlertDialogTitle>
                <AlertDialogDescription>
                  Wie viele Wohneinheiten möchtest du hinzufügen? (max. 3 pro Aktion)
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="py-4">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setAddUnitsCount(Math.max(1, addUnitsCount - 1))}
                    disabled={addUnitsCount <= 1}
                    className="h-10 w-10 rounded-full"
                  >
                    -
                  </Button>
                  <div className="w-20 text-center">
                    <Input
                      type="number"
                      min="1"
                      max="3"
                      value={addUnitsCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setAddUnitsCount(Math.min(3, Math.max(1, val)));
                      }}
                      className="text-center text-xl font-semibold h-12"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setAddUnitsCount(Math.min(3, addUnitsCount + 1))}
                    disabled={addUnitsCount >= 3}
                    className="h-10 w-10 rounded-full"
                  >
                    +
                  </Button>
                </div>
              </div>

              <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
                <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0">
                  Abbrechen
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmAddUnits}
                  className="flex-1 bg-gradient-to-b from-[#60C0E8] to-[#0EA5E9] hover:from-[#4FB0D8] hover:to-[#0284C7] text-white shadow-[0_2px_8px_rgba(14,165,233,0.3)] rounded-lg font-medium"
                >
                  Hinzufügen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogPortal>
        </AlertDialog>

        {/* Delete Unit Dialog (Mobile) */}
        <AlertDialog open={deleteUnitDialogOpen} onOpenChange={setDeleteUnitDialogOpen}>
          <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Wohneinheit löschen</AlertDialogTitle>
              <AlertDialogDescription>
                Diese Wohneinheit löschen?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
              <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0">
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUnit}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Order Creation Dialog (Mobile) */}
        {orderDialogOpen && (
          <div className="fixed inset-0 bg-black/60 z-[10090]" onClick={() => setOrderDialogOpen(false)} />
        )}
        <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
          <DialogContent className="w-[90vw] max-w-md rounded-2xl z-[10100]" hideOverlay onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Auftrag anlegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Vorname *</label>
                <input
                  type="text"
                  value={orderForm.vorname}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, vorname: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:border-primary"
                  placeholder="Vorname eingeben"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nachname *</label>
                <input
                  type="text"
                  value={orderForm.nachname}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, nachname: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:border-primary"
                  placeholder="Nachname eingeben"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tarif *</label>
                <Select value={orderForm.tarif} onValueChange={(value) => setOrderForm(prev => ({ ...prev, tarif: value }))}>
                  <SelectTrigger className="w-full px-3 py-2 border border-border rounded-md bg-background">
                    <SelectValue placeholder="Tarif auswählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-[10000]">
                    <SelectItem value="100/20 Mbit/s" className="text-blue-600 dark:text-blue-400 font-medium">100/20 Mbit/s</SelectItem>
                    <SelectItem value="300/60 Mbit/s" className="text-green-600 dark:text-green-400 font-medium">300/60 Mbit/s</SelectItem>
                    <SelectItem value="500/100 Mbit/s" className="text-purple-600 dark:text-purple-400 font-medium">500/100 Mbit/s</SelectItem>
                    <SelectItem value="1000/250 Mbit/s" className="text-orange-600 dark:text-orange-400 font-medium">1000/250 Mbit/s</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Zusätze</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={orderForm.zusaetze.includes('NC TV')}
                      onChange={() => toggleZusatz('NC TV')}
                      className="w-4 h-4 rounded border-border text-primary mr-2"
                    />
                    <span className="text-sm">NC TV</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={orderForm.zusaetze.includes('NC Router')}
                      onChange={() => toggleZusatz('NC Router')}
                      className="w-4 h-4 rounded border-border text-primary mr-2"
                    />
                    <span className="text-sm">NC Router</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setOrderDialogOpen(false);
                  setOrderUnitId(null);
                  setOrderAddressId(null);
                }}
                className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border-border"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleConfirmOrder}
                className="flex-1 bg-gradient-to-b from-[#60C0E8] to-[#0EA5E9] hover:from-[#4FB0D8] hover:to-[#0284C7] text-white shadow-[0_2px_8px_rgba(14,165,233,0.3)] rounded-lg font-medium"
              >
                Bestätigen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop: Use Embla Carousel
  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent ref={modalContentRef} hideClose className="box-border w-[92vw] max-w-[92vw] sm:max-w-2xl sm:w-[95vw] h-[85vh] sm:h-[80vh] p-0 overflow-hidden rounded-xl z-[10060] flex flex-col min-h-0">
          <div className="embla flex h-full w-full overflow-hidden relative" ref={emblaRef}>
            {/* Navigation Arrows - Desktop/Tablet Only */}
            {allAddresses.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => emblaApi?.scrollPrev()}
                  disabled={currentIndex === 0}
                  className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-[10070] h-10 w-10 rounded-full bg-background/95 hover:bg-background shadow-lg border border-border disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => emblaApi?.scrollNext()}
                  disabled={currentIndex === allAddresses.length - 1}
                  className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-[10070] h-10 w-10 rounded-full bg-background/95 hover:bg-background shadow-lg border border-border disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
            <div className="embla__container flex h-full">
              {allAddresses.map((addr, index) => {
                const allAddrUnits = addr.filteredUnits || addr.units || [];
                const addrUnits = allAddrUnits.filter(unit => !unit.deleted);
                const addrUnitCount = addrUnits.length;
                
                return (
                  <div 
                    key={addr.id} 
                    className="embla__slide basis-full h-full flex flex-col min-h-0"
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
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-600 text-xs gap-1 border-0"
                            onClick={() => handleAddUnitsClick(addr.id)}
                          >
                            <Plus className="w-4 h-4" />
                            Hinzufügen
                          </Button>
                        </div>
                      </DialogHeader>

                      <div className="flex-1 min-h-0">
                        {renderAddressContent(addr)}
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

      {/* Add Note Dialog */}
      {addNoteDialogOpen && (
        <div className="fixed inset-0 bg-black/60 z-[10090]" onClick={() => setAddNoteDialogOpen(false)} />
      )}
      <Dialog open={addNoteDialogOpen} onOpenChange={setAddNoteDialogOpen}>
        <DialogContent className="w-[90vw] max-w-md rounded-2xl z-[10100]" hideOverlay onClick={(e) => e.stopPropagation()}>
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

      {/* Add Appointment Dialog */}
      {addAppointmentDialogOpen && (
        <div className="fixed inset-0 bg-black/60 z-[10090]" onClick={() => setAddAppointmentDialogOpen(false)} />
      )}
      <Dialog open={addAppointmentDialogOpen} onOpenChange={setAddAppointmentDialogOpen}>
        <DialogContent className="w-[92vw] max-w-lg h-[85vh] p-0 z-[10100] grid grid-rows-[auto,1fr,auto] overflow-hidden rounded-2xl" hideOverlay>
          <DialogHeader className="px-6 pt-4 pb-2 border-b">
            <DialogTitle>Termin hinzufügen</DialogTitle>
          </DialogHeader>
          
          <div className="min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-6 py-2" style={{ WebkitOverflowScrolling: 'touch' } as any}>
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
                  <PopoverContent className="w-auto p-0 z-[10120]" align="start" side="bottom">
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
                      if (value && !appointmentDuration) {
                        setAppointmentDuration("30");
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1 border-border focus:ring-0 focus:outline-none">
                      <SelectValue placeholder="Stunde" />
                    </SelectTrigger>
                    <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10120]">
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
                     <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10120]">
                       {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minute) => (
                        <SelectItem key={minute} value={minute.toString().padStart(2, '0')}>
                          {minute.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={appointmentDuration} 
                    onValueChange={setAppointmentDuration}
                  >
                    <SelectTrigger className="flex-1 border-border focus:ring-0 focus:outline-none">
                      <SelectValue placeholder="Dauer" />
                     </SelectTrigger>
                     <SelectContent side="bottom" avoidCollisions={false} className="bg-background z-[10120]">
                       {[10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((duration) => (
                        <SelectItem key={duration} value={duration.toString()}>
                          {duration} min
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
                      className="border-border focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Notizen</label>
                    <Textarea
                      placeholder="Optional"
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      className="min-h-[80px] resize-none border-border focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-sm"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Map Section */}
              <div className="border-t pt-6 mt-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMapDay}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-medium">
                      {showAllAppointments ? "Alle Termine" : (mapDisplayDate ? mapDisplayDate.toLocaleDateString('de-DE') : (appointmentDate ? appointmentDate.toLocaleDateString('de-DE') : "Datum wählen"))}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMapDay}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setShowAllAppointments(!showAllAppointments); if (!showAllAppointments) { setMapDisplayDate(undefined); } else { setMapDisplayDate(appointmentDate || new Date()); } }} className="text-xs h-7">
                    {showAllAppointments ? "Datum filtern" : "Alle anzeigen"}
                  </Button>
                </div>
                <div className="h-32 md:h-40 rounded-lg overflow-hidden border border-border">
              <AppointmentMap
                appointments={appointments.map(apt => ({
                  id: apt.id,
                  date: apt.date,
                  time: apt.time,
                  address: apt.address,
                  customer: apt.customer,
                  coordinates: apt.coordinates
                }))}
                selectedDate={mapDisplayDate}
                currentAddress={mapCurrentAddress}
                selectedAppointmentId={null}
              />
            </div>
          </div>

          {/* Termine Liste */}
          <div className="border-t pt-6 mt-4">
              <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Termine Liste</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAllAppointments(!showAllAppointments);
                      if (!showAllAppointments) {
                        setMapDisplayDate(undefined);
                      } else {
                        setMapDisplayDate(appointmentDate);
                      }
                    }}
                    className="text-xs h-7 px-2"
                  >
                    {showAllAppointments ? "Datum filtern" : "Alle anzeigen"}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {displayedAppointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {showAllAppointments ? "Keine Termine vorhanden" : "Keine Termine für dieses Datum"}
                    </p>
                  ) : (
                    displayedAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="p-3 bg-muted/50 rounded-lg text-sm space-y-1"
                      >
                        <div className="flex justify-between items-start">
                          <div className="font-medium">
                            {new Date(apt.date).toLocaleDateString('de-DE')} um {apt.time}
                          </div>
                        </div>
                        {apt.customer && (
                          <div className="text-muted-foreground">{apt.customer}</div>
                        )}
                        {apt.notes && (
                          <div className="text-muted-foreground text-xs">{apt.notes}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Buttons at Bottom */}
          <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setAddAppointmentDialogOpen(false);
                setAppointmentDate(undefined);
                setAppointmentTime("");
                setAppointmentHour("");
                setAppointmentMinute("");
                setAppointmentDuration("");
                setAppointmentCustomer("");
                setAppointmentNotes("");
                setPendingAppointmentUnitId(null);
              }}
              className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border-border rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              Abbrechen
            </Button>
            <Button
              onClick={saveAppointment}
              disabled={!appointmentDate || !appointmentTime}
              className="flex-1 bg-gradient-to-b from-[#60C0E8] to-[#0EA5E9] hover:from-[#4FB0D8] hover:to-[#0284C7] text-white disabled:opacity-50 shadow-[0_2px_8px_rgba(14,165,233,0.3)] rounded-lg font-medium"
            >
              Bestätigen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Note Dialog */}
      {deleteNoteDialogOpen && (
        <div className="fixed inset-0 bg-black/60 z-[10090]" onClick={() => setDeleteNoteDialogOpen(false)} />
      )}
      <AlertDialog open={deleteNoteDialogOpen} onOpenChange={setDeleteNoteDialogOpen}>
        <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl z-[10100]" hideOverlay onClick={(e) => e.stopPropagation()}>
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

      {/* Add Units Dialog */}
      <AlertDialog open={addUnitsDialogOpen} onOpenChange={setAddUnitsDialogOpen}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="fixed inset-0 z-[10090] bg-black/60" onClick={() => setAddUnitsDialogOpen(false)} />
          <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl z-[10100]">
            <button
              onClick={() => setAddUnitsDialogOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Schließen</span>
            </button>
            <AlertDialogHeader>
              <AlertDialogTitle>Wohneinheit hinzufügen</AlertDialogTitle>
              <AlertDialogDescription>
                Wie viele Wohneinheiten möchtest du hinzufügen? (max. 3 pro Aktion)
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setAddUnitsCount(Math.max(1, addUnitsCount - 1))}
                  disabled={addUnitsCount <= 1}
                  className="h-10 w-10 rounded-full"
                >
                  -
                </Button>
                <div className="w-20 text-center">
                  <Input
                    type="number"
                    min="1"
                    max="3"
                    value={addUnitsCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setAddUnitsCount(Math.min(3, Math.max(1, val)));
                    }}
                    className="text-center text-xl font-semibold h-12"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setAddUnitsCount(Math.min(3, addUnitsCount + 1))}
                  disabled={addUnitsCount >= 3}
                  className="h-10 w-10 rounded-full"
                >
                  +
                </Button>
              </div>
            </div>
            <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
              <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0">
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmAddUnits}
                className="flex-1 bg-gradient-to-b from-[#60C0E8] to-[#0EA5E9] hover:from-[#4FB0D8] hover:to-[#0284C7] text-white shadow-[0_2px_8px_rgba(14,165,233,0.3)] rounded-lg font-medium"
              >
                Hinzufügen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      {/* Delete Unit Dialog (Desktop Carousel) */}
      <AlertDialog open={deleteUnitDialogOpen} onOpenChange={setDeleteUnitDialogOpen}>
        <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Wohneinheit löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Wohneinheit löschen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
            <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUnit}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Order Creation Dialog */}
      {orderDialogOpen && (
        <div className="fixed inset-0 bg-black/60 z-[10090]" onClick={() => setOrderDialogOpen(false)} />
      )}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="w-[90vw] max-w-md rounded-2xl z-[10100]" hideOverlay onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Auftrag anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Vorname *</label>
              <input
                type="text"
                value={orderForm.vorname}
                onChange={(e) => setOrderForm(prev => ({ ...prev, vorname: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:border-primary"
                placeholder="Vorname eingeben"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nachname *</label>
              <input
                type="text"
                value={orderForm.nachname}
                onChange={(e) => setOrderForm(prev => ({ ...prev, nachname: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:border-primary"
                placeholder="Nachname eingeben"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tarif *</label>
              <Select value={orderForm.tarif} onValueChange={(value) => setOrderForm(prev => ({ ...prev, tarif: value }))}>
                <SelectTrigger className="w-full px-3 py-2 border border-border rounded-md bg-background">
                  <SelectValue placeholder="Tarif auswählen" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-[10000]">
                  <SelectItem value="100/20 Mbit/s" className="text-blue-600 dark:text-blue-400 font-medium">100/20 Mbit/s</SelectItem>
                  <SelectItem value="300/60 Mbit/s" className="text-green-600 dark:text-green-400 font-medium">300/60 Mbit/s</SelectItem>
                  <SelectItem value="500/100 Mbit/s" className="text-purple-600 dark:text-purple-400 font-medium">500/100 Mbit/s</SelectItem>
                  <SelectItem value="1000/250 Mbit/s" className="text-orange-600 dark:text-orange-400 font-medium">1000/250 Mbit/s</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Zusätze</label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="nc-tv"
                    checked={orderForm.zusaetze.includes('NC TV')}
                    onChange={() => toggleZusatz('NC TV')}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary mr-2"
                  />
                  <label htmlFor="nc-tv" className="text-sm cursor-pointer">NC TV</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="nc-router"
                    checked={orderForm.zusaetze.includes('NC Router')}
                    onChange={() => toggleZusatz('NC Router')}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary mr-2"
                  />
                  <label htmlFor="nc-router" className="text-sm cursor-pointer">NC Router</label>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setOrderDialogOpen(false);
                setOrderUnitId(null);
                setOrderAddressId(null);
              }}
              className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border-border"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirmOrder}
              className="flex-1 bg-gradient-to-b from-[#60C0E8] to-[#0EA5E9] hover:from-[#4FB0D8] hover:to-[#0284C7] text-white shadow-[0_2px_8px_rgba(14,165,233,0.3)] rounded-lg font-medium"
            >
              Bestätigen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kein Interesse Grund-Dialog - für alle Render-Pfade */}
      <AlertDialog open={keinInteresseDialogOpen} onOpenChange={(open) => {
        setKeinInteresseDialogOpen(open);
        if (!open) {
          // Clear fields when dialog is closed/cancelled
          setKeinInteresseReason("");
          setKeinInteresseCustomText("");
          setPendingKeinInteresse(null);
        }
      }}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="fixed inset-0 z-[10110] bg-black/80" style={{ willChange: 'opacity' }} />
          <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl z-[10120]" style={{ willChange: 'transform, opacity' }}>
            <button
              onClick={() => setKeinInteresseDialogOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Schließen</span>
            </button>
            <AlertDialogHeader>
              <AlertDialogTitle>Kein Interesse - Grund angeben</AlertDialogTitle>
              <AlertDialogDescription>
                Bitte wähle einen Grund aus.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <Select value={keinInteresseReason} onValueChange={setKeinInteresseReason}>
                <SelectTrigger className="w-full h-10 rounded-md bg-background border border-border shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                  <SelectValue placeholder="Grund auswählen" />
                </SelectTrigger>
                <SelectContent position="popper" className="bg-background border border-border shadow-lg z-[10090]">
                  <SelectItem value="Zu alt">Zu alt</SelectItem>
                  <SelectItem value="Kein Besuch mehr erwünscht">Kein Besuch mehr erwünscht</SelectItem>
                  <SelectItem value="Ziehen bald weg">Ziehen bald weg</SelectItem>
                  <SelectItem value="Zur Miete">Zur Miete</SelectItem>
                  <SelectItem value="Anderer Grund">Anderer Grund</SelectItem>
                </SelectContent>
              </Select>
              {keinInteresseReason === "Anderer Grund" && (
                <Textarea
                  placeholder="Grund eingeben…"
                  value={keinInteresseCustomText}
                  onChange={(e) => setKeinInteresseCustomText(e.target.value)}
                  className="min-h-[80px] resize-none border-border focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              )}
            </div>
            <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
              <AlertDialogCancel 
                className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0 rounded-lg" 
                onClick={() => { setKeinInteresseReason(""); setKeinInteresseCustomText(""); }}
              >
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmKeinInteresse}
                disabled={!keinInteresseReason || (keinInteresseReason === "Anderer Grund" && !keinInteresseCustomText.trim())}
                className="flex-1 bg-gradient-to-b from-[#60C0E8] to-[#0EA5E9] hover:from-[#4FB0D8] hover:to-[#0284C7] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(14,165,233,0.3)] rounded-lg font-medium"
              >
                Bestätigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      {/* Potenzial Bewertung - für alle Render-Pfade */}
      <AlertDialog open={potenzialDialogOpen} onOpenChange={setPotenzialDialogOpen}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="fixed inset-0 z-[10110] bg-black/80" style={{ willChange: 'opacity' }} />
          <AlertDialogContent className="px-8 w-[90vw] max-w-md rounded-2xl z-[10120]" style={{ willChange: 'transform, opacity' }}>
            <button
              onClick={() => setPotenzialDialogOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Schließen</span>
            </button>
            <AlertDialogHeader>
              <AlertDialogTitle>Potenzial bewerten</AlertDialogTitle>
              <AlertDialogDescription>
                Wie schätzt du das Potenzial ein?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-center gap-2 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setPotenzialRating(star)} onMouseEnter={() => setPotenzialHoverRating(star)} onMouseLeave={() => setPotenzialHoverRating(0)} className="transition-transform hover:scale-110">
                  <Star className={cn("w-12 h-12 transition-colors", (potenzialHoverRating >= star || (potenzialHoverRating === 0 && potenzialRating >= star)) ? "fill-yellow-400 text-yellow-400" : "fill-none text-gray-300")} />
                </button>
              ))}
            </div>
            {potenzialRating > 0 && (
              <p className="text-center text-sm text-muted-foreground">Bewertung: {potenzialRating} von 5 Sternen</p>
            )}
            <AlertDialogFooter className="flex-row gap-3 sm:gap-3">
              <AlertDialogCancel className="flex-[0.8] bg-background hover:bg-muted text-muted-foreground border border-border m-0 rounded-lg" onClick={() => { setPotenzialRating(0); setPotenzialHoverRating(0); }}>
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmPotenzialRating} disabled={potenzialRating === 0} className="flex-1 bg-gradient-to-b from-[#60C0E8] to-[#0EA5E9] hover:from-[#4FB0D8] hover:to-[#0284C7] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(14,165,233,0.3)] rounded-lg font-medium">
                Bestätigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    </>
  );
};
