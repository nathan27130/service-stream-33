import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import WeeklyPlanning from "@/components/print/WeeklyPlanning";
import { Loader2 } from "lucide-react";
import { startOfWeek, endOfWeek } from "date-fns";

const PrintPlanning = () => {
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get("service");
  const weekParam = searchParams.get("week");
  const [orders, setOrders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDate = weekParam ? new Date(weekParam) : new Date();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });

      // Load orders for the week
      let ordersQuery = supabase
        .from("orders")
        .select(`
          *,
          customers(*),
          services(*)
        `)
        .gte("due_at", weekStart.toISOString())
        .lte("due_at", weekEnd.toISOString())
        .order("due_at");

      if (serviceId) {
        ordersQuery = ordersQuery.eq("service_id", serviceId);
      }

      const { data: ordersData, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      // Load services
      let servicesQuery = supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("name");

      if (serviceId) {
        servicesQuery = servicesQuery.eq("id", serviceId);
      }

      const { data: servicesData, error: servicesError } = await servicesQuery;
      if (servicesError) throw servicesError;

      if (ordersData) setOrders(ordersData);
      if (servicesData) setServices(servicesData);

      // Auto-print after data loads
      setTimeout(() => window.print(), 500);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <WeeklyPlanning
      orders={orders}
      services={services}
      weekDate={weekDate}
      serviceId={serviceId || undefined}
    />
  );
};

export default PrintPlanning;
