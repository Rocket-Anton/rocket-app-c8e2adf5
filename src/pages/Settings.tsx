import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectsSettings } from "@/components/settings/ProjectsSettings";
import { AddressesSettings } from "@/components/settings/AddressesSettings";

const Settings = () => {
  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset className="p-0 m-0 border-0">
          <div className="h-full overflow-auto">
            <div className="container mx-auto p-6">
              <h1 className="text-3xl font-bold mb-6">Einstellungen</h1>
              <Tabs defaultValue="projects" className="w-full">
                <TabsList>
                  <TabsTrigger value="projects">Projekte</TabsTrigger>
                  <TabsTrigger value="addresses">Adressen</TabsTrigger>
                </TabsList>
                <TabsContent value="projects" className="mt-6">
                  <ProjectsSettings />
                </TabsContent>
                <TabsContent value="addresses" className="mt-6">
                  <AddressesSettings />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
