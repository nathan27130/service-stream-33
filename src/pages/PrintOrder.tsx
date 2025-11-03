import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import OrderSlip from "@/components/print/OrderSlip";
import { Loader2 } from "lucide-react";

const PrintOrder = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("id");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customers(*),
          services(*),
          order_items(*)
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      if (data) {
        setOrder(data);
        // Auto-print after data loads
        setTimeout(() => window.print(), 500);
      }
    } catch (error) {
      console.error("Error loading order:", error);
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

  if (!order) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Commande introuvable</p>
      </div>
    );
  }

  return <OrderSlip order={order} />;
};

export default PrintOrder;
