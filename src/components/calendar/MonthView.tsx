import { memo } from "react";
import { getDaysInMonth, getWeekdayNames, filterEventsByDate, CalendarEvent } from "@/utils/calendar";
import { format, isSameMonth, isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export const MonthView = memo(({ currentDate, events, onDayClick, onEventClick }: MonthViewProps) => {
  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const weekdays = getWeekdayNames();

  return (
    <div className="bg-background rounded-lg border overflow-hidden shadow-sm w-full pr-px sm:pr-0">
      {/* Weekday headers - integrated with grid */}
      <div className="grid grid-cols-7 w-full min-w-0">
        {weekdays.map((day, index) => (
          <div
            key={day}
            className={cn(
              "relative py-1.5 px-0.5 sm:py-2 sm:px-3 text-center text-[9px] sm:text-xs font-semibold text-muted-foreground bg-muted/50",
              index < 6 && 'after:content-[""] after:absolute after:top-0 after:bottom-0 after:right-0 after:w-px after:bg-border'
            )}
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 2)}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid - vertical lines go through weekday headers */}
      <div className="grid grid-cols-7 w-full min-w-0 overflow-x-hidden">
        {days.map((day, index) => {
          const dayEvents = filterEventsByDate(events, day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);

          return (
            <div
              key={index}
              className={cn(
                "relative min-h-[75px] sm:min-h-[100px] lg:min-h-[120px] border-t p-0.5 sm:p-2 cursor-pointer transition-colors hover:bg-accent/50",
                index % 7 < 6 && 'after:content-[""] after:absolute after:top-0 after:bottom-0 after:right-0 after:w-px after:bg-border',
                !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                isTodayDate && "bg-blue-50/50 dark:bg-blue-950/20"
              )}
              onClick={() => onDayClick(day)}
            >
              <div className="flex items-center justify-between mb-0.5 sm:mb-2">
                <span
                  className={cn(
                    "text-[11px] sm:text-sm font-semibold min-w-[18px] sm:min-w-[24px] text-center",
                    isTodayDate && "bg-blue-600 text-white rounded-full w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-sm"
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-0.5 sm:space-y-1">
                {dayEvents.slice(0, window.innerWidth < 640 ? 2 : 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="text-[9px] sm:text-xs p-0.5 sm:p-1.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: event.color + '25',
                      borderLeft: `2px solid ${event.color}`
                    }}
                  >
                    <span className="font-medium hidden sm:inline">{format(new Date(event.start_datetime), 'HH:mm')} </span>
                    <span className="sm:hidden">• </span>
                    <span className="truncate">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > (window.innerWidth < 640 ? 2 : 3) && (
                  <div className="text-[9px] sm:text-xs text-blue-600 dark:text-blue-400 px-0.5 sm:px-1.5 font-medium">
                    +{dayEvents.length - (window.innerWidth < 640 ? 2 : 3)}
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
