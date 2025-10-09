import { useState, memo } from "react";
import { Home, Users, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { AddressDetailModal } from "./AddressDetailModal";
import { useIsMobile } from "../hooks/use-mobile";

interface Address {
  id: number;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  wohneinheiten?: number;
  potentiale?: number;
  units?: { id: number; floor: string; position: string; status: string }[];
  filteredUnits?: { id: number; floor: string; position: string; status: string }[];
}

interface AddressCardProps {
  address: Address;
  allAddresses?: Address[];
  currentIndex?: number;
  onModalClose?: (finalIndex: number) => void;
  onOrderCreated?: () => void;
  onUpdateUnitStatus?: (addressId: number, unitId: number, newStatus: string) => void;
}

const AddressCardComponent = ({ address, allAddresses = [], currentIndex = 0, onModalClose, onOrderCreated, onUpdateUnitStatus }: AddressCardProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [justClosed, setJustClosed] = useState(false);
  const isMobile = useIsMobile();

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      // Trigger highlight animation when modal closes
      setJustClosed(true);
      setTimeout(() => setJustClosed(false), 1500);
    }
  };

  const handleAddressChange = (finalIndex: number) => {
    if (onModalClose) {
      onModalClose(finalIndex);
    }
  };

  return (
    <>
      <Card 
        className={`p-4 hover:shadow-md transition-all cursor-pointer ${
          justClosed 
            ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500 scale-[1.02] shadow-lg' 
            : ''
        }`}
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="font-medium text-foreground">{address.street} {address.houseNumber}</h3>
            <p className="text-sm text-muted-foreground">
              {address.postalCode} {address.city}
            </p>
          </div>
          
          {!isMobile && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1">
                  <Home className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium">{address.wohneinheiten || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className={`w-4 h-4 flex-shrink-0 ${(address.potentiale || 0) > 0 ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={`text-sm font-medium ${(address.potentiale || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>{address.potentiale || 0}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          )}
          
          {isMobile && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <Home className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium">{address.wohneinheiten || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className={`w-4 h-4 flex-shrink-0 ${(address.potentiale || 0) > 0 ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={`text-sm font-medium ${(address.potentiale || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>{address.potentiale || 0}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </div>
          )}
        </div>
      </Card>
      
      <AddressDetailModal 
        address={address}
        allAddresses={allAddresses}
        initialIndex={currentIndex}
        open={modalOpen}
        onOpenChange={handleModalClose}
        onClose={handleAddressChange}
        onOrderCreated={onOrderCreated}
        onUpdateUnitStatus={onUpdateUnitStatus}
      />
    </>
  );
};

export const AddressCard = memo(AddressCardComponent, (prev, next) => {
  return (
    prev.address.id === next.address.id &&
    prev.address.wohneinheiten === next.address.wohneinheiten &&
    prev.address.potentiale === next.address.potentiale &&
    prev.currentIndex === next.currentIndex
  );
});