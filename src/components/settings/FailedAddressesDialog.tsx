import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
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
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <Badge variant="outline">{failed.length} Fehler</Badge>
            <div className="border rounded-lg overflow-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[40%]">Adresse</TableHead>
                    <TableHead className="w-[60%]">Fehler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failed.map((f, idx) => {
                    // Determine error type
                    const isImportError = (f as any).type === 'import';
                    const isGeocodingError = (f as any).type === 'geocoding';
                    
                    // Parse error message to be more user-friendly
                    let errorMessage = f.reason;
                    if (errorMessage.includes('FunctionsHttpError')) {
                      errorMessage = 'Geocoding-Dienst nicht erreichbar - Adresse wurde ohne Koordinaten gespeichert';
                    } else if (errorMessage.includes('Geocoding fehlgeschlagen')) {
                      errorMessage = errorMessage.replace('Geocoding fehlgeschlagen:', '');
                    }
                    
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{f.address}</TableCell>
                        <TableCell className={cn(
                          "text-sm",
                          isImportError && "text-red-600 dark:text-red-400",
                          isGeocodingError && "text-yellow-600 dark:text-yellow-400",
                          !isImportError && !isGeocodingError && "text-red-600 dark:text-red-500"
                        )}>
                          {isImportError && (
                            <Badge variant="outline" className="mr-2 bg-red-50 text-red-700 border-red-200">
                              Import-Fehler
                            </Badge>
                          )}
                          {isGeocodingError && (
                            <Badge variant="outline" className="mr-2 bg-yellow-50 text-yellow-700 border-yellow-200">
                              Geocoding-Fehler
                            </Badge>
                          )}
                          {errorMessage}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};