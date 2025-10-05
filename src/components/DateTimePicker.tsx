import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface DateTimePickerProps {
  date?: Date;
  hour: string;
  minute: string;
  onDateChange: (date: Date) => void;
  onHourChange: (hour: string) => void;
  onMinuteChange: (minute: string) => void;
}

export const DateTimePicker = ({
  date,
  hour,
  minute,
  onDateChange,
  onHourChange,
  onMinuteChange,
}: DateTimePickerProps) => {
  const [currentDate, setCurrentDate] = useState(date || new Date());
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth());
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());

  const monthNames = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Monday = 0

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const selectDate = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newDate >= today) {
      setCurrentDate(newDate);
      onDateChange(newDate);
    }
  };

  const incrementHour = () => {
    const h = parseInt(hour);
    const newHour = h >= 21 ? 8 : h + 1;
    onHourChange(newHour.toString().padStart(2, '0'));
  };

  const decrementHour = () => {
    const h = parseInt(hour);
    const newHour = h <= 8 ? 21 : h - 1;
    onHourChange(newHour.toString().padStart(2, '0'));
  };

  const incrementMinute = () => {
    const m = parseInt(minute);
    const newMinute = m >= 59 ? 0 : m + 1;
    onMinuteChange(newMinute.toString().padStart(2, '0'));
  };

  const decrementMinute = () => {
    const m = parseInt(minute);
    const newMinute = m <= 0 ? 59 : m - 1;
    onMinuteChange(newMinute.toString().padStart(2, '0'));
  };

  const isDateDisabled = (day: number) => {
    const testDate = new Date(viewYear, viewMonth, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return testDate < today;
  };

  const isSelected = (day: number) => {
    return currentDate.getDate() === day &&
           currentDate.getMonth() === viewMonth &&
           currentDate.getFullYear() === viewYear;
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Calendar */}
      <div className="bg-background rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevMonth}
            className="h-10 w-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-base font-semibold">
            {monthNames[viewMonth]} {viewYear}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            className="h-10 w-10"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs text-muted-foreground font-medium py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: adjustedFirstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(day => {
            const disabled = isDateDisabled(day);
            const selected = isSelected(day);
            return (
              <button
                key={day}
                onClick={() => !disabled && selectDate(day)}
                disabled={disabled}
                className={`
                  h-10 rounded-lg text-sm font-medium transition-colors
                  ${disabled ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover:bg-muted'}
                  ${selected ? 'bg-[#3B82F6] text-white hover:bg-[#2563EB]' : 'text-foreground'}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Picker */}
      <div className="bg-background rounded-lg p-6 border border-border">
        <div className="text-center font-semibold text-base mb-6">Uhrzeit</div>
        
        <div className="flex items-center justify-center gap-4">
          {/* Hour */}
          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={incrementHour}
              className="h-10 w-10 mb-2"
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
            <div className="text-3xl font-semibold w-16 text-center">{hour}</div>
            <div className="text-xs text-muted-foreground mt-1 mb-2">Stunde</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={decrementHour}
              className="h-10 w-10"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>

          <div className="text-3xl font-semibold mb-8">:</div>

          {/* Minute */}
          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={incrementMinute}
              className="h-10 w-10 mb-2"
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
            <div className="text-3xl font-semibold w-16 text-center">{minute}</div>
            <div className="text-xs text-muted-foreground mt-1 mb-2">Minute</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={decrementMinute}
              className="h-10 w-10"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          {hour}:{minute}
        </div>
      </div>
    </div>
  );
};
