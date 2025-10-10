import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Karte from "./pages/Karte";
import Calendar from "./pages/Calendar";
import Auth from "./pages/Auth";
import Projects from "./pages/settings/Projects";
import ProjectDetail from "./pages/settings/ProjectDetail";
import ProjectStatusSettings from "./pages/settings/ProjectStatusSettings";
import Providers from "./pages/settings/Providers";
import ProviderDetail from "./pages/settings/ProviderDetail";
import Addresses from "./pages/settings/Addresses";
import Tarife from "./pages/settings/Tarife";
import TarifeDetail from "./pages/settings/TarifeDetail";
import Raketen from "./pages/settings/Raketen";
import RaketenDetail from "./pages/settings/RaketenDetail";
import Abrechnen from "./pages/abrechnungen/Abrechnen";
import Gutschriften from "./pages/abrechnungen/Gutschriften";
import Kosten from "./pages/abrechnungen/Kosten";
import ProjectsMap from "./pages/projects/ProjectsMap";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProjectProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Index />} />
                <Route path="/karte" element={<Karte />} />
                <Route path="/kalender" element={<Calendar />} />
                <Route path="/abrechnungen/abrechnen" element={<Abrechnen />} />
                <Route path="/abrechnungen/gutschriften" element={<Gutschriften />} />
                <Route path="/abrechnungen/kosten" element={<Kosten />} />
                <Route path="/settings/providers" element={<Providers />} />
                <Route path="/settings/providers/:id" element={<ProviderDetail />} />
                <Route path="/settings/projects" element={<Projects />} />
                <Route path="/settings/projects/:id" element={<ProjectDetail />} />
                <Route path="/settings/projects/:id/status" element={<ProjectStatusSettings />} />
                <Route path="/projects/karte" element={<ProjectsMap />} />
                <Route path="/settings/addresses" element={<Addresses />} />
                <Route path="/settings/tarife" element={<Tarife />} />
                <Route path="/settings/tarife/:id" element={<TarifeDetail />} />
                <Route path="/settings/raketen" element={<Raketen />} />
                <Route path="/settings/raketen/:id" element={<RaketenDetail />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </ProjectProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
