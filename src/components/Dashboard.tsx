import { SidebarProvider, SidebarInset } from "./ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { LauflistenContent } from "./LauflistenContent";
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
      <div className="flex h-dvh w-full bg-muted/30 overflow-hidden gap-0" style={{ ['--sidebar-width-icon' as any]: '5.5rem' }}>
        <DashboardSidebar />
        <SidebarInset className="p-0 m-0 border-0">
          <LauflistenContent 
            onOrderCreated={() => setTodayOrderCount(prev => prev + 1)} 
            orderCount={todayOrderCount}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};