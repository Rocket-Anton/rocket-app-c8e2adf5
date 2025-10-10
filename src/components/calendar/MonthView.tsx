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
              "py-2 px-3 text-center text-xs font-semibold text-muted-foreground bg-muted/50",
              index < 6 && "border-r"
            )}
          >
            {day}
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
                "min-h-[120px] border-t p-2 cursor-pointer transition-colors hover:bg-accent/50 relative",
                index % 7 < 6 && "border-r",
                !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                isTodayDate && "bg-blue-50/50 dark:bg-blue-950/20"
              )}
              onClick={() => onDayClick(day)}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={cn(
                    "text-sm font-semibold min-w-[24px] text-center",
                    isTodayDate && "bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center"
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="text-xs p-1.5 rounded-md truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: event.color + '25',
                      borderLeft: `3px solid ${event.color}`
                    }}
                  >
                    <span className="font-medium">{format(new Date(event.start_datetime), 'HH:mm')}</span> {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 px-1.5 font-medium">
                    +{dayEvents.length - 3} weitere
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
