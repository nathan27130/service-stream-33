import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ManagementCalendar from "@/components/management/ManagementCalendar";
import ManagementTable from "@/components/management/ManagementTable";
import { Loader2 } from "lucide-react";

const Management = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Realtime subscription
    const channel = supabase
      .channel('management-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      // Load services
      const { data: servicesData } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("name");

      if (servicesData) setServices(servicesData);

      // Load all orders with related data
      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          *,
          customers(*),
          services(*),
          order_items(*)
        `)
        .order("due_at", { ascending: true });

      if (ordersData) setOrders(ordersData);
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion</h1>
          <p className="text-muted-foreground mt-2">
            Vue d'ensemble et gestion globale des commandes
          </p>
        </div>

        <Tabs defaultValue="calendar" className="w-full">
          <TabsList>
            <TabsTrigger value="calendar">Calendrier</TabsTrigger>
            <TabsTrigger value="table">Tableau</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <ManagementCalendar orders={orders} services={services} />
          </TabsContent>

          <TabsContent value="table" className="mt-6">
            <ManagementTable 
              orders={orders} 
              services={services} 
              onRefresh={loadData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Management;
