import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { cn } from '@/lib/utils';

type Item = { id: number };
type Props<T extends Item> = {
  items: T[];
  startIndex?: number;
  renderCard: (item: T, index: number, total: number) => React.ReactNode;
  onIndexChange?: (index: number) => void;
};

export interface HorizontalModalPagerHandle {
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: () => boolean;
  canScrollNext: () => boolean;
}

function HorizontalModalPagerInner<T extends Item>({
  items,
  startIndex = 0,
  renderCard,
  onIndexChange,
}: Props<T>, ref: React.Ref<HorizontalModalPagerHandle>) {
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [emblaRef, embla] = useEmblaCarousel({
    loop: false,
    align: 'center',
    containScroll: 'trimSnaps',
    dragFree: false,
    skipSnaps: false,
    duration: 25,
    watchDrag: true,
    startIndex: startIndex,
  });

  // Entrance animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setHasAnimatedIn(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Drag state listeners for visual performance optimization
  useEffect(() => {
    if (!embla) return;
    
    const onPointerDown = () => setIsDragging(true);
    const onPointerUp = () => setIsDragging(false);
    const onSettle = () => setIsDragging(false);
    
    embla.on('pointerDown', onPointerDown);
    embla.on('pointerUp', onPointerUp);
    embla.on('settle', onSettle);
    
    return () => {
      embla.off('pointerDown', onPointerDown);
      embla.off('pointerUp', onPointerUp);
      embla.off('settle', onSettle);
    };
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    
    // Jump directly to startIndex without animation on mount
    const currentSnap = embla.selectedScrollSnap();
    if (startIndex !== currentSnap) {
      embla.scrollTo(startIndex, false);
    }
  }, [embla, startIndex]);

  const onSelect = useCallback(() => {
    if (!embla) return;
    onIndexChange?.(embla.selectedScrollSnap());
  }, [embla, onIndexChange]);

  useEffect(() => {
    if (!embla) return;
    embla.on('select', onSelect);
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla, onSelect]);

  useImperativeHandle(ref, () => ({
    scrollPrev: () => embla?.scrollPrev(),
    scrollNext: () => embla?.scrollNext(),
    canScrollPrev: () => embla?.canScrollPrev() ?? false,
    canScrollNext: () => embla?.canScrollNext() ?? false,
  }), [embla]);

  return (
    <div
      ref={emblaRef}
      className="h-full overflow-hidden touch-pan-y"
      style={{
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        willChange: 'transform',
        contain: 'layout style paint',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}
    >
      <div className="flex h-full ease-out" style={{ willChange: 'transform', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
        {items.map((it, idx) => (
          <div 
            key={it.id} 
            className={cn(
              "flex-[0_0_100%] h-full transition-all duration-300 ease-out",
              hasAnimatedIn ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )} 
            style={{ 
              contain: 'layout style', 
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}
          >
            <div className="h-full w-full flex items-center justify-center" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
              <div 
                className={cn(
                  "w-[92vw] sm:w-[85vw] md:w-[70vw] lg:w-[500px] max-w-md h-full bg-background rounded-xl border flex flex-col overflow-hidden z-[10000] transition-shadow duration-200",
                  isDragging ? "shadow-md" : "shadow-xl"
                )} 
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
              >
                {renderCard(it, idx, items.length)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const HorizontalModalPager = forwardRef(HorizontalModalPagerInner) as <T extends Item>(
  props: Props<T> & { ref?: React.Ref<HorizontalModalPagerHandle> }
) => ReturnType<typeof HorizontalModalPagerInner>;

export default HorizontalModalPager;
