import { useState, useEffect, useCallback, useRef, useLayoutEffect, forwardRef, useMemo } from "react";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { X, Plus, RotateCcw, FileText, Info, Clock, ChevronDown, ChevronLeft, ChevronRight, Check, Calendar as CalendarIcon, Star, Trash2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsPhone, useIsTablet } from "@/hooks/use-device-type";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { AppointmentMap } from "./AppointmentMap";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SelectPrimitive from "@radix-ui/react-select";
import HorizontalModalPager, { HorizontalModalPagerHandle } from "./modal/HorizontalModalPager";
import { MotionDialog } from "./modal/MotionDialog";
// Lazy load confetti for performance
import { supabase } from "@/integrations/supabase/client";
import { orderFormSchema, noteSchema, customerNameSchema } from "@/utils/validation";
import { motion } from "framer-motion";
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

// Navigation Arrow Component - only animate icon to prevent jumping
const NavigationArrow: React.FC<{
  direction: "left" | "right";
  onClick: () => void;
  disabled?: boolean;
}> = ({ direction, onClick, disabled }) => {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  
  return (
    <button
      type="button"
      onClick={(e) => { 
        e.stopPropagation(); 
        if (!disabled) onClick(); 
      }}
      disabled={disabled}
      aria-label={direction === "left" ? "Vorherige Adresse" : "Nächste Adresse"}
      className={cn(
        "flex items-center justify-center",
        "absolute top-1/2 -translate-y-1/2 z-[10150]",
        direction === "left" ? "left-6 md:left-8 lg:left-12 xl:left-16" : "right-6 md:right-8 lg:right-12 xl:right-16",
        "h-10 w-10 rounded-full",
        "bg-background/95 hover:bg-background",
        "shadow-lg border border-border",
        "disabled:opacity-30 disabled:cursor-not-allowed",
        "transition-colors duration-200",
        "outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0",
        "[&:focus-visible]:outline-none [&:focus-visible]:ring-0",
        "[&:focus]:outline-none [&:focus]:shadow-none"
      )}
      style={{ 
        WebkitTapHighlightColor: "transparent",
        outline: 'none',
        boxShadow: 'none'
      } as React.CSSProperties}
    >
      <motion.span
        className="grid place-items-center"
        whileHover={disabled ? {} : { scale: 1.12 }}
        whileTap={disabled ? {} : { scale: 0.92 }}
        transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.2 }}
      >
        <Icon className="h-5 w-5" />
      </motion.span>
    </button>
  );
};

// Helper-Komponenten: Modal-gebundene Popover und Select für klickbare Dropdowns
interface ModalBoundPopoverProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  modalRef: React.RefObject<HTMLDivElement>;
}

const ModalBoundPopover = forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  ModalBoundPopoverProps
>(({ children, modalRef, ...props }, ref) => {
  return (
    <PopoverPrimitive.Portal container={modalRef?.current}>
      <PopoverPrimitive.Content
        ref={ref}
        {...props}
        className={cn(
          "z-[10120] rounded-md border bg-popover p-4 shadow-xl pointer-events-auto",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          props.className
        )}
        sideOffset={props.sideOffset ?? 8}
        collisionPadding={8}
        avoidCollisions={true}
        collisionBoundary={modalRef?.current}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
});
ModalBoundPopover.displayName = "ModalBoundPopover";

interface ModalBoundSelectProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
  modalRef: React.RefObject<HTMLDivElement>;
}

