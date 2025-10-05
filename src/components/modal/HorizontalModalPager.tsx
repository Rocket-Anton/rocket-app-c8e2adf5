import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useCallback } from 'react';

type Item = { id: number };
type Props<T extends Item> = {
  items: T[];
  startIndex?: number;
  render: (item: T, index: number, total: number) => React.ReactNode;
  onIndexChange?: (index: number) => void;
};

export default function HorizontalModalPager<T extends Item>({
  items,
  startIndex = 0,
  render,
  onIndexChange,
}: Props<T>) {
  const [emblaRef, embla] = useEmblaCarousel({
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
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
    return () => { embla.off('select', onSelect); };
  }, [embla, onSelect]);

  return (
    <div ref={emblaRef} className="h-full overflow-hidden touch-pan-y">
      <div className="flex h-full -mr-3">
        {items.map((it, idx) => (
          <div key={it.id} className="flex-[0_0_100%] min-w-0 h-full pr-3">
            <div className="h-full w-full rounded-xl bg-background border shadow-xl flex flex-col overflow-hidden">
              {render(it, idx, items.length)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
