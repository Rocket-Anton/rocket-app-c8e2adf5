import { useState } from "react";
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
import { CalendarEvent } from "@/utils/calendar";
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

  const { data: userRole } = useUserRole();

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
            {/* Header - Complete Redesign */}
            <div className="bg-card border-b">
              <div className="p-3 lg:p-4 space-y-3">
                {/* Top bar: Title + Search */}
                <div className="flex items-center justify-between gap-4">
                  <h1 className="text-xl lg:text-2xl font-semibold">Kalender</h1>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Suchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-8 text-sm rounded-xl w-full"
                    />
                  </div>
                </div>

                {/* Controls bar */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                  {/* Left: Date card + Navigation */}
                  <div className="flex items-center gap-3">
                    {/* Date Card */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-2 min-w-[56px] text-center shadow-sm">
                      <div className="text-[10px] font-medium uppercase opacity-90">
                        {format(new Date(), 'MMM', { locale: de })}
                      </div>
                      <div className="text-2xl font-bold leading-none">
                        {format(new Date(), 'd')}
                      </div>
                    </div>

                    {/* Month/Period Display */}
                    <div className="hidden lg:block">
                      <div className="text-base font-semibold">
                        {format(selectedDate, 'MMMM yyyy', { locale: de })}
                      </div>
                    </div>

                    {/* Navigation Buttons - Connected group */}
                    <div className="flex items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevious}
                        className="h-8 rounded-r-none border-r-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToday}
                        className="h-8 rounded-none px-3"
                      >
                        Heute
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNext}
                        className="h-8 rounded-l-none border-l-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Right: Filters + View Mode + Create */}
                  <div className="flex items-center gap-2 w-full lg:w-auto">
                    {/* Admin: User Multi-Filter */}
                    {userRole === 'admin' && (
                      <UserMultiSelect
                        users={users}
                        selectedUserIds={selectedUserIds}
                        onSelectionChange={setSelectedUserIds}
                      />
                    )}

                    {/* Project Multi-Filter */}
                    {projects.length > 0 && (
                      <ProjectMultiSelect
                        projects={projects}
                        selectedProjectIds={selectedProjectIds}
                        onSelectionChange={setSelectedProjectIds}
                      />
                    )}

                    {/* Project Manager: Team Toggle */}
                    {userRole === 'project_manager' && (
                      <Select value={showTeamEvents ? 'team' : 'own'} onValueChange={(v) => setShowTeamEvents(v === 'team')}>
                        <SelectTrigger className="h-8 rounded-xl w-full lg:w-[120px] text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="own">Eigene</SelectItem>
                          <SelectItem value="team">Team</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {/* View Mode Selector */}
                    <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                      <SelectTrigger className="h-8 rounded-xl w-full lg:w-[110px] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Monat</SelectItem>
                        <SelectItem value="week">Woche</SelectItem>
                        <SelectItem value="day">Tag</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Create Button */}
                    <Button 
                      onClick={handleCreateEvent} 
                      size="sm"
                      className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 lg:mr-1" />
                      <span className="hidden lg:inline">Termin</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar content */}
            <div className="flex-1 overflow-auto p-3 lg:p-4">
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
