import TinderCard from 'react-tinder-card';
import { ReactNode, useMemo } from 'react';

type Props = {
  address: { id: number; street: string; houseNumber: string; city: string; postalCode: string };
  children: ReactNode;
  onSwipeLeft: (addressId: number) => void;
  onSwipeRight: (addressId: number) => void;
};

const SwipeAddressCard = ({ address, children, onSwipeLeft, onSwipeRight }: Props) => {
  const preventSwipe = useMemo(() => ['up', 'down'] as const, []);

  const handleSwipe = (dir: string) => {
    if (dir === 'left') onSwipeLeft(address.id);
    if (dir === 'right') onSwipeRight(address.id);
  };

  return (
    <TinderCard
      className="absolute inset-0 will-change-transform"
      key={address.id}
      onSwipe={handleSwipe}
      preventSwipe={preventSwipe as any}
      swipeRequirementType="position"
      swipeThreshold={120}
    >
      <div className="relative w-full h-full select-none touch-pan-y">
        {/* Badge-Hinweise für Swipe-Richtung */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md px-3 py-1.5 text-sm font-semibold bg-green-500/90 text-white opacity-0 transition-opacity">
          Potenzial
        </div>
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-md px-3 py-1.5 text-sm font-semibold bg-red-500/90 text-white opacity-0 transition-opacity">
          Kein Interesse
        </div>

        {/* Card content */}
        <div className="w-full h-full bg-background rounded-2xl shadow-lg overflow-hidden border">
          {children}
        </div>
      </div>
    </TinderCard>
  );
};

export default SwipeAddressCard;
