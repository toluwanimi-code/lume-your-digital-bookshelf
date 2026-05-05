import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Library from "./pages/Library";
import ReaderPage from "./pages/Reader";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import { Navigate } from "react-router-dom";

function RootRoute() {
  const onboarded = typeof window !== "undefined" && localStorage.getItem("lume-onboarded") === "true";
  return onboarded ? <Library /> : <Navigate to="/onboarding" replace />;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/library" element={<Library />} />
          <Route path="/read/:id" element={<ReaderPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
