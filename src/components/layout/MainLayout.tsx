import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Calendar, 
  Settings, 
  LogOut,
  ClipboardList,
  Package,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, hasRole } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate("/auth");
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
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex flex-col border-b border-border px-6 py-4">
            <h1 className="text-xl font-bold text-foreground">
              Commandes Services
            </h1>
            {userRole && (
              <Badge className={`mt-2 w-fit ${getRoleBadgeColor(userRole)}`}>
                {getRoleLabel(userRole)}
              </Badge>
            )}
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
                    className="w-full justify-start gap-3"
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="border-t border-border p-3">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
