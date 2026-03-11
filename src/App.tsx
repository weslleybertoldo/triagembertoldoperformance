import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import TriagemForm from "./pages/TriagemForm";
import AlunoLogin from "./pages/AlunoLogin";
import AlunoArea from "./pages/AlunoArea";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import InstallBanner from "./components/pwa/InstallBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/triagem" element={<TriagemForm />} />
          <Route path="/aluno/login" element={<AlunoLogin />} />
          <Route path="/aluno" element={<AlunoArea />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
