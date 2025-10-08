import { SidebarProvider, SidebarInset } from "./ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { LauflistenContent } from "./LauflistenContent";
import { MobileHeader } from "./MobileHeader";
import { useState, useEffect } from "react";

export const Dashboard = () => {
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

  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

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

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width' as any]: '14rem', ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset className="p-0 m-0 border-0">
          {/* Mobile Header */}
          <MobileHeader 
            selectedProjectIds={selectedProjectIds}
            onProjectsChange={setSelectedProjectIds}
          />
          
          <div className="relative h-full">
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