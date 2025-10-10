import { useState, useMemo } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { useProjectContext } from "@/contexts/ProjectContext";
import { EventDialog } from "@/components/calendar/EventDialog";
import { CalendarContent } from "@/components/calendar/CalendarContent";
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/useEvents";
import { useUserRole } from "@/hooks/useUserRole";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSwipe } from "@/hooks/useSwipe";
import { CalendarEvent, getDaysInMonth } from "@/utils/calendar";
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays, format } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const prefersReduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  
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
  
  const isAdminLike = userRole === 'admin' || userRole === 'super_admin';

  // Fetch events with role-based filtering
  const { data: allEvents = [], isLoading } = useEvents(rangeStart, rangeEnd, {
    projectIds: selectedProjectIds && selectedProjectIds.size > 0 ? Array.from(selectedProjectIds) : undefined,
    userIds: isAdminLike && selectedUserIds.size > 0 ? Array.from(selectedUserIds) : undefined,
    showTeamEvents: userRole === 'project_manager' ? showTeamEvents : undefined
  });

  // Client-side filtering by event type
  const events = useMemo(() => {
    if (eventType === 'all') return allEvents;
    return allEvents.filter(e => e.category === eventType);
  }, [allEvents, eventType]);

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  // Fetch users (for admin and super_admin)
  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      if (!isAdminLike) return [];

      const { data } = await supabase
        .from('profiles')
        .select('id, name, color')
        .order('name');

      return data || [];
    },
    enabled: isAdminLike,
  });

  // Fetch projects (role-based)
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-calendar', userRole],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      if (isAdminLike) {
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

  const swipeHandlers = useSwipe(handleNext, handlePrevious);

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
        <SidebarInset className="p-0 m-0 border-0 min-w-0 transition-none lg:transition-all lg:duration-300 lg:ease-in-out">
          <MobileHeader 
            selectedProjectIds={selectedProjectIds}
            onProjectsChange={setSelectedProjectIds}
          />
          <CalendarContent
            selectedDate={selectedDate}
            viewMode={viewMode}
            setViewMode={setViewMode}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            eventType={eventType}
            setEventType={setEventType}
            events={events}
            isLoading={isLoading}
            userRole={userRole}
            isAdminLike={isAdminLike}
            users={users}
            projects={projects}
            selectedUserIds={selectedUserIds}
            setSelectedUserIds={setSelectedUserIds}
            selectedProjectIds={selectedProjectIds}
            setSelectedProjectIds={setSelectedProjectIds}
            showTeamEvents={showTeamEvents}
            setShowTeamEvents={setShowTeamEvents}
            getVisibleDateRange={getVisibleDateRange}
            handlePrevious={handlePrevious}
            handleNext={handleNext}
            handleCreateEvent={handleCreateEvent}
            handleDayClick={handleDayClick}
            handleEventClick={handleEventClick}
            handleTimeSlotClick={handleTimeSlotClick}
          />
          
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
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
