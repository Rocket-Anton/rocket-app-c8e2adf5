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
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [renderedIndices, setRenderedIndices] = useState<Set<number>>(
    new Set([startIndex - 1, startIndex, startIndex + 1].filter(i => i >= 0 && i < items.length))
  );

  const [emblaRef, embla] = useEmblaCarousel({
    loop: false,
    align: 'center',
    containScroll: 'trimSnaps',
    dragFree: false,
    skipSnaps: false,
    duration: 15,
    watchDrag: options?.watchDrag ?? true,
    startIndex: startIndex,
    inViewThreshold: 0.8,
    slidesToScroll: 1,
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
    const newIndex = embla.selectedScrollSnap();
    setCurrentIndex(newIndex);
    
    // Update rendered window: current + adjacent cards
    const newIndices = new Set([
      newIndex - 1,
      newIndex,
      newIndex + 1
    ].filter(i => i >= 0 && i < items.length));
    
    setRenderedIndices(newIndices);
    onIndexChange?.(newIndex);
  }, [embla, items.length, onIndexChange]);

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
      className={cn("h-full overflow-hidden touch-pan-y bg-transparent", className)}
      style={{
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        willChange: 'transform',
        contain: 'content',
      }}
    >
      <div className="flex h-full bg-transparent" style={{ willChange: 'transform' }}>
        {items.map((it, idx) => {
          const shouldRender = renderedIndices.has(idx);
          const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024;
          const flexBasis = isTablet ? '90%' : '100%';
          
          return (
            <div 
              key={it.id} 
              className="min-w-0 h-full flex items-center justify-center bg-transparent"
              style={{ 
                flex: `0 0 ${flexBasis}`,
                contain: 'content'
              }}
            >
              {shouldRender ? renderCard(it, idx, items.length) : (
                <div className="w-[92vw] max-w-2xl h-[80vh] bg-muted/20 animate-pulse rounded-2xl" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const HorizontalModalPager = forwardRef(HorizontalModalPagerInner) as <T extends Item>(
  props: Props<T> & { ref?: React.Ref<HorizontalModalPagerHandle> }
) => ReturnType<typeof HorizontalModalPagerInner>;

export default HorizontalModalPager;
