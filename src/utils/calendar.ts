import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isSameMonth, addDays, startOfDay, endOfDay, parse, addHours } from 'date-fns';
import { de } from 'date-fns/locale';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  location?: string;
  category: 'all' | 'business' | 'personal';
  color: string;
  is_all_day: boolean;
  created_at: string;
  updated_at: string;
  // New fields for address/project linking
  address_id?: number;
  unit_id?: string;
  project_id?: string;
  is_external?: boolean;
  external_id?: string;
  external_source?: string;
}

// Date Utilities
export const getDaysInMonth = (year: number, month: number): Date[] => {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(start);
  const startDate = startOfWeek(start, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(end, { weekStartsOn: 1 });
  
  return eachDayOfInterval({ start: startDate, end: endDate });
};

export const getWeekDays = (date: Date): Date[] => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end: addDays(start, 6) });
};

export const formatDateRange = (start: Date, end: Date): string => {
  const startFormatted = format(start, 'd. MMM', { locale: de });
  const endFormatted = format(end, 'd. MMM yyyy', { locale: de });
  return `${startFormatted} - ${endFormatted}`;
};

export const isSameDayUtil = (date1: Date, date2: Date): boolean => {
  return isSameDay(date1, date2);
};

export const getMonthName = (month: number, locale: string = 'de-DE'): string => {
  return format(new Date(2024, month), 'MMMM', { locale: de });
};

export const getWeekdayNames = (locale: string = 'de-DE'): string[] => {
  const baseDate = new Date(2024, 0, 1); // Monday
  const monday = startOfWeek(baseDate, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: monday, end: addDays(monday, 6) }).map(day =>
    format(day, 'EEE', { locale: de })
  );
};

// Event Utilities
export const sortEventsByTime = (events: CalendarEvent[]): CalendarEvent[] => {
  return [...events].sort((a, b) => 
    new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
  );
};

export const filterEventsByDate = (events: CalendarEvent[], date: Date): CalendarEvent[] => {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  
  return events.filter(event => {
    const eventStart = new Date(event.start_datetime);
    const eventEnd = new Date(event.end_datetime);
    
    // Event overlaps with the day
    return (
      (eventStart >= dayStart && eventStart <= dayEnd) ||
      (eventEnd >= dayStart && eventEnd <= dayEnd) ||
      (eventStart <= dayStart && eventEnd >= dayEnd)
    );
  });
};

export const filterEventsByDateRange = (events: CalendarEvent[], start: Date, end: Date): CalendarEvent[] => {
  const rangeStart = startOfDay(start);
  const rangeEnd = endOfDay(end);
  
  return events.filter(event => {
    const eventStart = new Date(event.start_datetime);
    const eventEnd = new Date(event.end_datetime);
    
    // Event overlaps with the range
    return (
      (eventStart >= rangeStart && eventStart <= rangeEnd) ||
      (eventEnd >= rangeStart && eventEnd <= rangeEnd) ||
      (eventStart <= rangeStart && eventEnd >= rangeEnd)
    );
  });
};

export const getEventDuration = (event: CalendarEvent): number => {
  const start = new Date(event.start_datetime);
  const end = new Date(event.end_datetime);
  return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
};

export const hasOverlap = (event1: CalendarEvent, event2: CalendarEvent): boolean => {
  const start1 = new Date(event1.start_datetime);
  const end1 = new Date(event1.end_datetime);
  const start2 = new Date(event2.start_datetime);
  const end2 = new Date(event2.end_datetime);
  
  return start1 < end2 && start2 < end1;
};

export interface LayoutInfo {
  event: CalendarEvent;
  column: number;
  totalColumns: number;
}

export const layoutOverlappingEvents = (events: CalendarEvent[]): LayoutInfo[] => {
  const sorted = sortEventsByTime(events);
  const layoutInfo: LayoutInfo[] = [];
  const columns: CalendarEvent[][] = [];
  
  sorted.forEach(event => {
    // Find the first column where this event doesn't overlap with any existing event
    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const columnEvents = columns[i];
      const overlaps = columnEvents.some(e => hasOverlap(e, event));
      if (!overlaps) {
        columnEvents.push(event);
        placed = true;
        break;
      }
    }
    
    // If no suitable column found, create a new one
    if (!placed) {
      columns.push([event]);
    }
  });
  
  // Assign layout information
  sorted.forEach(event => {
    const columnIndex = columns.findIndex(col => col.includes(event));
    layoutInfo.push({
      event,
      column: columnIndex,
      totalColumns: columns.length
    });
  });
  
  return layoutInfo;
};

// Time Utilities
export const formatTime = (date: Date, format24h: boolean = true): string => {
  return format24h 
    ? format(date, 'HH:mm', { locale: de })
    : format(date, 'h:mm a', { locale: de });
};

export const parseTimeString = (time: string): { hours: number, minutes: number } => {
  const [hours, minutes] = time.split(':').map(Number);
  return { hours, minutes };
};

export const roundToNextHour = (date: Date): Date => {
  const rounded = new Date(date);
  rounded.setMinutes(0, 0, 0);
  return addHours(rounded, 1);
};

export const getTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
};

export const formatEventTime = (event: CalendarEvent): string => {
  if (event.is_all_day) {
    return 'Ganztägig';
  }
  
  const start = new Date(event.start_datetime);
  const end = new Date(event.end_datetime);
  
  return `${formatTime(start)} - ${formatTime(end)}`;
};

export const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'business':
      return '#3b82f6'; // blue
    case 'personal':
      return '#10b981'; // green
    default:
      return '#8b5cf6'; // purple
  }
};

export const getCategoryLabel = (category: string): string => {
  switch (category) {
    case 'business':
      return 'Geschäftlich';
    case 'personal':
      return 'Privat';
    default:
      return 'Alle Termine';
  }
};
