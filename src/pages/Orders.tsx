import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import OrderFormModal from "@/components/orders/OrderFormModal";
import OrdersTable from "@/components/orders/OrdersTable";
import { useAuth } from "@/contexts/AuthContext";

const Orders = () => {
  const { serviceId, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  useEffect(() => {
    loadOrders();
  }, [serviceId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("orders")
        .select(`
          *,
          customers(*),
          services(*)
        `)
        .order("due_at", { ascending: false });

      // Filter by service if service role
      if (hasRole("service") && serviceId) {
        query = query.eq("service_id", serviceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order: any) => {
    setEditingOrder(order);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingOrder(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Commandes</h1>
            <p className="text-muted-foreground mt-2">
              Gérez toutes vos commandes clients
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowModal(true)}>
            <Plus className="h-5 w-5" />
            Nouvelle commande
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <OrdersTable 
            orders={orders} 
            onRefresh={loadOrders}
            onEdit={handleEdit}
          />
        )}

        <OrderFormModal
          open={showModal}
          onOpenChange={handleModalClose}
          onSuccess={loadOrders}
          editOrder={editingOrder}
        />
      </div>
    </MainLayout>
  );
};

export default Orders;
