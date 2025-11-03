import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarWeekViewProps {
  serviceId: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const CalendarWeekView = ({ serviceId, selectedDate, onDateChange }: CalendarWeekViewProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [draggedOrder, setDraggedOrder] = useState<any>(null);
  const weekStart = startOfWeek(selectedDate, { locale: fr });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    loadOrders();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('calendar-week-updates')
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
    const start = startOfWeek(selectedDate, { locale: fr });
    const end = endOfWeek(selectedDate, { locale: fr });

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
  };

  const getRemainingCountForDay = (day: Date) => {
    const dayOrders = orders.filter(order => {
      const orderDate = new Date(order.due_at);
      return isSameDay(orderDate, day) && ["a_faire", "en_cours"].includes(order.status);
    });
    return dayOrders.length;
  };

  const getOrdersForDay = (day: Date) => {
    return orders.filter(order => {
      const orderDate = new Date(order.due_at);
      return isSameDay(orderDate, day);
    });
  };

  const handleDragStart = (e: React.DragEvent, order: any) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault();
    
    if (!draggedOrder) return;

    const oldDate = new Date(draggedOrder.due_at);
    const newDate = new Date(targetDay);
    newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);

    try {
      const { error } = await supabase
        .from("orders")
        .update({ due_at: newDate.toISOString() })
        .eq("id", draggedOrder.id);

      if (error) throw error;

      toast.success("Date de la commande mise à jour");
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
      case "a_faire": return "bg-muted border-muted-foreground/20";
      case "en_cours": return "bg-orange-500/10 border-orange-500";
      case "pret": return "bg-commande/10 border-commande";
      case "livre": return "bg-boutique/10 border-boutique";
      case "annule": return "bg-destructive/10 border-destructive";
      default: return "bg-muted";
    }
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h3 className="text-lg font-semibold">
              Semaine du {format(weekStart, "d MMMM", { locale: fr })} au {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: fr })}
            </h3>
            <Button variant="ghost" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayOrders = getOrdersForDay(day);
          const remainingCount = getRemainingCountForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`border rounded-lg overflow-hidden ${isToday ? "ring-2 ring-primary" : ""}`}
            >
              {/* Day header */}
              <div className={`p-3 border-b ${isToday ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">
                      {format(day, "EEEE", { locale: fr })}
                    </div>
                    <div className="text-lg font-bold">
                      {format(day, "d")}
                    </div>
                  </div>
                  {remainingCount > 0 && (
                    <Badge 
                      variant={isToday ? "secondary" : "default"}
                      className="font-semibold"
                    >
                      {remainingCount}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Orders */}
              <div
                className="p-2 space-y-2 min-h-[200px] max-h-[400px] overflow-y-auto"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
              >
                {dayOrders.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-4">
                    Aucune commande
                  </div>
                ) : (
                  dayOrders.map(order => {
                    const itemsSummary = order.order_items?.[0]?.product_name || "";
                    const moreItems = order.order_items?.length > 1 
                      ? ` +${order.order_items.length - 1}` 
                      : "";

                    return (
                      <Card
                        key={order.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, order)}
                        className={`p-2 cursor-move hover:shadow-md transition-all text-xs border-l-2 ${getStatusColor(order.status)}`}
                      >
                        <div className="space-y-1">
                          <div className="font-semibold truncate">
                            {format(new Date(order.due_at), "HH:mm")}
                          </div>
                          <div className="truncate">
                            {order.customers?.name || "Sans client"}
                          </div>
                          <div className="text-muted-foreground truncate">
                            {itemsSummary}{moreItems}
                          </div>
                          {order.priority === "haute" && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0">
                              !
                            </Badge>
                          )}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarWeekView;
