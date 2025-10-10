import { memo } from "react";
import { CalendarEvent, filterEventsByDate } from "@/utils/calendar";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (hour: number) => void;
}

export const DayView = memo(({ currentDate, events, onEventClick, onTimeSlotClick }: DayViewProps) => {
  const dayEvents = filterEventsByDate(events, currentDate);
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 - 21:00

  return (
    <div className="bg-background rounded-lg border overflow-hidden">
      {/* Day header */}
      <div className="border-b p-4 sticky top-0 bg-background z-10">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">
            {format(currentDate, 'EEEE', { locale: de })}
          </div>
          <div className="text-2xl font-semibold mt-1">
            {format(currentDate, 'd. MMMM yyyy', { locale: de })}
          </div>
        </div>
      </div>

      {/* Time grid */}
      <div className="relative">
        {hours.map((hour) => {
          const hourEvents = dayEvents.filter(event => {
            const eventHour = new Date(event.start_datetime).getHours();
            return eventHour === hour;
          });

          return (
            <div 
              key={hour} 
              className="flex border-b min-h-[80px] cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => onTimeSlotClick(hour)}
            >
              <div className="w-20 border-r p-3 text-sm text-muted-foreground text-right font-medium">
                {hour}:00
              </div>
              <div className="flex-1 p-2 relative">
                {hourEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="mb-2 p-3 rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: event.color + '30',
                      borderLeft: `4px solid ${event.color}`
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{event.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(event.start_datetime), 'HH:mm')} - {format(new Date(event.end_datetime), 'HH:mm')}
                        </div>
                        {event.location && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <span className="text-xs">📍</span>
                            {event.location}
                          </div>
                        )}
                        {event.description && (
                          <div className="text-xs mt-2 text-muted-foreground line-clamp-2">
                            {event.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {hourEvents.length === 0 && (
                  <div className="text-xs text-muted-foreground/50 p-2">
                    Keine Termine
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
