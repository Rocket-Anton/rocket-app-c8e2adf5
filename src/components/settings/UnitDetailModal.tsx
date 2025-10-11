import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Building2 } from "lucide-react";

interface Unit {
  id: string;
  etage: string | null;
  lage: string | null;
  status: string;
  marketable: boolean;
  notiz: string | null;
  assigned_to: string | null;
}

interface UnitStatusHistory {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string;
  notes: string | null;
  profiles?: {
    name: string;
  };
}

interface UnitAssignment {
  id: string;
  assigned_at: string;
  assigned_by: string;
  assigned_to: string;
  assigned_by_profile?: {
    name: string;
  };
  assigned_to_profile?: {
    name: string;
  };
}

interface UnitDetailModalProps {
  unit: Unit;
  open: boolean;
  onClose: () => void;
}

export const UnitDetailModal = ({ unit, open, onClose }: UnitDetailModalProps) => {
  const [statusHistory, setStatusHistory] = useState<UnitStatusHistory[]>([]);
  const [assignments, setAssignments] = useState<UnitAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && unit) {
      loadUnitDetails();
    }
  }, [open, unit]);

  const loadUnitDetails = async () => {
    setLoading(true);
    try {
      // Load status history
      const { data: historyData, error: historyError } = await supabase
        .from('unit_status_history')
        .select('*')
        .eq('unit_id', unit.id)
        .order('changed_at', { ascending: false });

      if (historyError) throw historyError;
      
      // Load user profiles separately
      const userIds = historyData?.map(h => h.changed_by) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
      const enrichedHistory = historyData?.map(h => ({
        ...h,
        profiles: profilesMap.get(h.changed_by)
      })) || [];
      
      setStatusHistory(enrichedHistory as UnitStatusHistory[]);

      // Load assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('unit_assignments')
        .select('*')
        .eq('unit_id', unit.id)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;
      
      // Load profiles for assignments
      const assignmentUserIds = assignmentsData?.flatMap(a => [a.assigned_by, a.assigned_to]) || [];
      const { data: assignmentProfiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', assignmentUserIds);

      const assignmentProfilesMap = new Map((assignmentProfiles || []).map(p => [p.id, p]));
      const enrichedAssignments = assignmentsData?.map(a => ({
        ...a,
        assigned_by_profile: assignmentProfilesMap.get(a.assigned_by),
        assigned_to_profile: assignmentProfilesMap.get(a.assigned_to)
      })) || [];
      
      setAssignments(enrichedAssignments as UnitAssignment[]);
    } catch (error) {
      console.error('Error loading unit details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Wohneinheit Details
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="status">Status-Historie</TabsTrigger>
            <TabsTrigger value="assignments">Zuweisungen</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Etage</p>
                    <p className="font-medium">{unit.etage || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lage</p>
                    <p className="font-medium">{unit.lage || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="secondary">{unit.status}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vermarktbar</p>
                    {unit.marketable ? (
                      <Badge variant="default">Ja</Badge>
                    ) : (
                      <Badge variant="destructive">Nein</Badge>
                    )}
                  </div>
                </div>
                {unit.notiz && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notizen</p>
                    <p className="font-medium">{unit.notiz}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : statusHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Keine Status-Änderungen vorhanden</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Von</TableHead>
                        <TableHead>Nach</TableHead>
                        <TableHead>Geändert von</TableHead>
                        <TableHead>Notiz</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statusHistory.map((history) => (
                        <TableRow key={history.id}>
                          <TableCell>
                            {format(new Date(history.changed_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                          </TableCell>
                          <TableCell>{history.old_status || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{history.new_status}</Badge>
                          </TableCell>
                          <TableCell>{history.profiles?.name || 'Unbekannt'}</TableCell>
                          <TableCell>{history.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : assignments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Keine Zuweisungen vorhanden</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Zugewiesen von</TableHead>
                        <TableHead>Zugewiesen an</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            {format(new Date(assignment.assigned_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                          </TableCell>
                          <TableCell>{assignment.assigned_by_profile?.name || 'Unbekannt'}</TableCell>
                          <TableCell>{assignment.assigned_to_profile?.name || 'Unbekannt'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
