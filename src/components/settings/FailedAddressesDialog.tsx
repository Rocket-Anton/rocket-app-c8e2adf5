import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface FailedItem {
  address: string;
  reason: string;
}

interface FailedAddressesDialogProps {
  listId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FailedAddressesDialog = ({ listId, open, onOpenChange }: FailedAddressesDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<FailedItem[]>([]);

  useEffect(() => {
    if (!open || !listId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('project_address_lists')
        .select('error_details, name')
        .eq('id', listId)
        .maybeSingle();
      const items: FailedItem[] = (data?.error_details as any)?.failedAddresses || [];
      setFailed(items);
      setLoading(false);
    };
    load();
  }, [open, listId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Fehlerhafte Adressen</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center gap-2 py-8"><Loader2 className="h-5 w-5 animate-spin"/> Lädt…</div>
        ) : failed.length === 0 ? (
          <Alert>
            <AlertDescription>Keine fehlerhaften Adressen vorhanden.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <Badge variant="outline">{failed.length} Fehler</Badge>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Fehler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failed.map((f, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{f.address}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-500">{f.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};