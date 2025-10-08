import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const RaketenDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset className="flex-1 p-0 m-0 border-0 overflow-hidden">
          <div className="h-full overflow-auto" style={{ scrollbarGutter: 'stable' }}>
            <div className="w-full max-w-7xl mx-auto p-6">
              <Button
                variant="ghost"
                onClick={() => navigate("/settings/raketen")}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>

              <div>
                <h1 className="text-3xl font-bold mb-6">Rakete Detail</h1>
                <div className="bg-card p-6 rounded-lg border">
                  <p className="text-muted-foreground">
                    Rakete ID: {id}
                  </p>
                  <p className="text-muted-foreground mt-2">
                    Detailansicht wird noch implementiert
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default RaketenDetail;
