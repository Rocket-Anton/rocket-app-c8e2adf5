import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  addressId: number;
  onCustomerCreated: () => void;
}

export const CreateCustomerDialog = ({ open, onClose, addressId, onCustomerCreated }: CreateCustomerDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    createOrder: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet');

      // Check if customer already exists
      const { data: existingCustomer, error: checkError } = await supabase
        .from('customers')
        .select('id')
        .eq('name', formData.name.trim())
        .eq('address_id', addressId)
        .maybeSingle();

      if (checkError) throw checkError;

      let customerId: string;

      if (existingCustomer) {
        // Customer exists, use existing ID
        customerId = existingCustomer.id;
        toast.info('Kunde existiert bereits. Auftrag wird für bestehenden Kunden erstellt.');
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            address_id: addressId,
            created_by: user.id
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
        toast.success('Kunde erfolgreich erstellt');
      }

      // Create order if requested
      if (formData.createOrder) {
        const orderNumber = `ORD-${Date.now()}`;
        const { error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_id: customerId,
            order_number: orderNumber,
            status: 'open',
            created_by: user.id
          });

        if (orderError) throw orderError;
        toast.success('Auftrag erfolgreich erstellt');
      }

      onCustomerCreated();
      onClose();
      setFormData({ name: '', email: '', phone: '', createOrder: false });
    } catch (error: any) {
      console.error('Error creating customer:', error);
      toast.error('Fehler beim Erstellen: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuer Kunde</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Max Mustermann"
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="max@example.com"
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+49 123 456789"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="createOrder"
              checked={formData.createOrder}
              onCheckedChange={(checked) => setFormData({ ...formData, createOrder: checked as boolean })}
            />
            <Label htmlFor="createOrder" className="cursor-pointer">
              Auftrag direkt erstellen
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Erstelle...
                </>
              ) : (
                'Erstellen'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
