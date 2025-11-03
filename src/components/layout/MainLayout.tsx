import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Calendar, 
  Settings, 
  LogOut,
  ClipboardList,
  Package,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const { userRole, hasRole } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      // Utiliser scope: 'local' pour nettoyer la session locale sans appeler le serveur
      // Cela évite les erreurs si la session a déjà expiré côté serveur
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error("Logout error:", error);
      }
      toast.success("Déconnexion réussie");
      // La redirection est gérée automatiquement par onAuthStateChange dans Index.tsx
    } catch (error) {
      console.error("Logout error:", error);
      toast.success("Déconnexion réussie");
      // Même en cas d'erreur, on considère la déconnexion comme réussie
      // car la session locale sera nettoyée
    }
  };

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Tableau de bord", roles: ["admin", "service", "readonly"] },
    { path: "/orders", icon: ClipboardList, label: "Commandes", roles: ["admin", "service"] },
    { path: "/calendar", icon: Calendar, label: "Agenda", roles: ["admin", "service"] },
    { path: "/management", icon: BarChart3, label: "Gestion", roles: ["admin"] },
    { path: "/products", icon: Package, label: "Produits", roles: ["admin"] },
    { path: "/reports", icon: BarChart3, label: "Rapports", roles: ["admin", "service", "readonly"] },
    { path: "/settings", icon: Settings, label: "Paramètres", roles: ["admin"] },
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-cuisine text-white";
      case "service":
        return "bg-commande text-white";
      case "readonly":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "service":
        return "Service";
      case "readonly":
        return "Lecture";
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo & Toggle */}
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            {!isCollapsed && (
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-foreground">
                  Commandes Services
                </h1>
                {userRole && (
                  <Badge className={`mt-2 w-fit ${getRoleBadgeColor(userRole)}`}>
                    {getRoleLabel(userRole)}
                  </Badge>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn("h-8 w-8", isCollapsed && "mx-auto")}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const hasAccess = userRole && item.roles.includes(userRole);
              
              if (!hasAccess) return null;
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full gap-3",
                      isCollapsed ? "justify-center px-2" : "justify-start"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="border-t border-border p-3">
            <Button
              variant="ghost"
              className={cn(
                "w-full gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive",
                isCollapsed ? "justify-center px-2" : "justify-start"
              )}
              onClick={handleLogout}
              title={isCollapsed ? "Déconnexion" : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>Déconnexion</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main 
        className={cn(
          "transition-all duration-300",
          isCollapsed ? "pl-16" : "pl-64"
        )}
      >
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
