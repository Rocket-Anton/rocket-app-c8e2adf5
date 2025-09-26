import { SidebarProvider, SidebarInset } from "./ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { LauflistenContent } from "./LauflistenContent";

export const Dashboard = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30" style={{ ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset>
          <LauflistenContent />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};