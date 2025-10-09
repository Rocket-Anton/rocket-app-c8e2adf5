import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useCallback } from 'react';

type Item = { id: number };
type Props<T extends Item> = {
  items: T[];
  startIndex?: number;
  renderCard: (item: T, index: number, total: number) => React.ReactNode;
  onIndexChange?: (index: number) => void;
};

export default function HorizontalModalPager<T extends Item>({
  items,
  startIndex = 0,
  renderCard,
  onIndexChange,
}: Props<T>) {
  const [emblaRef, embla] = useEmblaCarousel({
    loop: false,
    align: 'center',
    containScroll: false,
    dragFree: false,
    skipSnaps: false,
  });

  useEffect(() => {
    if (embla) embla.scrollTo(startIndex, true);
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

  return (
    <div
      ref={emblaRef}
      className="h-full overflow-hidden touch-pan-y"
      style={{
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        willChange: 'transform',
        contain: 'layout style paint'
      }}
    >
      <div className="flex h-full" style={{ willChange: 'transform' }}>
        {items.map((it, idx) => (
          <div key={it.id} className="flex-[0_0_100%] h-full" style={{ contain: 'layout' }}>
            <div className="h-full w-full flex items-start justify-center">
              <div className="w-[92vw] max-w-2xl h-full bg-background rounded-xl shadow-xl border flex flex-col overflow-hidden">
                {renderCard(it, idx, items.length)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
