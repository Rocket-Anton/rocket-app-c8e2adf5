import { Dispatch, SetStateAction } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { UserMultiSelect } from "@/components/calendar/UserMultiSelect";
import { ProjectMultiSelect } from "@/components/calendar/ProjectMultiSelect";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarEvent } from "@/utils/calendar";

type ViewMode = 'month' | 'week' | 'day';

interface CalendarContentProps {
  selectedDate: Date;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  eventType: 'all' | 'private' | 'business';
  setEventType: Dispatch<SetStateAction<'all' | 'private' | 'business'>>;
  events: CalendarEvent[];
  isLoading: boolean;
  userRole: string | undefined;
  isAdminLike: boolean;
  users: any[];
  projects: any[];
  selectedUserIds: Set<string>;
  setSelectedUserIds: Dispatch<SetStateAction<Set<string>>>;
  selectedProjectIds: Set<string>;
  setSelectedProjectIds: Dispatch<SetStateAction<Set<string>>>;
  showTeamEvents: boolean;
  setShowTeamEvents: Dispatch<SetStateAction<boolean>>;
  getVisibleDateRange: () => string;
  handlePrevious: () => void;
  handleNext: () => void;
  handleCreateEvent: () => void;
  handleDayClick: (date: Date) => void;
  handleEventClick: (event: CalendarEvent) => void;
  handleTimeSlotClick: (date: Date, hour?: number) => void;
}

