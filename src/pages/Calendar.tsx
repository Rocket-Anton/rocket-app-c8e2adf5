import { useState, useMemo } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { useProjectContext } from "@/contexts/ProjectContext";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { EventDialog } from "@/components/calendar/EventDialog";
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/useEvents";
import { useUserRole } from "@/hooks/useUserRole";
import { CalendarEvent, getDaysInMonth } from "@/utils/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Search, Calendar as CalendarIcon } from "lucide-react";
import { UserMultiSelect } from "@/components/calendar/UserMultiSelect";
import { ProjectMultiSelect } from "@/components/calendar/ProjectMultiSelect";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ViewMode = 'month' | 'week' | 'day';

export default function Calendar() {
  const { selectedProjectIds, setSelectedProjectIds } = useProjectContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showTeamEvents, setShowTeamEvents] = useState(true);
  const [eventType, setEventType] = useState<'all' | 'private' | 'business'>('all');

  const { data: userRole } = useUserRole();
  
  // Calculate visible date range for display
  const getVisibleDateRange = () => {
    const days = getDaysInMonth(selectedDate.getFullYear(), selectedDate.getMonth());
    return `${format(days[0], 'd. MMM', { locale: de })} - ${format(days[days.length - 1], 'd. MMM', { locale: de })}`;
  };

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
  
  // Fetch events with role-based filtering
  const { data: events = [], isLoading } = useEvents(rangeStart, rangeEnd, {
    projectIds: selectedProjectIds && selectedProjectIds.size > 0 ? Array.from(selectedProjectIds) : undefined,
    userIds: userRole === 'admin' && selectedUserIds.size > 0 ? Array.from(selectedUserIds) : undefined,
    showTeamEvents: userRole === 'project_manager' ? showTeamEvents : undefined
  });

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  // Fetch users (for admin)
  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      if (userRole !== 'admin') return [];

      const { data } = await supabase
        .from('profiles')
        .select('id, name, color')
        .order('name');

      return data || [];
    },
    enabled: userRole === 'admin',
  });

  // Fetch projects (role-based)
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-calendar', userRole],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      if (userRole === 'admin') {
        const { data } = await supabase
          .from('projects')
          .select('id, name, provider_id, providers(color)')
          .order('name');
        return data || [];
      }

      if (userRole === 'project_manager') {
        const { data } = await supabase
          .from('projects')
          .select('id, name, provider_id, providers(color)')
          .eq('project_manager_id', user.id)
          .order('name');
        return data || [];
      }

      if (userRole === 'rocket') {
        const { data: projectRockets } = await supabase
          .from('project_rockets')
          .select('project_id, projects(id, name, provider_id, providers(color))')
          .eq('user_id', user.id);

        return projectRockets?.map(pr => pr.projects).filter(Boolean).flat() || [];
      }

      return [];
    },
    enabled: !!userRole,
  });

  const handlePrevious = () => {
    switch (viewMode) {
      case 'month':
        setSelectedDate(subMonths(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(subWeeks(selectedDate, 1));
        break;
      case 'day':
        setSelectedDate(subDays(selectedDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'month':
        setSelectedDate(addMonths(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(addWeeks(selectedDate, 1));
        break;
      case 'day':
        setSelectedDate(addDays(selectedDate, 1));
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

  const handleTimeSlotClick = (date: Date, hour?: number) => {
    const newDate = new Date(date);
    if (hour !== undefined) {
      newDate.setHours(hour, 0, 0, 0);
    }
    setSelectedDate(newDate);
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
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-muted/30 gap-0 overflow-hidden" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset className="p-0 m-0 border-0 transition-none lg:transition-all lg:duration-300 lg:ease-in-out">
          <MobileHeader 
            selectedProjectIds={selectedProjectIds}
            onProjectsChange={setSelectedProjectIds}
          />
          <div className="relative h-full flex flex-col overflow-hidden">
            {/* Title and Search - Outside Calendar Card */}
            <div className="px-4 py-3 flex items-center justify-between">
              <h1 className="text-2xl font-bold">Kalender</h1>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Termine durchsuchen..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Event Type Filter - Outside Calendar Card */}
            <div className="mx-4 px-4 py-1.5 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEventType('all')}
                className={cn(
                  "h-7 rounded px-2.5 text-xs font-medium",
                  eventType === 'all' 
                    ? "bg-muted/50 text-foreground" 
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                )}
              >
                Alle Events
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEventType('private')}
                className={cn(
                  "h-7 rounded px-2.5 text-xs font-medium",
                  eventType === 'private' 
                    ? "bg-muted/50 text-foreground" 
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                )}
              >
                Privat
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEventType('business')}
                className={cn(
                  "h-7 rounded px-2.5 text-xs font-medium",
                  eventType === 'business' 
                    ? "bg-muted/50 text-foreground" 
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                )}
              >
                Geschäftlich
              </Button>
            </div>

            {/* Calendar Card with integrated Header */}
            <div className="mx-4 rounded-xl border bg-card overflow-hidden flex flex-col flex-1">
              {/* Header Controls */}
              <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4">
                {/* Left: Date Badge + Month Info */}
                <div className="flex items-center gap-3">
                  {/* Date Badge */}
                  <div className="flex flex-col items-center justify-center bg-muted/40 border rounded-md p-2 min-w-[56px]">
                    <div className="text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {format(selectedDate, 'MMM', { locale: de }).toUpperCase()}
                    </div>
                    <div className="text-2xl font-bold leading-none text-foreground mt-0.5">
                      {format(selectedDate, 'd')}
                    </div>
                  </div>

                  {/* Month & Period */}
                  <div className="flex flex-col">
                    <div className="text-base font-semibold leading-tight">
                      {format(selectedDate, 'MMMM yyyy', { locale: de })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {getVisibleDateRange()}
                    </div>
                  </div>
                </div>

                {/* Right: Filters + Controls */}
                <div className="flex items-center gap-2">
                  {userRole === 'admin' && (
                    <UserMultiSelect
                      users={users}
                      selectedUserIds={selectedUserIds}
                      onSelectionChange={setSelectedUserIds}
                    />
                  )}

                  {projects.length > 0 && (
                    <ProjectMultiSelect
                      projects={projects}
                      selectedProjectIds={selectedProjectIds}
                      onSelectionChange={setSelectedProjectIds}
                    />
                  )}

                  {userRole === 'project_manager' && (
                    <Select value={showTeamEvents ? 'team' : 'own'} onValueChange={(v) => setShowTeamEvents(v === 'team')}>
                      <SelectTrigger className="h-8 rounded-md bg-muted/40 border border-input text-sm px-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="own">Eigene</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {/* Navigation Arrows */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      className="h-8 w-8 p-0 rounded-md border-muted-foreground/20 shadow-sm hover:shadow"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      className="h-8 w-8 p-0 rounded-md border-muted-foreground/20 shadow-sm hover:shadow"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* View Mode Select */}
                  <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                    <SelectTrigger className="h-8 w-[130px] rounded-md bg-muted/40 border border-input text-sm px-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monat</SelectItem>
                      <SelectItem value="week">Woche</SelectItem>
                      <SelectItem value="day">Tag</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Create Event Button */}
                  <Button 
                    onClick={handleCreateEvent} 
                    size="sm"
                    className="h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    <span>Neuer Termin</span>
                  </Button>
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
                    <WeekView
                      currentDate={selectedDate}
                      events={events}
                      onEventClick={handleEventClick}
                      onTimeSlotClick={handleTimeSlotClick}
                    />
                  )}
                  {viewMode === 'day' && (
                    <DayView
                      currentDate={selectedDate}
                      events={events}
                      onEventClick={handleEventClick}
                      onTimeSlotClick={(hour) => handleTimeSlotClick(selectedDate, hour)}
                    />
                  )}
                </>
              )}
              </div>
            </div>

            {/* Event Dialog */}
            <EventDialog
              open={showEventDialog}
              onOpenChange={setShowEventDialog}
              event={selectedEvent}
              defaultDate={selectedDate}
              onSave={handleSaveEvent}
              onDelete={selectedEvent ? handleDeleteEvent : undefined}
              projectFilter={selectedProjectIds && selectedProjectIds.size > 0 ? Array.from(selectedProjectIds) : undefined}
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
