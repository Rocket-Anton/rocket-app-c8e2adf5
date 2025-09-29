import { useState } from "react";
import { Home, Users, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { AddressDetailModal } from "./AddressDetailModal";
import { useIsMobile } from "../hooks/use-mobile";

interface Address {
  id: number;
  street: string;
  postalCode: string;
  city: string;
  wohneinheiten?: number;
  potentiale?: number;
}

interface AddressCardProps {
  address: Address;
}

export const AddressCard = ({ address }: AddressCardProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      <Card 
        className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1 flex-1">
            <h3 className="font-medium text-foreground">{address.street}</h3>
            <p className="text-sm text-muted-foreground">
              {address.postalCode} {address.city}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex ${isMobile ? 'flex-row gap-3' : 'flex-col'} items-center gap-2`}>
              <div className="flex items-center gap-1">
                <Home className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-muted-foreground`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>{address.wohneinheiten || 2}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-green-600`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-green-600`}>{address.potentiale || 2}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </Card>
      
      <AddressDetailModal 
        address={address}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
};