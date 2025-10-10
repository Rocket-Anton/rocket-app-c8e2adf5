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
    <div className="bg-background rounded-lg border w-full h-full min-h-0 flex flex-col overflow-hidden">
      {/* Week header */}
      <div className="grid grid-cols-[52px_1fr] sm:grid-cols-[64px_1fr] border-b sticky top-0 bg-background z-10 shrink-0">
        {/* Empty corner for time column */}
        <div className="border-r sticky left-0 bg-background z-20" />
        
        {/* 7 Days - NO overflow-x */}
        <div className="grid grid-cols-7 overflow-x-hidden">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-1.5 sm:p-2 text-center border-r last:border-r-0">
              <div className="text-[10px] sm:text-xs font-medium">
                {format(day, 'EEE', { locale: de })}
              </div>
              <div className={cn(
                "text-sm sm:text-base font-semibold mt-0.5",
                format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && "text-blue-600"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time grid - vertical scroll only */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[52px_1fr] sm:grid-cols-[64px_1fr] border-b min-h-[48px] sm:min-h-[56px]">
            {/* Time column - sticky left */}
            <div className="border-r p-1.5 sm:p-2 text-[11px] sm:text-sm text-muted-foreground text-right sticky left-0 bg-background z-10">
              {hour}:00
            </div>
            
            {/* 7 Day columns */}
            <div className="grid grid-cols-7">
              {weekDays.map((day) => {
                const dayEvents = filterEventsByDate(events, day).filter(event => {
                  const eventHour = new Date(event.start_datetime).getHours();
                  return eventHour === hour;
                });

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="border-r last:border-r-0 p-0.5 sm:p-1 cursor-pointer hover:bg-accent/30 transition-colors relative"
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
          </div>
        ))}
      </div>
    </div>
  );
});
