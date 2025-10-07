import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";

const Tarife = () => {
  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset className="p-0 m-0 border-0">
          <div className="h-full overflow-auto">
            <div className="container mx-auto p-6">
              <h2 className="text-2xl font-semibold mb-4">Tarife</h2>
              <p className="text-muted-foreground">Tarifverwaltung wird hier implementiert.</p>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Tarife;
