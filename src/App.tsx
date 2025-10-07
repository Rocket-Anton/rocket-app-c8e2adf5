import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Karte from "./pages/Karte";
import Auth from "./pages/Auth";
import Projects from "./pages/settings/Projects";
import Providers from "./pages/settings/Providers";
import Addresses from "./pages/settings/Addresses";
import Tarife from "./pages/settings/Tarife";
import Raketen from "./pages/settings/Raketen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/karte" element={<Karte />} />
            <Route path="/settings/providers" element={<Providers />} />
            <Route path="/settings/projects" element={<Projects />} />
            <Route path="/settings/addresses" element={<Addresses />} />
            <Route path="/settings/tarife" element={<Tarife />} />
            <Route path="/settings/raketen" element={<Raketen />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
