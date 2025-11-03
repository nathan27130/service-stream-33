import { useState, useEffect } from "react";
import { format, startOfDay, endOfDay, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import OrderDetailsDialog from "@/components/orders/OrderDetailsDialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarDayViewProps {
  serviceId: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const CalendarDayView = ({ serviceId, selectedDate, onDateChange }: CalendarDayViewProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, done: 0, remaining: 0 });
  const [draggedOrder, setDraggedOrder] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    loadOrders();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('calendar-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `service_id=eq.${serviceId}`
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceId, selectedDate]);

  const loadOrders = async () => {
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        customers(*),
        order_items(product_name, quantity)
      `)
      .eq("service_id", serviceId)
      .gte("due_at", start.toISOString())
      .lte("due_at", end.toISOString())
      .order("due_at");

    if (error) {
      console.error("Error loading orders:", error);
      return;
    }

    setOrders(data || []);
    calculateStats(data || []);
  };

  const calculateStats = (ordersData: any[]) => {
    const total = ordersData.length;
    const done = ordersData.filter(o => ["pret", "livre"].includes(o.status)).length;
    const remaining = ordersData.filter(o => ["a_faire", "en_cours"].includes(o.status)).length;
    setStats({ total, done, remaining });
  };

  const handleDragStart = (e: React.DragEvent, order: any) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetHour: number) => {
    e.preventDefault();
    
    if (!draggedOrder) return;

    const newDate = new Date(selectedDate);
    newDate.setHours(targetHour, 0, 0, 0);

    try {
      const { error } = await supabase
        .from("orders")
        .update({ due_at: newDate.toISOString() })
        .eq("id", draggedOrder.id);

      if (error) throw error;

      toast.success("Heure de la commande mise à jour");
      loadOrders();
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setDraggedOrder(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "a_faire": return "bg-red-500/10 border-red-500";
      case "en_cours": return "bg-yellow-500/10 border-yellow-500";
      case "pret": return "bg-green-500/10 border-green-500";
      case "livre": return "bg-gray-500/10 border-gray-500";
      case "annule": return "bg-destructive/10 border-destructive";
      default: return "bg-muted";
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getOrdersForHour = (hour: number) => {
    return orders.filter(order => {
      const orderHour = new Date(order.due_at).getHours();
      return orderHour === hour;
    });
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h3 className="text-lg font-semibold">
              {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
            </h3>
            <Button variant="ghost" size="icon" onClick={goToNextDay}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tâches du jour :</span>
              <Badge variant="secondary" className="font-semibold">
                {stats.total} au total
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-commande">✅</span>
              <span className="font-medium">{stats.done} terminées</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-500">⏳</span>
              <span className="font-medium">{stats.remaining} restantes</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Time slots */}
      <div className="space-y-1">
        {hours.map(hour => {
          const hourOrders = getOrdersForHour(hour);
          
          return (
            <div
              key={hour}
              className="flex gap-2 min-h-[60px] border-b border-border/50 hover:bg-accent/30 transition-colors"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, hour)}
            >
              <div className="w-20 flex-shrink-0 py-2 text-sm text-muted-foreground font-medium">
                {hour.toString().padStart(2, '0')}:00
              </div>
              
              <div className="flex-1 py-2 space-y-2">
                {hourOrders.map(order => {
                  const itemsSummary = order.order_items
                    ?.slice(0, 2)
                    .map((item: any) => item.product_name)
                    .join(", ");
                  const moreItems = order.order_items?.length > 2 
                    ? ` +${order.order_items.length - 2}` 
                    : "";

                  return (
                    <Card
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order)}
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setDetailsDialogOpen(true);
                      }}
                      className={`p-3 cursor-pointer hover:shadow-md transition-all border-l-4 ${getStatusColor(order.status)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold truncate">
                              {order.customers?.name || "Sans client"}
                            </span>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {itemsSummary}{moreItems}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(order.due_at), "HH:mm")}
                          </p>
                        </div>
                        {order.priority === "haute" && (
                          <Badge variant="destructive" className="text-xs">
                            Haute
                          </Badge>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <OrderDetailsDialog
        orderId={selectedOrderId}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
};

export default CalendarDayView;
