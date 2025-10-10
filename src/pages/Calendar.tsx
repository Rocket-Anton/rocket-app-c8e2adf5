import { useState } from "react";
import { MonthView } from "@/components/calendar/MonthView";
import { EventDialog } from "@/components/calendar/EventDialog";
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/useEvents";
import { CalendarEvent, formatDateRange, getCategoryLabel } from "@/utils/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale";

type ViewMode = 'month' | 'week' | 'day';
type CategoryFilter = 'all' | 'business' | 'personal';

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Calculate date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'month': {
        const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
        return { start, end };
      }
      case 'week': {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return { start, end };
      }
      case 'day': {
        return { start: selectedDate, end: selectedDate };
      }
    }
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();
  
  // Fetch events
  const { data: events = [], isLoading } = useEvents(rangeStart, rangeEnd, categoryFilter);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const handlePrevious = () => {
    switch (viewMode) {
      case 'month':
        setSelectedDate(subMonths(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(new Date(selectedDate.getTime() - 7 * 24 * 60 * 60 * 1000));
        break;
      case 'day':
        setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'month':
        setSelectedDate(addMonths(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000));
        break;
      case 'day':
        setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
        break;
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowEventDialog(true);
  };

  const handleSaveEvent = (eventData: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (selectedEvent) {
      updateEvent.mutate({ id: selectedEvent.id, ...eventData });
    } else {
      createEvent.mutate(eventData);
    }
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent.mutate(id);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="p-4 space-y-4">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Kalender</h1>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <Tabs value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
            <TabsList>
              <TabsTrigger value="all">Alle Termine</TabsTrigger>
              <TabsTrigger value="business">Geschäftlich</TabsTrigger>
              <TabsTrigger value="personal">Privat</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Date header and controls */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">
                {format(selectedDate, 'MMMM yyyy', { locale: de })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatDateRange(rangeStart, rangeEnd)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                onClick={handleToday}
              >
                Heute
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monat</SelectItem>
                  <SelectItem value="week">Woche</SelectItem>
                  <SelectItem value="day">Tag</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleCreateEvent} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Termin erstellen
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Lädt Termine...</div>
          </div>
        ) : (
          <>
            {viewMode === 'month' && (
              <MonthView
                currentDate={selectedDate}
                events={events}
                onDayClick={handleDayClick}
                onEventClick={handleEventClick}
              />
            )}
            {viewMode === 'week' && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Wochenansicht (wird noch implementiert)
              </div>
            )}
            {viewMode === 'day' && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Tagesansicht (wird noch implementiert)
              </div>
            )}
          </>
        )}
      </div>

      {/* Event Dialog */}
      <EventDialog
        open={showEventDialog}
        onOpenChange={setShowEventDialog}
        event={selectedEvent}
        defaultDate={selectedDate}
        onSave={handleSaveEvent}
        onDelete={selectedEvent ? handleDeleteEvent : undefined}
      />
    </div>
  );
}
