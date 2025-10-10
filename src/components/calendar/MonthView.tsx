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
    <div className="bg-background rounded-xl border overflow-hidden shadow-sm">
      {/* Weekday headers - integrated with grid */}
      <div className="grid grid-cols-7">
        {weekdays.map((day, index) => (
          <div
            key={day}
            className={cn(
              "py-2 px-1 sm:px-3 text-center text-[10px] sm:text-xs font-semibold text-muted-foreground bg-muted/50",
              index < 6 && "border-r"
            )}
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 2)}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid - vertical lines go through weekday headers */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = filterEventsByDate(events, day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);

          return (
            <div
              key={index}
              className={cn(
                "min-h-[80px] sm:min-h-[100px] lg:min-h-[120px] border-t p-1 sm:p-2 cursor-pointer transition-colors hover:bg-accent/50 relative",
                index % 7 < 6 && "border-r",
                !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                isTodayDate && "bg-blue-50/50 dark:bg-blue-950/20"
              )}
              onClick={() => onDayClick(day)}
            >
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span
                  className={cn(
                    "text-xs sm:text-sm font-semibold min-w-[20px] sm:min-w-[24px] text-center",
                    isTodayDate && "bg-blue-600 text-white rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center"
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
                    className="text-[10px] sm:text-xs p-1 sm:p-1.5 rounded-md truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: event.color + '25',
                      borderLeft: `2px solid ${event.color}`
                    }}
                  >
                    <span className="font-medium hidden sm:inline">{format(new Date(event.start_datetime), 'HH:mm')} </span>
                    <span className="sm:hidden">• </span>
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > (window.innerWidth < 640 ? 2 : 3) && (
                  <div className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 px-1 sm:px-1.5 font-medium">
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
