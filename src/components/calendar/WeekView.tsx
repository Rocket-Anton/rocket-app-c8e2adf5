import { memo } from "react";
import { CalendarEvent, filterEventsByDate, getWeekDays, layoutOverlappingEvents } from "@/utils/calendar";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
}

export const WeekView = memo(({ currentDate, events, onEventClick, onTimeSlotClick }: WeekViewProps) => {
  const weekDays = getWeekDays(currentDate);
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 - 21:00

  return (
    <div className="bg-background rounded-lg border overflow-hidden w-full min-w-0 h-full">
      {/* Week header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] sm:grid-cols-[80px_repeat(7,1fr)] border-b sticky top-0 bg-background z-10 overflow-x-auto">
        <div className="border-r" />
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="p-2 sm:p-3 text-center border-r last:border-r-0 min-w-[60px] sm:min-w-[80px]">
            <div className="text-[10px] sm:text-sm font-medium">
              {format(day, 'EEE', { locale: de })}
            </div>
            <div className={cn(
              "text-base sm:text-lg font-semibold mt-0.5 sm:mt-1",
              format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && "text-blue-600"
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="relative overflow-x-auto">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] sm:grid-cols-[80px_repeat(7,1fr)] border-b min-h-[50px] sm:min-h-[60px]">
            <div className="border-r p-1 sm:p-2 text-xs sm:text-sm text-muted-foreground text-right">
              {hour}:00
            </div>
            {weekDays.map((day) => {
              const dayEvents = filterEventsByDate(events, day).filter(event => {
                const eventHour = new Date(event.start_datetime).getHours();
                return eventHour === hour;
              });

              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="border-r last:border-r-0 p-0.5 sm:p-1 cursor-pointer hover:bg-accent/30 transition-colors relative min-w-[60px] sm:min-w-[80px]"
                  onClick={() => onTimeSlotClick(day, hour)}
                >
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className="absolute left-0.5 right-0.5 sm:left-1 sm:right-1 p-0.5 sm:p-1 rounded text-[10px] sm:text-xs cursor-pointer hover:opacity-80 transition-opacity z-10"
                      style={{
                        backgroundColor: event.color + '40',
                        borderLeft: `2px solid ${event.color}`,
                        top: `${(new Date(event.start_datetime).getMinutes() / 60) * 100}%`,
                        height: `${((new Date(event.end_datetime).getTime() - new Date(event.start_datetime).getTime()) / (60 * 60 * 1000)) * 100}%`,
                        minHeight: '25px'
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-[9px] sm:text-[10px] opacity-75 hidden sm:block">
                        {format(new Date(event.start_datetime), 'HH:mm')} - {format(new Date(event.end_datetime), 'HH:mm')}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});
