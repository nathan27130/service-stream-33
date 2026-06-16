import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Orders from "./pages/Orders";
import Calendar from "./pages/Calendar";
import Management from "./pages/Management";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import PrintOrder from "./pages/PrintOrder";
import PrintPlanning from "./pages/PrintPlanning";
import NotFound from "./pages/NotFound";
import QuoteImport from "./pages/QuoteImport";
import WeeklySummary from "./pages/WeeklySummary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Index />} />
            <Route 
              path="/orders" 
              element={
                <ProtectedRoute allowedRoles={["admin", "service"]}>
                  <Orders />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/calendar" 
              element={
                <ProtectedRoute allowedRoles={["admin", "service"]}>
                  <Calendar />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/management" 
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Management />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/products"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Products />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/print/order" 
              element={
                <ProtectedRoute>
                  <PrintOrder />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/print/planning" 
              element={
                <ProtectedRoute>
                  <PrintPlanning />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/quote-import"
              element={
                <ProtectedRoute allowedRoles={["admin", "service"]}>
                  <QuoteImport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/weekly-summary"
              element={
                <ProtectedRoute allowedRoles={["admin", "service"]}>
                  <WeeklySummary />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