export const CalendarContent = ({
  selectedDate,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  eventType,
  setEventType,
  events,
  isLoading,
  userRole,
  isAdminLike,
  users,
  projects,
  selectedUserIds,
  setSelectedUserIds,
  selectedProjectIds,
  setSelectedProjectIds,
  showTeamEvents,
  setShowTeamEvents,
  getVisibleDateRange,
  handlePrevious,
  handleNext,
  handleCreateEvent,
  handleDayClick,
  handleEventClick,
  handleTimeSlotClick,
}: CalendarContentProps) => {
  const { open: sidebarOpen } = useSidebar();
  
  // Determine if we should show full text based on sidebar state
  // When sidebar is collapsed (sidebarOpen=false), we have more space
  const showFullText = !sidebarOpen;
  
  return (
    <div className="relative h-full flex flex-col overflow-hidden min-h-0">
      {/* Title and Search - Outside Calendar Card */}
      <div className="px-2 sm:px-4 py-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Kalender</h1>
        <div className="relative w-full lg:max-w-sm">
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
      <div className="mx-2 sm:mx-4 px-2 sm:px-4 py-1.5 flex overflow-x-auto">
        <div
          className="inline-flex p-0.5 rounded-md border bg-[#F5F5F5] border-[#E5E7EB] shadow-[0_1px_1px_rgba(0,0,0,0.04)] w-full lg:w-auto"
          role="tablist"
          aria-label="Event-Filter"
        >
          <button
            type="button"
            role="tab"
            aria-selected={eventType === 'all'}
            onClick={() => setEventType('all')}
            className={cn(
              "px-3 h-8 rounded-md text-[13px] leading-5 font-medium transition-all duration-150 flex-1 lg:flex-none",
              "outline-none focus:outline-none select-none",
              eventType === 'all'
                ? "text-[#111827] bg-white border border-[#E5E7EB] shadow-[0_1px_1px_rgba(0,0,0,0.06)]"
                : "text-[#111827]/70 bg-transparent hover:bg-black/5"
            )}
          >
            Alle
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={eventType === 'private'}
            onClick={() => setEventType('private')}
            className={cn(
              "px-3 h-8 rounded-md text-[13px] leading-5 font-medium transition-all duration-150 flex-1 lg:flex-none",
              "outline-none focus:outline-none select-none",
              eventType === 'private'
                ? "text-[#111827] bg-white border border-[#E5E7EB] shadow-[0_1px_1px_rgba(0,0,0,0.06)]"
                : "text-[#111827]/70 bg-transparent hover:bg-black/5"
            )}
          >
            Privat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={eventType === 'business'}
            onClick={() => setEventType('business')}
            className={cn(
              "px-3 h-8 rounded-md text-[13px] leading-5 font-medium transition-all duration-150 flex-1 lg:flex-none",
              "outline-none focus:outline-none select-none",
              eventType === 'business'
                ? "text-[#111827] bg-white border border-[#E5E7EB] shadow-[0_1px_1px_rgba(0,0,0,0.06)]"
                : "text-[#111827]/70 bg-transparent hover:bg-black/5"
            )}
          >
            Geschäftlich
          </button>
        </div>
      </div>

      {/* Calendar Card with integrated Header */}
      <div className="mx-2 sm:mx-4 rounded-xl border bg-card overflow-hidden flex flex-col flex-1 min-h-0 pb-[env(safe-area-inset-bottom,0)]">
        {/* Header Controls */}
        <div className="border-b px-2 sm:px-4 py-2 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4">
          {/* Left: Date Badge + Month Info */}
          <div className="flex items-center gap-3 w-full lg:w-auto flex-shrink-0">
            {/* Date Badge */}
            <div className="flex flex-col items-center justify-center bg-muted/40 border rounded-md p-2 min-w-[48px] lg:min-w-[56px] flex-shrink-0">
              <div className="text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
                {format(selectedDate, 'MMM', { locale: de }).toUpperCase()}
              </div>
              <div className="text-xl lg:text-2xl font-bold leading-none text-foreground mt-0.5">
                {format(selectedDate, 'd')}
              </div>
            </div>

            {/* Month & Period */}
            <div className="flex flex-col flex-1 min-w-[120px]">
              <div className="text-sm lg:text-base font-semibold leading-tight whitespace-nowrap">
                {format(selectedDate, 'MMMM yyyy', { locale: de })}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 hidden sm:block whitespace-nowrap">
                {getVisibleDateRange()}
              </div>
            </div>

            {/* Mobile: View Mode & Navigation */}
            <div className="flex items-center gap-1 lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                className="h-8 w-8 p-0 rounded-md border-muted-foreground/20"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                className="h-8 w-8 p-0 rounded-md border-muted-foreground/20"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right: Filters + Controls (Desktop) */}
          <div className="hidden lg:flex items-center gap-2 justify-end flex-nowrap transition-all duration-300">
            {isAdminLike && (
              <div className={cn(
                "transition-all duration-300",
                showFullText ? "" : "lg:[&_span]:hidden xl:[&_span]:inline"
              )}>
                <UserMultiSelect
                  users={users}
                  selectedUserIds={selectedUserIds}
                  onSelectionChange={setSelectedUserIds}
                />
              </div>
            )}

            {projects.length > 0 && (
              <div className={cn(
                "transition-all duration-300",
                showFullText ? "" : "lg:[&_span]:hidden xl:[&_span]:inline"
              )}>
                <ProjectMultiSelect
                  projects={projects}
                  selectedProjectIds={selectedProjectIds}
                  onSelectionChange={setSelectedProjectIds}
                />
              </div>
            )}

            {userRole === 'project_manager' && (
              <Select value={showTeamEvents ? 'team' : 'own'} onValueChange={(v) => setShowTeamEvents(v === 'team')}>
                <SelectTrigger className="h-8 rounded-md bg-muted/40 border border-input text-sm px-3 transition-all duration-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Eigene</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Navigation Arrows - Show after filters when sidebar is open */}
            {!showFullText && (
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
            )}

            {/* View Mode Select */}
            <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
              <SelectTrigger className={cn(
                "h-8 rounded-md bg-muted/40 border border-input text-sm px-3 transition-all duration-300",
                showFullText ? "w-[130px]" : "w-[100px] xl:w-[130px]"
              )}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monat</SelectItem>
                <SelectItem value="week">Woche</SelectItem>
                <SelectItem value="day">Tag</SelectItem>
              </SelectContent>
            </Select>

            {/* Navigation Arrows - Show before "Neuer Termin" when sidebar is closed */}
            {showFullText && (
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
            )}

            {/* Create Event Button */}
            <Button 
              onClick={handleCreateEvent} 
              size="sm"
              className="h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap transition-all duration-300"
            >
              <Plus className="h-4 w-4" />
              {showFullText && <span className="ml-1">Neuer Termin</span>}
            </Button>
          </div>

          {/* Mobile: Filters Row */}
          <div className="flex lg:hidden items-center gap-2 w-full overflow-x-auto pb-1">
            {/* Spacer für Rechts-Ausrichtung */}
            <div className="flex-1" />
            
            {/* Alles nach rechts: Raketen, Projekte, Woche, neuer Termin */}
            <div className="flex items-center gap-2">
              {isAdminLike && (
                <div className="[&_span]:hidden">
                  <UserMultiSelect
                    users={users}
                    selectedUserIds={selectedUserIds}
                    onSelectionChange={setSelectedUserIds}
                  />
                </div>
              )}

              {projects.length > 0 && (
                <div className="[&_span]:hidden">
                  <ProjectMultiSelect
                    projects={projects}
                    selectedProjectIds={selectedProjectIds}
                    onSelectionChange={setSelectedProjectIds}
                  />
                </div>
              )}

              {userRole === 'project_manager' && (
                <Select value={showTeamEvents ? 'team' : 'own'} onValueChange={(v) => setShowTeamEvents(v === 'team')}>
                  <SelectTrigger className="h-8 rounded-md bg-muted/40 border border-input text-sm px-3 min-w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own">Eigene</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                <SelectTrigger className="h-8 w-[95px] rounded-md bg-muted/40 border border-input text-sm px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monat</SelectItem>
                  <SelectItem value="week">Woche</SelectItem>
                  <SelectItem value="day">Tag</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                onClick={handleCreateEvent} 
                size="sm"
                className="h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden md:inline">Termin</span>
              </Button>
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
    </div>
  );
};
