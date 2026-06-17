import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OrderDetailsDialog from "@/components/orders/OrderDetailsDialog";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarMonthViewProps {
  serviceId: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const CalendarMonthView = ({ serviceId, selectedDate, onDateChange }: CalendarMonthViewProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [draggedOrder, setDraggedOrder] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { locale: fr });
  const calendarEnd = endOfWeek(monthEnd, { locale: fr });
  
  // Generate all days to display (including previous/next month days)
  const days: Date[] = [];
  let currentDay = calendarStart;
  while (currentDay <= calendarEnd) {
    days.push(currentDay);
    currentDay = addDays(currentDay, 1);
  }

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel('calendar-month-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          ...(serviceId !== "all" ? { filter: `service_id=eq.${serviceId}` } : {})
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
    const start = startOfWeek(startOfMonth(selectedDate), { locale: fr });
    const end = endOfWeek(endOfMonth(selectedDate), { locale: fr });

    let query = supabase
      .from("orders")
      .select(`
        *,
        customers(*),
        order_items(product_name, quantity),
        services(name, color)
      `)
      .gte("due_at", start.toISOString())
      .lte("due_at", end.toISOString())
      .order("due_at");

    if (serviceId !== "all") {
      query = query.eq("service_id", serviceId);
    }

    const { data, error } = await query;

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
      case "a_faire": return "bg-red-500/10 border-red-500";
      case "en_cours": return "bg-yellow-500/10 border-yellow-500";
      case "pret": return "bg-green-500/10 border-green-500";
      case "livre": return "bg-gray-500/10 border-gray-500";
      case "annule": return "bg-destructive/10 border-destructive";
      default: return "bg-muted";
    }
  };

  const goToPreviousMonth = () => {
    onDateChange(addMonths(selectedDate, -1));
  };

  const goToNextMonth = () => {
    onDateChange(addMonths(selectedDate, 1));
  };

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h3 className="text-lg font-semibold">
              {format(selectedDate, "MMMM yyyy", { locale: fr })}
            </h3>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Calendar grid */}
      <div className="space-y-2">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayOrders = getOrdersForDay(day);
            const remainingCount = getRemainingCountForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, selectedDate);

            return (
              <div
                key={day.toISOString()}
                className={`border rounded-lg overflow-hidden min-h-[120px] ${
                  isToday ? "ring-2 ring-primary" : ""
                } ${!isCurrentMonth ? "opacity-40" : ""}`}
              >
                {/* Day header */}
                <div className={`p-2 border-b ${isToday ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">
                      {format(day, "d")}
                    </div>
                    {remainingCount > 0 && (
                      <Badge 
                        variant={isToday ? "secondary" : "default"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {remainingCount}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Orders */}
                <div
                  className="p-1 space-y-1 max-h-[100px] overflow-y-auto"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  {dayOrders.length === 0 ? (
                    <div className="text-center text-muted-foreground text-[10px] py-2">
                      -
                    </div>
                  ) : (
                    dayOrders.slice(0, 3).map((order, index) => {
                      const itemsSummary = order.order_items?.[0]?.product_name || "";

                      return (
                        <Card
                          key={order.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, order)}
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setDetailsDialogOpen(true);
                          }}
                          className={`p-1 cursor-pointer hover:shadow-sm transition-all text-[10px] border-l-2 ${getStatusColor(order.status)}`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold truncate">
                              {format(new Date(order.due_at), "HH:mm")}
                            </div>
                            <div className="truncate text-muted-foreground">
                              {order.customers?.name || "Sans client"}
                            </div>
                            {order.priority === "haute" && (
                              <Badge variant="destructive" className="text-[8px] px-0.5 py-0">
                                !
                              </Badge>
                            )}
                          </div>
                        </Card>
                      );
                    })
                  )}
                  {dayOrders.length > 3 && (
                    <div className="text-center text-muted-foreground text-[10px] py-1">
                      +{dayOrders.length - 3} autres
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <OrderDetailsDialog
        orderId={selectedOrderId}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
};

export default CalendarMonthView;
