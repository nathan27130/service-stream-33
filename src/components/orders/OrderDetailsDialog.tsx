import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import OrderStatusBadge from "./OrderStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, User, Phone, Mail, Package, FileText, AlertCircle, CheckCircle2, PlayCircle, ClockIcon } from "lucide-react";
import { toast } from "sonner";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface OrderDetailsDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OrderDetailsDialog = ({ orderId, open, onOpenChange }: OrderDetailsDialogProps) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId && open) {
      loadOrderDetails();
    }
  }, [orderId, open]);

  const loadOrderDetails = async () => {
    if (!orderId) return;
    
    setLoading(true);
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
      setOrder(data);
    } catch (error) {
      console.error("Error loading order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!orderId) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Statut de la commande mis à jour");
      loadOrderDetails();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  if (loading || !order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Chargement...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "haute": return "Haute";
      case "normale": return "Normale";
      case "basse": return "Basse";
      default: return priority;
    }
  };

  const getLocationLabel = (location: string) => {
    switch (location) {
      case "retrait": return "Retrait";
      case "livraison": return "Livraison";
      default: return location;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "produit_simple": return "Produit simple";
      case "produit_elabore": return "Produit élaboré";
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Détails de la commande</span>
            <OrderStatusBadge status={order.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Info */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Informations client
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{order.customers?.name || "Client inconnu"}</span>
              </div>
              {order.customers?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{order.customers.email}</span>
                </div>
              )}
              {order.customers?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{order.customers.phone}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Service & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Service</h3>
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: order.services?.color }}
                />
                <span>{order.services?.name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Date et heure
              </h3>
              <div className="text-sm">
                {format(new Date(order.due_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Type</h3>
              <Badge variant="outline">{getTypeLabel(order.type)}</Badge>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Priorité</h3>
              <Badge 
                variant={order.priority === "haute" ? "destructive" : "secondary"}
              >
                {getPriorityLabel(order.priority)}
              </Badge>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Lieu
              </h3>
              <span className="text-sm">{getLocationLabel(order.location)}</span>
            </div>

            {order.location === "livraison" && order.address && (
              <div className="space-y-2 col-span-2">
                <h3 className="font-semibold text-sm">Adresse de livraison</h3>
                <p className="text-sm text-muted-foreground">{order.address}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Order Items */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Articles commandés
            </h3>
            <div className="space-y-2">
              {order.order_items?.map((item: any) => (
                <div 
                  key={item.id} 
                  className="bg-muted/50 rounded-lg p-3 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.product_name}</div>
                    {item.comment && (
                      <div className="text-sm text-muted-foreground mt-1 flex items-start gap-2">
                        <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{item.comment}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-semibold">
                      {item.quantity} {item.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Notes
                </h3>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Créée le :</span>{" "}
              {format(new Date(order.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
            </div>
            {order.updated_at && (
              <div>
                <span className="font-medium">Modifiée le :</span>{" "}
                {format(new Date(order.updated_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
              </div>
            )}
          </div>

          {/* Status Update Buttons */}
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Changer le statut</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={order.status === "a_faire" ? "default" : "outline"}
                size="sm"
                onClick={() => updateOrderStatus("a_faire")}
                className="flex items-center gap-2"
              >
                <ClockIcon className="h-4 w-4" />
                À faire
              </Button>
              <Button
                variant={order.status === "en_cours" ? "default" : "outline"}
                size="sm"
                onClick={() => updateOrderStatus("en_cours")}
                className="flex items-center gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                En cours
              </Button>
              <Button
                variant={order.status === "pret" ? "default" : "outline"}
                size="sm"
                onClick={() => updateOrderStatus("pret")}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Prêt
              </Button>
              <Button
                variant={order.status === "livre" ? "default" : "outline"}
                size="sm"
                onClick={() => updateOrderStatus("livre")}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Livré
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
