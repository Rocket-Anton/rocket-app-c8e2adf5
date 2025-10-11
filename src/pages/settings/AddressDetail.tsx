import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Building2, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { UnitDetailModal } from "@/components/settings/UnitDetailModal";
import { CreateCustomerDialog } from "@/components/settings/CreateCustomerDialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Address {
  id: number;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  locality: string | null;
  status: string;
  notiz: string | null;
  coordinates: any;
  assigned_to: string | null;
  project_id: string | null;
  projects?: {
    name: string;
  };
}

interface Unit {
  id: string;
  etage: string | null;
  lage: string | null;
  status: string;
  marketable: boolean;
  notiz: string | null;
  assigned_to: string | null;
}

interface StatusHistory {
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

interface Assignment {
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

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  orders: {
    id: string;
    order_number: string | null;
    status: string;
    total_amount: number | null;
    created_at: string;
  }[];
}

const AddressDetail = () => {
  const { id } = useParams();
  const addressId = parseInt(id || '0', 10);
  const navigate = useNavigate();
  const [address, setAddress] = useState<Address | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);

  useEffect(() => {
    if (addressId) {
      loadData();
    }
  }, [addressId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load address
      const { data: addressData, error: addressError } = await supabase
        .from('addresses')
        .select(`
          *,
          projects (name)
        `)
        .eq('id', addressId)
        .single();

      if (addressError) throw addressError;
      setAddress(addressData);

      // Load units
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('address_id', addressId)
        .order('etage', { ascending: true });

      if (unitsError) throw unitsError;
      setUnits(unitsData || []);

      // Load status history
      const { data: historyData, error: historyError } = await supabase
        .from('address_status_history')
        .select('*')
        .eq('address_id', addressId)
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
      
      setStatusHistory(enrichedHistory as StatusHistory[]);

      // Load assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('address_assignments')
        .select('*')
        .eq('address_id', addressId)
        .order('assigned_at', { ascending: false});

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
      
      setAssignments(enrichedAssignments as Assignment[]);

      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          orders (*)
        `)
        .eq('address_id', addressId)
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;
      setCustomers(customersData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0">
          <DashboardSidebar />
          <SidebarInset className="flex-1 p-0 m-0 border-0 overflow-hidden">
            <div className="h-full overflow-auto">
              <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-96 w-full" />
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (!address) {
    return (
      <SidebarProvider>
        <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0">
          <DashboardSidebar />
          <SidebarInset className="flex-1 p-0 m-0 border-0 overflow-hidden">
            <div className="h-full overflow-auto">
              <div className="w-full max-w-7xl mx-auto p-6">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zurück
                </Button>
                <p className="mt-4 text-muted-foreground">Adresse nicht gefunden</p>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset className="flex-1 p-0 m-0 border-0 overflow-hidden">
          <div className="h-full overflow-auto" style={{ scrollbarGutter: 'stable' }}>
            <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Zurück
                  </Button>
                  <div>
                    <h1 className="text-3xl font-bold">
                      {address.street} {address.house_number}
                    </h1>
                    <p className="text-muted-foreground">
                      {address.postal_code} {address.city}
                      {address.locality && ` - ${address.locality}`}
                    </p>
                  </div>
                </div>
                <Badge variant={address.status === 'Offen' ? 'default' : 'secondary'}>
                  {address.status}
                </Badge>
              </div>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Übersicht</TabsTrigger>
                  <TabsTrigger value="history">Historie</TabsTrigger>
                  <TabsTrigger value="units">WE ({units.length})</TabsTrigger>
                  <TabsTrigger value="customers">Kunden ({customers.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Adressinformationen
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Straße</p>
                          <p className="font-medium">{address.street} {address.house_number}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">PLZ / Ort</p>
                          <p className="font-medium">{address.postal_code} {address.city}</p>
                        </div>
                        {address.locality && (
                          <div>
                            <p className="text-sm text-muted-foreground">Ortschaft</p>
                            <p className="font-medium">{address.locality}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge variant={address.status === 'Offen' ? 'default' : 'secondary'}>
                            {address.status}
                          </Badge>
                        </div>
                        {address.projects && (
                          <div>
                            <p className="text-sm text-muted-foreground">Projekt</p>
                            <p className="font-medium">{address.projects.name}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Anzahl WE</p>
                          <p className="font-medium">{units.length}</p>
                        </div>
                      </div>
                      {address.notiz && (
                        <div>
                          <p className="text-sm text-muted-foreground">Notizen</p>
                          <p className="font-medium">{address.notiz}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Zuweisungs-Historie</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {assignments.length === 0 ? (
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

                  <Card>
                    <CardHeader>
                      <CardTitle>Status-Historie</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {statusHistory.length === 0 ? (
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

                <TabsContent value="units" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Wohneinheiten
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {units.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">Keine Wohneinheiten vorhanden</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Etage</TableHead>
                              <TableHead>Lage</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Vermarktbar</TableHead>
                              <TableHead>Notiz</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {units.map((unit) => (
                              <TableRow
                                key={unit.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => setSelectedUnit(unit)}
                              >
                                <TableCell>{unit.etage || '-'}</TableCell>
                                <TableCell>{unit.lage || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{unit.status}</Badge>
                                </TableCell>
                                <TableCell>
                                  {unit.marketable ? (
                                    <Badge variant="default">Ja</Badge>
                                  ) : (
                                    <Badge variant="destructive">Nein</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">{unit.notiz || '-'}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm">Details</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="customers" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Kunden</h2>
                    <Button onClick={() => setCreateCustomerOpen(true)}>
                      <Home className="mr-2 h-4 w-4" />
                      Neuer Kunde
                    </Button>
                  </div>

                  {customers.length === 0 ? (
                    <Card>
                      <CardContent className="py-8">
                        <p className="text-muted-foreground text-center">Keine Kunden vorhanden</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {customers.map((customer) => (
                        <Card key={customer.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle>{customer.name}</CardTitle>
                              <Badge>{customer.orders.length} Auftrag{customer.orders.length !== 1 ? 'e' : ''}</Badge>
                            </div>
                            {(customer.email || customer.phone) && (
                              <div className="text-sm text-muted-foreground space-y-1">
                                {customer.email && <p>Email: {customer.email}</p>}
                                {customer.phone && <p>Tel: {customer.phone}</p>}
                              </div>
                            )}
                          </CardHeader>
                          {customer.orders.length > 0 && (
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Auftragsnr.</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Betrag</TableHead>
                                    <TableHead>Erstellt am</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {customer.orders.map((order) => (
                                    <TableRow key={order.id}>
                                      <TableCell>{order.order_number || '-'}</TableCell>
                                      <TableCell>
                                        <Badge variant="secondary">{order.status}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        {order.total_amount ? `${order.total_amount.toFixed(2)} €` : '-'}
                                      </TableCell>
                                      <TableCell>
                                        {format(new Date(order.created_at), 'dd.MM.yyyy', { locale: de })}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </SidebarInset>
      </div>

      {selectedUnit && (
        <UnitDetailModal
          unit={selectedUnit}
          open={!!selectedUnit}
          onClose={() => setSelectedUnit(null)}
        />
      )}

      {createCustomerOpen && address && (
        <CreateCustomerDialog
          open={createCustomerOpen}
          onClose={() => setCreateCustomerOpen(false)}
          addressId={address.id}
          onCustomerCreated={loadData}
        />
      )}
    </SidebarProvider>
  );
};

export default AddressDetail;
