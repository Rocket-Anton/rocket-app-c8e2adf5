import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { cn } from '@/lib/utils';

type Item = { id: number };
type Props<T extends Item> = {
  items: T[];
  startIndex?: number;
  renderCard: (item: T, index: number, total: number) => React.ReactNode;
  onIndexChange?: (index: number) => void;
  className?: string;
  options?: Parameters<typeof useEmblaCarousel>[0];
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
  className,
  options,
}: Props<T>, ref: React.Ref<HorizontalModalPagerHandle>) {
  const [isDragging, setIsDragging] = useState(false);

  const [emblaRef, embla] = useEmblaCarousel({
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    skipSnaps: false,
    duration: 12, // Ultra-responsive für Apple-Feel
    watchDrag: true,
    startIndex: startIndex,
    inViewThreshold: 0.6,
    ...options,
  });


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
      className={cn("h-full overflow-visible touch-pan-y bg-transparent", className)}
      style={{
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        willChange: 'transform',
        contain: 'content',
      }}
    >
      <div className="flex h-full bg-transparent" style={{ willChange: 'transform' }}>
        {items.map((it, idx) => (
          <div 
            key={it.id} 
            className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center bg-transparent"
            style={{ contain: 'content' }}
          >
            {renderCard(it, idx, items.length)}
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
