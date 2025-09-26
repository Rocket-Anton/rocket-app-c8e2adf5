import { SidebarProvider, SidebarInset } from "./ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { LauflistenContent } from "./LauflistenContent";

export const Dashboard = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <DashboardSidebar />
        <SidebarInset>
          <LauflistenContent />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};