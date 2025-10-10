import { useRef } from "react";

export function useSwipe(
  onLeft: () => void, 
  onRight: () => void, 
  threshold = 48
) {
  const startX = useRef<number | null>(null);
  
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx <= -threshold) onLeft();
    if (dx >= threshold) onRight();
    startX.current = null;
  };
  
  return { onTouchStart, onTouchEnd };
}
