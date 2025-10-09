import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

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
  const [emblaRef, embla] = useEmblaCarousel({
    loop: false,
    align: 'center',
    containScroll: false,
    dragFree: false,
    skipSnaps: false,
    duration: 25,
    watchDrag: true,
    startIndex: startIndex,
  });

  useEffect(() => {
    if (embla && startIndex !== embla.selectedScrollSnap()) {
      embla.scrollTo(startIndex, true);
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
      <div className="flex h-full transition-transform duration-300 ease-out" style={{ willChange: 'transform', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
        {items.map((it, idx) => (
          <div key={it.id} className="flex-[0_0_100%] h-full transition-opacity duration-300" style={{ contain: 'layout style', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
            <div className="h-full w-full flex items-center justify-center" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
              <div className="w-[92vw] max-w-2xl h-full bg-background rounded-xl shadow-xl border flex flex-col overflow-hidden" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
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
