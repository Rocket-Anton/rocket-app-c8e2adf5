import { getDaysInMonth, getWeekdayNames, isSameDayUtil, filterEventsByDate, CalendarEvent } from "@/utils/calendar";
import { format, isSameMonth, isToday } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export const MonthView = ({ currentDate, events, onDayClick, onEventClick }: MonthViewProps) => {
  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const weekdays = getWeekdayNames();

  return (
    <div className="bg-background rounded-lg border">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {weekdays.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = filterEventsByDate(events, day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);

          return (
            <div
              key={index}
              className={cn(
                "min-h-[100px] border-b border-r p-2 cursor-pointer transition-colors hover:bg-accent/50",
                !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                isTodayDate && "bg-blue-50 dark:bg-blue-950/20"
              )}
              onClick={() => onDayClick(day)}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isTodayDate && "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Event dots */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: event.color + '20',
                      borderLeft: `3px solid ${event.color}`
                    }}
                  >
                    {format(new Date(event.start_datetime), 'HH:mm')} {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{dayEvents.length - 3} mehr
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