const ModalBoundSelect = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  ModalBoundSelectProps
>(({ children, modalRef, ...props }, ref) => {
  return (
    <SelectPrimitive.Portal container={modalRef?.current}>
      <SelectPrimitive.Content
        ref={ref}
        {...props}
        className={cn(
          "z-[10120] max-h-[200px] overflow-y-auto rounded-md border bg-popover shadow-xl pointer-events-auto",
          props.className
        )}
        position="popper"
        sideOffset={props.sideOffset ?? 4}
        collisionPadding={8}
        avoidCollisions={true}
        collisionBoundary={modalRef?.current}
      >
        <SelectPrimitive.Viewport className="p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
ModalBoundSelect.displayName = "ModalBoundSelect";

// Removed CARD_VARIANTS and ITEM_VARIANTS for better performance

export const AddressDetailModal = ({ address, allAddresses = [], initialIndex = 0, open, onOpenChange, onClose, onOrderCreated, onUpdateUnitStatus }: AddressDetailModalProps) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const isCoarse = useCoarsePointer();
  const isPhone = useIsPhone();
  const isTablet = useIsTablet();
  const showArrows = allAddresses.length > 1 && !isPhone && !isTablet; // Pfeile NUR auf Desktop
  
  const emblaOptions = useMemo(
    () => ({
      watchDrag: isPhone || isTablet, // Swipe NUR für Mobile + Tablet, Desktop: nur Pfeile
      duration: 15, // Apple-Style: Smooth & snappy
      skipSnaps: false,
    }),
    [isPhone, isTablet] // Dependencies für korrekte Reaktivität
  );
  
  // Lock body scroll when modal is open
  useBodyScrollLock(open);
  
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
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [prevIndex, setPrevIndex] = useState(initialIndex); // Track previous index for slide direction
  
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
  const pagerRef = useRef<HorizontalModalPagerHandle>(null);
  const [contentAnimated, setContentAnimated] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  
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

  // Reset currentIndex when modal opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setContentAnimated(true); // Instant, no delay
    }
  }, [open, initialIndex]);
  
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
  
  // Prefetch states for current and neighbor addresses (single RAF for performance)
  useEffect(() => {
    if (!open || allAddresses.length === 0) return;

    const raf = requestAnimationFrame(() => {
      // Only current + next for faster initialization
      const indicesToPrefetch = [currentIndex, currentIndex + 1]
        .filter(i => i >= 0 && i < allAddresses.length);
  
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
  const BoundedPopoverContent = forwardRef<HTMLDivElement, any>(({ modalRef, className, children, sideOffset = 8, align = "start" }, _ref) => {
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
      let raf1 = 0, raf2 = 0;
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => update());
      });

      const onScroll = () => update();
      window.addEventListener("resize", update);
      window.addEventListener("scroll", onScroll, true);

      const el = contentRef.current;
      const mo = el ? new MutationObserver(() => update()) : undefined;
      if (el) mo!.observe(el, { attributes: true, attributeFilter: ["style", "data-state"] });

      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", onScroll, true);
        mo?.disconnect();
      };
    }, [update]);

    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={contentRef}
          side="bottom"
          align={align}
          sideOffset={sideOffset}
          avoidCollisions={false}
          className={className}
          style={{ maxHeight: maxH, ["--bounded-max-h" as any]: `${maxH ?? 0}px` }}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
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
      <SelectPrimitive.Portal>
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

    // Trigger confetti animation - lazy load for performance
    const triggerConfetti = async () => {
      const confettiModule = await import('canvas-confetti');
      const confetti = confettiModule.default;
      
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
    };
    
    triggerConfetti();

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

  const renderAddressContent = (addr: Address, isActive: boolean = true) => {
    const allUnits = addr.filteredUnits || addr.units || [];
    const units = allUnits.filter(unit => !unit.deleted);
    const unitCount = units.length;
    
    return (
      <div className="flex flex-col h-full min-h-0 w-full max-w-full touch-pan-y">
        {/* Single scrollable container */}
        <div 
          ref={setScrollRef(addr.id)} 
          className={`flex-1 min-h-0 w-full max-w-full overflow-y-auto overflow-x-hidden px-3 sm:px-6 pt-4 pb-6 touch-pan-y overscroll-contain ${unitCount > 1 ? 'space-y-4 sm:space-y-6' : ''}`} 
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            touchStartRef.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchMove={(e) => {
            if (!touchStartRef.current) return;
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
            const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
            // Only stop propagation if clearly vertical scroll
            if (deltaY > deltaX + 5) {
              e.stopPropagation();
            }
          }}
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
                    
                    {/* All content stacked vertically on all screen sizes */}
                    <div className="flex flex-col space-y-3">
                      {/* Controls */}
                      <div className="space-y-3">
                        {!isNotMarketable ? (
                          <div className="flex gap-3 min-w-0">
                            <div className="flex-[4] min-w-0 pointer-events-auto">
                                <Select defaultValue={unit.floor || undefined} disabled={isNotMarketable}>
                                  <SelectTrigger className="w-full max-w-full min-w-0 h-9 sm:h-10 border border-border rounded-md shadow-none bg-background focus:ring-0 focus:outline-none pointer-events-auto">
                                    <SelectValue placeholder="Stockwerk" />
                                  </SelectTrigger>
                                  <ModalBoundSelect modalRef={modalContentRef} side="bottom" align="start">
                                    <SelectItem value="EG">EG</SelectItem>
                                    <SelectItem value="1. OG">1. OG</SelectItem>
                                    <SelectItem value="2. OG">2. OG</SelectItem>
                                    <SelectItem value="3. OG">3. OG</SelectItem>
                                    <SelectItem value="4. OG">4. OG</SelectItem>
                                    <SelectItem value="5. OG">5. OG</SelectItem>
                                    <SelectItem value="6. OG">6. OG</SelectItem>
                                    <SelectItem value="7. OG">7. OG</SelectItem>
                                    <SelectItem value="8. OG">8. OG</SelectItem>
                                  </ModalBoundSelect>
                                </Select>
                            </div>

                            <div className="flex-[2] min-w-0 pointer-events-auto">
                              <Select defaultValue={unit.position || undefined} disabled={isNotMarketable}>
                                  <SelectTrigger className="w-full max-w-full min-w-0 h-9 sm:h-10 border border-border rounded-md shadow-none bg-background focus:ring-0 focus:outline-none pr-2 pointer-events-auto">
                                    <SelectValue placeholder="Lage" />
                                  </SelectTrigger>
                                  <ModalBoundSelect modalRef={modalContentRef} side="bottom" align="start">
                                    <SelectItem value="Links">Links</SelectItem>
                                    <SelectItem value="Rechts">Rechts</SelectItem>
                                    <SelectItem value="Mitte">Mitte</SelectItem>
                                  </ModalBoundSelect>
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
                                  <ModalBoundSelect modalRef={modalContentRef} side="bottom" align="start">
                                    {statusOptions
                                      .filter(status => status.value !== "offen" && status.value !== "neukunde" && status.value !== "termin")
                                      .map((status) => (
                                        <SelectItem key={status.value} value={status.value}>
                                          <div className={`px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                                            {status.label}
                                          </div>
                                        </SelectItem>
                                      ))}
                                  </ModalBoundSelect>
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
                                   <ModalBoundPopover
                                    modalRef={modalContentRef}
                                    align="start"
                                    side="bottom"
                                    className="w-64 p-0 overflow-hidden"
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
                                   </ModalBoundPopover>
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

                        {/* Notizen Collapsible - now shown on all screen sizes */}
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
                          <CollapsibleContent className="mt-2 data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
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

                        {/* Termine Collapsible - now shown on all screen sizes */}
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
                          <CollapsibleContent className="mt-2 data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
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

                        {/* Auftrag Button - now shown on all screen sizes if not Neukunde and marketable */}
                        {unitStatuses[`${addr.id}:${unit.id}`] !== "neukunde" && !isNotMarketable && (
                          <Button 
                            onClick={() => handleOpenOrderDialog(addr.id, unit.id)}
                            className="w-full bg-black hover:bg-gray-800 text-white text-sm rounded-md"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Auftrag
                          </Button>
                        )}
                      </div>
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

  // Render complete card for carousel (used by both mobile and desktop) - NO Motion conflicts
  const renderCompleteCard = (addr: Address, index: number, total: number) => {
    const allAddrUnits = addr.filteredUnits || addr.units || [];
    const addrUnits = allAddrUnits.filter(unit => !unit.deleted);
    const addrUnitCount = addrUnits.length;
    
    const isActive = index === currentIndex;
    const isAdjacent = Math.abs(index - currentIndex) === 1;
    const shouldLoadMap = isActive || isAdjacent;
    
    return (
      <div 
        key={addr.id} 
        className={cn(
          "w-[85vw] max-w-lg h-[80vh]",
          "rounded-2xl overflow-hidden bg-background shadow-2xl",
          "[-webkit-mask-image:-webkit-radial-gradient(white,black)]",
          "flex flex-col"
        )}
        style={{
          contentVisibility: isActive ? 'visible' : 'auto',
          willChange: isActive ? 'transform' : 'auto'
        }}
      >

        {/* Card Header */}
        <div className="relative px-4 py-4 border-b flex-shrink-0 bg-background">
          <DialogClose 
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:outline-none focus-visible:ring-0 z-50"
            onClick={() => handleDialogChange(false)}
            style={{ WebkitTapHighlightColor: "transparent" }}
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
        <div 
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain w-full"
          style={{
            WebkitOverflowScrolling: 'touch',
            background: 'transparent'
          }}
        >
            {renderAddressContent(addr, shouldLoadMap)}
            <div aria-hidden="true" className="w-full" style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 64px)' }} />
        </div>
      </div>
    );
  };

  // Single address mode - use the same card as carousel
  if (allAddresses.length <= 1) {
    return (
      <>
        <MotionDialog
          open={open}
          onOpenChange={handleDialogChange}
          className="w-full h-full flex items-center justify-center"
        >
          {renderCompleteCard(currentAddress, 0, 1)}
        </MotionDialog>

        <AlertDialog open={confirmStatusUpdateOpen} onOpenChange={setConfirmStatusUpdateOpen}>
          <AlertDialogContent className="px-8 w-[85vw] sm:w-[75vw] md:w-[55vw] lg:w-[380px] max-w-xs rounded-2xl">
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
            <AlertDialogContent className="px-8 w-[85vw] sm:w-[75vw] md:w-[55vw] lg:w-[380px] max-w-xs rounded-2xl z-[10110]">
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
                    className="text-center text-xl font-semibold h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
         </AlertDialog>

        {/* Delete Unit Dialog */}
        <AlertDialog open={deleteUnitDialogOpen} onOpenChange={setDeleteUnitDialogOpen}>
          <AlertDialogContent className="px-8 w-[85vw] sm:w-[75vw] md:w-[55vw] lg:w-[380px] max-w-xs rounded-2xl">
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
        <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
          <DialogContent className="w-[90vw] max-w-md rounded-2xl z-[10110]" hideOverlay onClick={(e) => e.stopPropagation()}>
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
                  <SelectContent className="bg-background border border-border z-[10120] pointer-events-auto max-h-[200px] overflow-y-auto">
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

  // Desktop/Tablet carousel with arrows
  return (
    <>
      <MotionDialog
        open={open}
        onOpenChange={handleDialogChange}
        className="w-full h-full"
      >
        <div className="relative flex items-center justify-center w-full h-full">
          {/* Navigation Arrow - Left */}
          {showArrows && (
            <NavigationArrow
              direction="left"
              onClick={() => pagerRef.current?.scrollPrev()}
              disabled={!pagerRef.current?.canScrollPrev()}
            />
          )}

          {/* Horizontal Carousel */}
          <HorizontalModalPager
            items={allAddresses}
            startIndex={initialIndex}
            renderCard={renderCompleteCard}
            onIndexChange={(idx) => {
              setPrevIndex(currentIndex);
              setCurrentIndex(idx);
            }}
            className="bg-transparent shadow-none ring-0"
            options={emblaOptions}
            ref={pagerRef}
          />

          {/* Navigation Arrow - Right */}
          {showArrows && (
            <NavigationArrow
              direction="right"
              onClick={() => pagerRef.current?.scrollNext()}
              disabled={!pagerRef.current?.canScrollNext()}
            />
          )}
        </div>
      </MotionDialog>

        <AlertDialog open={confirmStatusUpdateOpen} onOpenChange={setConfirmStatusUpdateOpen}>
          <AlertDialogContent className="px-8 w-[85vw] sm:w-[75vw] md:w-[55vw] lg:w-[380px] max-w-xs rounded-2xl">
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
        <Dialog open={addNoteDialogOpen} onOpenChange={setAddNoteDialogOpen}>
          <DialogContent className="w-[90vw] max-w-md rounded-2xl z-[10100]" onClick={(e) => e.stopPropagation()}>
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
        <AlertDialog open={deleteNoteDialogOpen} onOpenChange={setDeleteNoteDialogOpen}>
          <AlertDialogContent className="px-8 w-[85vw] sm:w-[75vw] md:w-[55vw] lg:w-[380px] max-w-xs rounded-2xl z-[10110]" onClick={(e) => e.stopPropagation()}>
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
          <AlertDialogContent className="px-8 w-[85vw] sm:w-[75vw] md:w-[55vw] lg:w-[380px] max-w-xs rounded-2xl z-[10110]">
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
                      className="text-center text-xl font-semibold h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
        </AlertDialog>

        {/* Delete Unit Dialog (Mobile) */}
        <AlertDialog open={deleteUnitDialogOpen} onOpenChange={setDeleteUnitDialogOpen}>
          <AlertDialogContent className="px-8 w-[85vw] sm:w-[75vw] md:w-[55vw] lg:w-[380px] max-w-xs rounded-2xl">
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
                  <SelectContent className="bg-background border border-border z-[10120] pointer-events-auto max-h-[200px] overflow-y-auto">
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
};