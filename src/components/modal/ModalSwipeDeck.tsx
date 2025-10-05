import { useMemo, useState } from "react";
import TinderCard from "react-tinder-card";
import '@react-spring/web';

type Address = {
  id: number;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  units?: any[];
  filteredUnits?: any[];
};

type Props = {
  addresses: Address[];
  startIndex?: number;
  renderCard: (addr: Address, index: number, total: number) => React.ReactNode;
  onSwiped?(addr: Address, dir: 'left' | 'right'): void;
  onClose?(): void;
};

export default function ModalSwipeDeck({
  addresses,
  startIndex = 0,
  renderCard,
  onSwiped,
  onClose,
}: Props) {
  const [idx, setIdx] = useState(startIndex);
  const deck = useMemo(() => addresses.slice(idx), [addresses, idx]);

  const prevent = useMemo(() => ['up', 'down'] as const, []);

  // Wenn alle Karten geswiped wurden, schließe das Modal
  if (deck.length === 0 && onClose) {
    setTimeout(() => onClose(), 100);
  }

  return (
    <div
      className="relative w-full h-[85vh] mx-auto"
      style={{ overflow: "visible" }}
    >
      {deck.map((addr, i) => {
        const z = 1000 + deck.length - i;
        const offsetY = i * 8;
        const scale = 1 - i * 0.02;
        
        return (
          <TinderCard
            key={addr.id}
            className="absolute inset-0"
            preventSwipe={prevent as any}
            swipeRequirementType="position"
            swipeThreshold={120}
            onSwipe={(dir) => {
              if (dir === 'left' || dir === 'right') {
                onSwiped?.(addr, dir as 'left' | 'right');
                setIdx((cur) => cur + 1);
              }
            }}
          >
            <div
              className="h-full w-full rounded-2xl bg-background shadow-2xl border-2"
              style={{ 
                zIndex: z,
                transform: `translateY(${offsetY}px) scale(${scale})`,
                transition: 'transform 0.2s ease-out',
              }}
            >
              <div className="h-full w-full overflow-y-auto touch-pan-y overscroll-contain">
                {renderCard(addr, idx + i, addresses.length)}
              </div>
            </div>
          </TinderCard>
        );
      })}
    </div>
  );
}
