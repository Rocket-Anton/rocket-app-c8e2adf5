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

export const WeekView = ({ currentDate, events, onEventClick, onTimeSlotClick }: WeekViewProps) => {
  const weekDays = getWeekDays(currentDate);
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 - 21:00

  return (
    <div className="bg-background rounded-lg border overflow-hidden">
      {/* Week header */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b sticky top-0 bg-background z-10">
        <div className="border-r" />
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="p-3 text-center border-r last:border-r-0">
            <div className="text-sm font-medium">
              {format(day, 'EEE', { locale: de })}
            </div>
            <div className={cn(
              "text-lg font-semibold mt-1",
              format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && "text-blue-600"
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="relative">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] border-b min-h-[60px]">
            <div className="border-r p-2 text-sm text-muted-foreground text-right">
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
                  className="border-r last:border-r-0 p-1 cursor-pointer hover:bg-accent/30 transition-colors relative"
                  onClick={() => onTimeSlotClick(day, hour)}
                >
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className="absolute left-1 right-1 p-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity z-10"
                      style={{
                        backgroundColor: event.color + '40',
                        borderLeft: `3px solid ${event.color}`,
                        top: `${(new Date(event.start_datetime).getMinutes() / 60) * 100}%`,
                        height: `${((new Date(event.end_datetime).getTime() - new Date(event.start_datetime).getTime()) / (60 * 60 * 1000)) * 100}%`,
                        minHeight: '30px'
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-[10px] opacity-75">
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
};
