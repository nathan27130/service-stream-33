import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/dashboard/StatCard";
import { ClipboardList, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    ready: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadData = async () => {
    try {
      // Load services
      const { data: servicesData } = await supabase
        .from("services")
        .select("*")
        .eq("active", true);
      
      if (servicesData) setServices(servicesData);

      // Load orders stats
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersData) {
        setStats({
          total: ordersData.length,
          pending: ordersData.filter((o) => o.status === "a_faire").length,
          inProgress: ordersData.filter((o) => o.status === "en_cours").length,
          ready: ordersData.filter((o) => o.status === "pret").length,
        });

        // Get recent orders with customer and service info
        const { data: recentData } = await supabase
          .from("orders")
          .select(`
            *,
            customers(*),
            services(*)
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        if (recentData) setRecentOrders(recentData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-2">
            Vue d'ensemble de vos commandes et services
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total commandes"
            value={stats.total}
            icon={ClipboardList}
          />
          <StatCard
            title="À faire"
            value={stats.pending}
            icon={Clock}
          />
          <StatCard
            title="En cours"
            value={stats.inProgress}
            icon={AlertTriangle}
          />
          <StatCard
            title="Prêtes"
            value={stats.ready}
            icon={CheckCircle}
          />
        </div>

        {/* Services Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Services</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <Card key={service.id} className="overflow-hidden">
                <div
                  className="h-2"
                  style={{ backgroundColor: service.color }}
                />
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {recentOrders.filter((o) => o.service_id === service.id).length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    commandes actives
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Commandes récentes</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentOrders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Aucune commande pour le moment
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="h-12 w-1 rounded-full"
                          style={{ backgroundColor: order.services?.color }}
                        />
                        <div>
                          <p className="font-medium">
                            {order.customers?.name || "Client inconnu"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.services?.name} • {format(new Date(order.due_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
