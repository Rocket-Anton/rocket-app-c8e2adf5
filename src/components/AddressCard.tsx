import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface Address {
  id: number;
  street: string;
  postalCode: string;
  city: string;
}

interface AddressCardProps {
  address: Address;
}

export const AddressCard = ({ address }: AddressCardProps) => {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-1">
        <h3 className="font-medium text-foreground">{address.street}</h3>
        <p className="text-sm text-muted-foreground">
          {address.postalCode} {address.city}
        </p>
      </div>
    </Card>
  );
};