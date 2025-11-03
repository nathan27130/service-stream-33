import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Copy, Printer, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import OrderStatusBadge from "./OrderStatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface OrdersTableProps {
  orders: any[];
  onRefresh: () => void;
  onEdit: (order: any) => void;
}

const OrdersTable = ({ orders, onRefresh, onEdit }: OrdersTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    // Text search (customer name, notes, products)
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      order.customers?.name?.toLowerCase().includes(searchLower) ||
      order.notes?.toLowerCase().includes(searchLower);

    // Service filter
    const matchesService = serviceFilter === "all" || order.service_id === serviceFilter;

    // Status filter
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    // Date range filter
    const orderDate = new Date(order.due_at);
    const matchesDateFrom = !dateFrom || orderDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || orderDate <= new Date(dateTo + "T23:59:59");

    return matchesSearch && matchesService && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const handleDelete = async (orderId: string) => {
    try {
      // Delete order items first
      await supabase.from("order_items").delete().eq("order_id", orderId);
      
      // Delete order
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      
      if (error) throw error;
      
      toast.success("Commande supprimée");
      onRefresh();
    } catch (error: any) {
      console.error("Error deleting order:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteOrderId(null);
    }
  };

  const handleDuplicate = async (order: any) => {
    try {
      // Create new order (copy of existing)
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert([{
          customer_id: order.customer_id,
          service_id: order.service_id,
          type: order.type,
          due_at: order.due_at,
          location: order.location,
          address: order.address,
          status: "a_faire",
          priority: order.priority,
          notes: order.notes
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Fetch and duplicate order items
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      if (items && items.length > 0) {
        const newItems = items.map(item => ({
          order_id: newOrder.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          comment: item.comment
        }));

        await supabase.from("order_items").insert(newItems);
      }

      toast.success("Commande dupliquée");
      onRefresh();
    } catch (error: any) {
      console.error("Error duplicating order:", error);
      toast.error("Erreur lors de la duplication");
    }
  };

  const handlePrint = (order: any) => {
    window.open(`/print/order?id=${order.id}`, "_blank");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "haute":
        return "bg-destructive text-destructive-foreground";
      case "basse":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getTypeLabel = (type: string) => {
    return type === "produit_simple" ? "Produit" : "Traiteur";
  };

  const services = [...new Set(orders.map(o => o.services).filter(Boolean))];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-card border rounded-lg">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par client, notes, produits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Tous les services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les services</SelectItem>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
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

        <div className="flex gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="Date début"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="Date fin"
          />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredOrders.length} commande(s) trouvée(s)
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prêt à</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucune commande trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-accent/50">
                  <TableCell className="font-medium">
                    {format(new Date(order.due_at), "d MMM yyyy • HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customers?.name || "—"}</p>
                      {order.customers?.phone && (
                        <p className="text-xs text-muted-foreground">{order.customers.phone}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: order.services?.color }}
                      />
                      {order.services?.name}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeLabel(order.type)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(order.priority)}>
                      {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(order)}
                        title="Voir/Modifier"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(order)}
                        title="Dupliquer"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePrint(order)}
                        title="Imprimer bon"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteOrderId(order.id)}
                        title="Supprimer"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteOrderId} onOpenChange={() => setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteOrderId && handleDelete(deleteOrderId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrdersTable;
