import { SidebarProvider, SidebarInset } from "./ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { LauflistenContent } from "./LauflistenContent";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { LogIn, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Dashboard = () => {
  const navigate = useNavigate();
  const [todayOrderCount, setTodayOrderCount] = useState(() => {
    // Initialisiere aus localStorage
    const today = new Date().toDateString();
    const stored = localStorage.getItem('orderCount');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) {
        return data.count;
      }
    }
    return 0;
  });

  // Save to localStorage whenever count changes
  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem('orderCount', JSON.stringify({ date: today, count: todayOrderCount }));
  }, [todayOrderCount]);

  // Reset count at midnight
  useEffect(() => {
    const checkMidnight = setInterval(() => {
      const stored = localStorage.getItem('orderCount');
      if (stored) {
        const data = JSON.parse(stored);
        const today = new Date().toDateString();
        if (data.date !== today) {
          setTodayOrderCount(0);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkMidnight);
  }, []);

  const resetAddresses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Bitte zuerst anmelden");
        return;
      }

      const { data, error } = await supabase.functions.invoke('reset-addresses', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      toast.success("Adressen wurden zurückgesetzt");
      window.location.reload();
    } catch (error: any) {
      console.error('Error resetting addresses:', error);
      toast.error("Fehler beim Zurücksetzen der Adressen");
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset className="p-0 m-0 border-0">
          <div className="relative h-full">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button onClick={resetAddresses} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Adressen Reset
              </Button>
              <Button onClick={() => navigate("/auth")} variant="outline" size="sm">
                <LogIn className="w-4 h-4 mr-2" />
                Anmelden
              </Button>
            </div>
            <LauflistenContent 
              onOrderCreated={() => setTodayOrderCount(prev => prev + 1)} 
              orderCount={todayOrderCount}
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};