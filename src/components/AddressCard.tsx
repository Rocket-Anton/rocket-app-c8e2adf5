import { useState } from "react";
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
            <h3 className="font-medium text-foreground">{address.street} {address.houseNumber}</h3>
            <p className="text-sm text-muted-foreground">
              {address.postalCode} {address.city}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex flex-col items-center gap-2`}>
              <div className="flex items-center gap-1">
                <Home className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-muted-foreground`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>{address.wohneinheiten || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-green-600`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-green-600`}>{address.potentiale || 0}</span>
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