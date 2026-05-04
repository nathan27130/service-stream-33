import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Search, Download, Edit3 } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";

interface ManagementTableProps {
  orders: any[];
  services: any[];
  onRefresh: () => void;
}

const ManagementTable = ({ orders, services, onRefresh }: ManagementTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterService, setFilterService] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<"status" | "service" | null>(null);
  const [bulkValue, setBulkValue] = useState("");

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === "" || 
      order.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesService = filterService === "all" || order.service_id === filterService;
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;
    
    let matchesPeriod = true;
    const orderDate = new Date(order.due_at);
    const now = new Date();
    
    if (filterPeriod === "today") {
      matchesPeriod = orderDate >= startOfDay(now) && orderDate <= endOfDay(now);
    } else if (filterPeriod === "week") {
      matchesPeriod = orderDate >= startOfWeek(now, { weekStartsOn: 1 }) && 
                      orderDate <= endOfWeek(now, { weekStartsOn: 1 });
    }
    
    return matchesSearch && matchesService && matchesStatus && matchesPeriod;
  });

  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleBulkAction = async () => {
    if (!bulkAction || !bulkValue || selectedOrders.length === 0) return;

    try {
      const updateData = bulkAction === "status" 
        ? { status: bulkValue as "a_faire" | "en_cours" | "pret" | "livre" | "annule" }
        : { service_id: bulkValue };

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .in("id", selectedOrders);

      if (error) throw error;

      toast.success(`${selectedOrders.length} commande(s) modifiée(s)`);
      setSelectedOrders([]);
      setShowBulkDialog(false);
      setBulkAction(null);
      setBulkValue("");
      onRefresh();
    } catch (error) {
      console.error("Error updating orders:", error);
      toast.error("Erreur lors de la modification");
    }
  };

  const exportToCSV = () => {
    const selectedData = orders.filter(o => selectedOrders.includes(o.id));
    
    const csvContent = [
      ["Date", "Client", "Service", "Type", "Statut", "Priorité", "Notes"].join(","),
      ...selectedData.map(order => [
        format(new Date(order.due_at), "dd/MM/yyyy HH:mm"),
        order.customers?.name || "",
        order.services?.name || "",
        order.type,
        order.status,
        order.priority,
        (order.notes || "").replace(/,/g, ";")
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `commandes_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    link.click();
    
    toast.success("Export CSV réussi");
  };

  const exportToPDF = () => {
    // Simple PDF export using window.print
    const selectedData = orders.filter(o => selectedOrders.includes(o.id));

    const escapeHtml = (s: unknown) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const printContent = `
      <html>
        <head>
          <title>Commandes - ${format(new Date(), "dd/MM/yyyy")}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Commandes - ${format(new Date(), "dd/MM/yyyy HH:mm")}</h1>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Service</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Priorité</th>
              </tr>
            </thead>
            <tbody>
              ${selectedData.map(order => `
                <tr>
                  <td>${escapeHtml(format(new Date(order.due_at), "dd/MM/yyyy HH:mm"))}</td>
                  <td>${escapeHtml(order.customers?.name || "")}</td>
                  <td>${escapeHtml(order.services?.name || "")}</td>
                  <td>${escapeHtml(order.type)}</td>
                  <td>${escapeHtml(order.status)}</td>
                  <td>${escapeHtml(order.priority)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      toast.success("Export PDF lancé");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes dates</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous services</SelectItem>
              {services.map(service => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="a_faire">À faire</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="pret">Prêt</SelectItem>
              <SelectItem value="livre">Livré</SelectItem>
              <SelectItem value="annule">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {selectedOrders.length} commande(s) sélectionnée(s)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkAction("status");
                  setShowBulkDialog(true);
                }}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Modifier statut
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkAction("service");
                  setShowBulkDialog(true);
                }}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Réassigner service
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Priorité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Aucune commande trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={() => toggleSelectOrder(order.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(order.due_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell>{order.customers?.name || "Sans client"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: order.services?.color }}
                      />
                      {order.services?.name}
                    </div>
                  </TableCell>
                  <TableCell>{order.type}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>{order.priority}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Bulk Action Dialog */}
      <AlertDialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "status" ? "Modifier le statut" : "Réassigner le service"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action modifiera {selectedOrders.length} commande(s).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            {bulkAction === "status" ? (
              <Select value={bulkValue} onValueChange={setBulkValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_faire">À faire</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="pret">Prêt</SelectItem>
                  <SelectItem value="livre">Livré</SelectItem>
                  <SelectItem value="annule">Annulé</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Select value={bulkValue} onValueChange={setBulkValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAction} disabled={!bulkValue}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManagementTable;
