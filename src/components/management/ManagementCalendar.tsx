import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ManagementCalendarProps {
  orders: any[];
  services: any[];
}

const ManagementCalendar = ({ orders, services }: ManagementCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [filterService, setFilterService] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handlePreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  const getServiceColor = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.color || "#6b7280";
  };

  const handleDrop = async (e: React.DragEvent, newDate: Date) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData("orderId");
    const currentDueAt = e.dataTransfer.getData("dueAt");
    
    if (!orderId) return;

    const currentDate = new Date(currentDueAt);
    const newDueAt = new Date(newDate);
    newDueAt.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);

    try {
      const { error } = await supabase
        .from("orders")
        .update({ due_at: newDueAt.toISOString() })
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Date modifiée avec succès");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Erreur lors de la modification");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getOrdersForDay = (day: Date) => {
    return orders.filter(order => {
      const orderDate = startOfDay(new Date(order.due_at));
      const dayDate = startOfDay(day);
      
      const matchesDate = isSameDay(orderDate, dayDate);
      const matchesService = filterService === "all" || order.service_id === filterService;
      const matchesStatus = filterStatus === "all" || order.status === filterStatus;
      
      return matchesDate && matchesService && matchesStatus;
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters and Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousWeek}
            title="Semaine précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[200px] text-center font-semibold">
            {format(weekStart, "d MMM", { locale: fr })} - {format(weekEnd, "d MMM yyyy", { locale: fr })}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextWeek}
            title="Semaine suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const weekParam = currentWeek.toISOString().split("T")[0];
              window.open(`/print/planning?week=${weekParam}`, "_blank");
            }}
            className="ml-4"
            title="Imprimer le planning"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les services</SelectItem>
              {services.map(service => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="a_faire">À faire</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="pret">Prêt</SelectItem>
              <SelectItem value="livre">Livré</SelectItem>
              <SelectItem value="annule">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {daysOfWeek.map((day) => {
          const dayOrders = getOrdersForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={day.toISOString()}
              className={`p-3 min-h-[300px] ${isToday ? 'ring-2 ring-primary' : ''}`}
              onDrop={(e) => handleDrop(e, day)}
              onDragOver={handleDragOver}
            >
              <div className="font-semibold mb-3 text-center">
                <div className="text-sm text-muted-foreground">
                  {format(day, "EEE", { locale: fr })}
                </div>
                <div className={isToday ? "text-primary" : ""}>
                  {format(day, "d MMM", { locale: fr })}
                </div>
              </div>

              <div className="space-y-2">
                {dayOrders.map((order) => (
                  <div
                    key={order.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("orderId", order.id);
                      e.dataTransfer.setData("dueAt", order.due_at);
                    }}
                    className="p-2 rounded-md text-xs cursor-move hover:shadow-md transition-shadow"
                    style={{
                      backgroundColor: `${getServiceColor(order.service_id)}20`,
                      borderLeft: `3px solid ${getServiceColor(order.service_id)}`
                    }}
                  >
                    <div className="font-medium truncate">
                      {order.customers?.name || "Sans client"}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {order.services?.name}
                    </div>
                    <div className="text-muted-foreground">
                      {format(new Date(order.due_at), "HH:mm")}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-4 border-t">
        <div className="text-sm font-medium">Services:</div>
        {services.map(service => (
          <div key={service.id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: service.color }}
            />
            <span className="text-sm">{service.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagementCalendar;
