import { useState, useCallback } from 'react';
import SwipeAddressCard from './SwipeAddressCard';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';

type Address = { 
  id: number; 
  street: string; 
  houseNumber: string; 
  postalCode: string; 
  city: string;
  units?: any[];
};

type Props = {
  addresses: Address[];
  onLeft: (a: Address) => void;
  onRight: (a: Address) => void;
  initialCount?: number;
  renderCard?: (address: Address) => React.ReactNode;
};

export default function SwipeDeck({ 
  addresses, 
  onLeft, 
  onRight, 
  initialCount = 3,
  renderCard 
}: Props) {
  const [deck, setDeck] = useState(addresses);
  const [history, setHistory] = useState<Array<{ address: Address; direction: 'left' | 'right' }>>([]);

  const handleLeft = useCallback((id: number) => {
    const match = deck.find(d => d.id === id);
    if (!match) return;
    setHistory(prev => [...prev, { address: match, direction: 'left' }]);
    onLeft(match);
    setDeck(prev => prev.filter(d => d.id !== id));
  }, [deck, onLeft]);

  const handleRight = useCallback((id: number) => {
    const match = deck.find(d => d.id === id);
    if (!match) return;
    setHistory(prev => [...prev, { address: match, direction: 'right' }]);
    onRight(match);
    setDeck(prev => prev.filter(d => d.id !== id));
  }, [deck, onRight]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const lastAction = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setDeck(prev => [lastAction.address, ...prev]);
  }, [history]);

  const currentCard = deck[0];

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto px-4 py-6">
      {/* Deck container */}
      <div className="relative w-full h-[500px] mb-4">
        {deck.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground bg-muted/30 rounded-2xl border-2 border-dashed">
            <div className="text-center px-6">
              <div className="text-lg font-medium mb-1">Keine weiteren Adressen</div>
              <div className="text-sm">Alle Karten wurden verarbeitet</div>
            </div>
          </div>
        ) : (
          deck.slice(0, initialCount).map((address, i) => {
            const offset = i * 8;
            const scale = 1 - i * 0.03;
            const isTop = i === 0;

            return (
              <div
                key={address.id}
                className="absolute inset-0 transition-all duration-200"
                style={{ 
                  transform: `translateY(${offset}px) scale(${scale})`, 
                  zIndex: 100 - i,
                  pointerEvents: isTop ? 'auto' : 'none'
                }}
              >
                <SwipeAddressCard
                  address={address}
                  onSwipeLeft={handleLeft}
                  onSwipeRight={handleRight}
                >
                  {renderCard ? renderCard(address) : (
                    <div className="p-6">
                      <div className="text-xl font-semibold mb-2">
                        {address.street} {address.houseNumber}
                      </div>
                      <div className="text-muted-foreground">
                        {address.postalCode} {address.city}
                      </div>
                      {address.units && address.units.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="text-sm font-medium mb-2">Wohneinheiten: {address.units.length}</div>
                        </div>
                      )}
                    </div>
                  )}
                </SwipeAddressCard>
              </div>
            );
          })
        )}
      </div>

      {/* Action buttons - nur wenn noch Karten vorhanden */}
      {deck.length > 0 && (
        <div className="flex items-center justify-center gap-4 w-full">
          <Button
            variant="outline"
            size="lg"
            className="h-14 w-14 rounded-full shadow-md hover:scale-105 transition-transform"
            onClick={() => currentCard && handleLeft(currentCard.id)}
          >
            <ChevronLeft className="h-6 w-6 text-red-500" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-14 w-14 rounded-full shadow-md hover:scale-105 transition-transform"
            onClick={() => currentCard && handleRight(currentCard.id)}
          >
            <ChevronRight className="h-6 w-6 text-green-500" />
          </Button>
        </div>
      )}

      {/* Undo button */}
      {history.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={handleUndo}
        >
          <Undo2 className="h-4 w-4 mr-2" />
          Rückgängig
        </Button>
      )}

      {/* Counter */}
      <div className="text-sm text-muted-foreground">
        {deck.length > 0 ? `${deck.length} Karte${deck.length !== 1 ? 'n' : ''} verbleibend` : 'Fertig!'}
      </div>
    </div>
  );
}
