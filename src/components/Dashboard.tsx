import { useState } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { LauflistenContent } from "./LauflistenContent";

export const Dashboard = () => {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <DashboardSidebar />
      <main className="flex-1">
        <LauflistenContent />
      </main>
    </div>
  );
};