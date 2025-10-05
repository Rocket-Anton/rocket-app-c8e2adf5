import { useEffect, useRef, useState } from "react";

interface TimePickerProps {
  hour: string;
  minute: string;
  onHourChange: (hour: string) => void;
  onMinuteChange: (minute: string) => void;
}

export const TimePicker = ({ hour, minute, onHourChange, onMinuteChange }: TimePickerProps) => {
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const [isDraggingHour, setIsDraggingHour] = useState(false);
  const [isDraggingMinute, setIsDraggingMinute] = useState(false);

  const hours = Array.from({ length: 14 }, (_, i) => (i + 8).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const ITEM_HEIGHT = 48;

  const scrollToValue = (container: HTMLDivElement | null, value: string, items: string[]) => {
    if (!container) return;
    const index = items.findIndex(item => item === value);
    if (index !== -1) {
      container.scrollTop = index * ITEM_HEIGHT;
    }
  };

  useEffect(() => {
    scrollToValue(hourRef.current, hour, hours);
  }, []);

  useEffect(() => {
    scrollToValue(minuteRef.current, minute, minutes);
  }, []);

  const handleScroll = (
    e: React.UIEvent<HTMLDivElement>,
    items: string[],
    onChange: (value: string) => void,
    setDragging: (dragging: boolean) => void
  ) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    
    if (!isDraggingHour && !isDraggingMinute) {
      onChange(items[clampedIndex]);
      // Snap to position
      container.scrollTop = clampedIndex * ITEM_HEIGHT;
    }
  };

  const handleScrollEnd = (
    container: HTMLDivElement | null,
    items: string[],
    onChange: (value: string) => void
  ) => {
    if (!container) return;
    const scrollTop = container.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    onChange(items[clampedIndex]);
    container.scrollTop = clampedIndex * ITEM_HEIGHT;
  };

  return (
    <div className="flex items-center justify-center gap-2 bg-muted/50 rounded-lg p-6 h-[200px]">
      {/* Hours */}
      <div className="relative h-full flex-1">
        <div 
          ref={hourRef}
          className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
          onScroll={(e) => handleScroll(e, hours, onHourChange, setIsDraggingHour)}
          onMouseDown={() => setIsDraggingHour(true)}
          onMouseUp={() => {
            setIsDraggingHour(false);
            handleScrollEnd(hourRef.current, hours, onHourChange);
          }}
          onTouchStart={() => setIsDraggingHour(true)}
          onTouchEnd={() => {
            setIsDraggingHour(false);
            handleScrollEnd(hourRef.current, hours, onHourChange);
          }}
          style={{ 
            paddingTop: `${ITEM_HEIGHT * 2}px`, 
            paddingBottom: `${ITEM_HEIGHT * 2}px`,
          }}
        >
          {hours.map((h) => (
            <div
              key={h}
              className="snap-center flex items-center justify-center transition-all duration-200"
              style={{ 
                height: `${ITEM_HEIGHT}px`,
                fontSize: h === hour ? '2.5rem' : '1.5rem',
                color: h === hour ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                opacity: h === hour ? 1 : 0.3,
                fontWeight: h === hour ? 600 : 400,
              }}
            >
              {h}
            </div>
          ))}
        </div>
        {/* Center highlight line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[48px] pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-border"></div>
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-border"></div>
        </div>
      </div>

      {/* Separator */}
      <div className="text-3xl font-semibold text-muted-foreground">:</div>

      {/* Minutes */}
      <div className="relative h-full flex-1">
        <div 
          ref={minuteRef}
          className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
          onScroll={(e) => handleScroll(e, minutes, onMinuteChange, setIsDraggingMinute)}
          onMouseDown={() => setIsDraggingMinute(true)}
          onMouseUp={() => {
            setIsDraggingMinute(false);
            handleScrollEnd(minuteRef.current, minutes, onMinuteChange);
          }}
          onTouchStart={() => setIsDraggingMinute(true)}
          onTouchEnd={() => {
            setIsDraggingMinute(false);
            handleScrollEnd(minuteRef.current, minutes, onMinuteChange);
          }}
          style={{ 
            paddingTop: `${ITEM_HEIGHT * 2}px`, 
            paddingBottom: `${ITEM_HEIGHT * 2}px`,
          }}
        >
          {minutes.map((m) => (
            <div
              key={m}
              className="snap-center flex items-center justify-center transition-all duration-200"
              style={{ 
                height: `${ITEM_HEIGHT}px`,
                fontSize: m === minute ? '2.5rem' : '1.5rem',
                color: m === minute ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                opacity: m === minute ? 1 : 0.3,
                fontWeight: m === minute ? 600 : 400,
              }}
            >
              {m}
            </div>
          ))}
        </div>
        {/* Center highlight line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[48px] pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-border"></div>
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-border"></div>
        </div>
      </div>
    </div>
  );
};
