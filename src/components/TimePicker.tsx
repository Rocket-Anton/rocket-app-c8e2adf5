import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface TimePickerProps {
  hour: number;
  minute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
}

export const TimePicker = ({ hour, minute, onHourChange, onMinuteChange }: TimePickerProps) => {
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23
  const minutes = Array.from({ length: 60 }, (_, i) => i); // 0-59

  const scrollToValue = (container: HTMLDivElement | null, value: number, items: number[]) => {
    if (!container) return;
    const index = items.indexOf(value);
    if (index !== -1) {
      const scrollTop = index * 40 - 100; // 40px item height, center it
      container.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (hourScrollRef.current) {
      scrollToValue(hourScrollRef.current, hour, hours);
    }
  }, []);

  useEffect(() => {
    if (minuteScrollRef.current) {
      scrollToValue(minuteScrollRef.current, minute, minutes);
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'hour' | 'minute') => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop + 100; // offset for padding
    const index = Math.round(scrollTop / 40);
    const items = type === 'hour' ? hours : minutes;
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    
    if (type === 'hour') {
      onHourChange(items[clampedIndex]);
    } else {
      onMinuteChange(items[clampedIndex]);
    }
  };

  const handleScrollEnd = (container: HTMLDivElement | null, value: number, items: number[]) => {
    if (!container) return;
    scrollToValue(container, value, items);
  };

  return (
    <div className="relative flex gap-1 sm:gap-2 p-3 sm:p-6 bg-popover">
      {/* Hours */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-xs sm:text-sm font-semibold text-foreground">Stunde</div>
        <div 
          ref={hourScrollRef}
          className="relative h-[200px] sm:h-[240px] w-[60px] sm:w-[70px] overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
          onScroll={(e) => handleScroll(e, 'hour')}
        >
          {/* Top padding */}
          <div className="h-[100px]" />
          
          {hours.map((h) => (
            <div
              key={h}
              className={cn(
                "h-10 flex items-center justify-center snap-center cursor-pointer transition-all rounded-md mx-1",
                h === hour 
                  ? "text-xl font-bold text-primary bg-primary/10 scale-110" 
                  : "text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              onClick={() => {
                onHourChange(h);
                scrollToValue(hourScrollRef.current!, h, hours);
              }}
            >
              {String(h).padStart(2, '0')}
            </div>
          ))}
          
          {/* Bottom padding */}
          <div className="h-[100px]" />
        </div>
      </div>

      {/* Separator */}
      <div className="flex items-center justify-center text-2xl font-bold pt-9 text-primary">:</div>

      {/* Minutes */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-xs sm:text-sm font-semibold text-foreground">Minute</div>
        <div 
          ref={minuteScrollRef}
          className="relative h-[200px] sm:h-[240px] w-[60px] sm:w-[70px] overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
          onScroll={(e) => handleScroll(e, 'minute')}
        >
          {/* Top padding */}
          <div className="h-[100px]" />
          
          {minutes.map((m) => (
            <div
              key={m}
              className={cn(
                "h-10 flex items-center justify-center snap-center cursor-pointer transition-all rounded-md mx-1",
                m === minute 
                  ? "text-xl font-bold text-primary bg-primary/10 scale-110" 
                  : "text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              onClick={() => {
                onMinuteChange(m);
                scrollToValue(minuteScrollRef.current!, m, minutes);
              }}
            >
              {String(m).padStart(2, '0')}
            </div>
          ))}
          
          {/* Bottom padding */}
          <div className="h-[100px]" />
        </div>
      </div>

      {/* Selection indicator line */}
      <div className="absolute left-0 right-0 top-[calc(50%+1.125rem)] h-10 pointer-events-none">
        <div className="h-full border-y-2 border-primary/30 bg-primary/5 rounded" />
      </div>
    </div>
  );
};