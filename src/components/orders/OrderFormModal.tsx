import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";

type OrderType = Database["public"]["Enums"]["order_type"];
type OrderStatus = Database["public"]["Enums"]["order_status"];
type OrderPriority = Database["public"]["Enums"]["order_priority"];
type LocationType = Database["public"]["Enums"]["location_type"];

interface OrderItem {
  product_name: string;
  quantity: number;
  unit: string;
  comment: string;
  service_id?: string;
}

interface OrderFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editOrder?: any;
}

const OrderFormModal = ({ open, onOpenChange, onSuccess, editOrder }: OrderFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", default_address: "" });
  const [serviceId, setServiceId] = useState("");
  const [type, setType] = useState<OrderType>("produit_simple");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [location, setLocation] = useState<LocationType>("retrait");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<OrderStatus>("a_faire");
  const [priority, setPriority] = useState<OrderPriority>("normale");
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { product_name: "", quantity: 1, unit: "unité", comment: "" }
  ]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      // Fetch every list AND the order's items in parallel, then apply
      // all state in one synchronous block so Radix <Select> sees its
      // value AND the matching <SelectItem> in the same render pass.
      const [customersData, servicesData, productsData, templatesData, itemsData] =
        await Promise.all([
          supabase.from("customers").select("*").order("name"),
          supabase.from("services").select("*").eq("active", true).order("name"),
          supabase.from("products").select("*").eq("active", true).order("name"),
          supabase.from("templates").select("*, services(name)").order("template_name"),
          editOrder
            ? supabase
                .from("order_items")
                .select("product_name, quantity, unit, comment")
                .eq("order_id", editOrder.id)
                .order("created_at", { ascending: true })
            : Promise.resolve({ data: null, error: null }),
        ]);

      let customersList = customersData.data || [];
      let servicesList = servicesData.data || [];

      if (editOrder) {
        if (
          editOrder.customers &&
          !customersList.some((c: any) => c.id === editOrder.customers.id)
        ) {
          customersList = [editOrder.customers, ...customersList];
        }
        if (
          editOrder.services &&
          !servicesList.some((s: any) => s.id === editOrder.services.id)
        ) {
          servicesList = [editOrder.services, ...servicesList];
        }
      }

      setCustomers(customersList);
      setServices(servicesList);
      setProducts(productsData.data || []);
      setTemplates(templatesData.data || []);

      if (editOrder) {
        
        setShowNewCustomer(false);
        setCustomerId(editOrder.customer_id || "");
        setServiceId(editOrder.service_id || "");
        setType(editOrder.type);
        const dueAt = new Date(editOrder.due_at);
        setDueDate(format(dueAt, "yyyy-MM-dd"));
        setDueTime(format(dueAt, "HH:mm"));
        setLocation(editOrder.location);
        setAddress(editOrder.address || "");
        setStatus(editOrder.status);
        setPriority(editOrder.priority);
        setNotes(editOrder.notes || "");

        const items = itemsData.data;
        if (items && items.length > 0) {
          setOrderItems(
            items.map((i: any) => ({
              product_name: i.product_name || "",
              quantity: Number(i.quantity) || 1,
              unit: i.unit || "unité",
              comment: i.comment || "",
            }))
          );
        } else {
          setOrderItems([{ product_name: "", quantity: 1, unit: "unité", comment: "" }]);
        }
      } else {
        resetForm();
      }
    })();
  }, [open, editOrder]);

  const resetForm = () => {
    setCustomerId("");
    setNewCustomer({ name: "", phone: "", email: "", default_address: "" });
    setServiceId("");
    setType("produit_simple");
    setDueDate("");
    setDueTime("");
    setLocation("retrait");
    setAddress("");
    setStatus("a_faire");
    setPriority("normale");
    setNotes("");
    setOrderItems([{ product_name: "", quantity: 1, unit: "unité", comment: "" }]);
    setShowNewCustomer(false);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { product_name: "", quantity: 1, unit: "unité", comment: "" }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    setOrderItems(updated);
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Apply template items
    if (template.items_json && Array.isArray(template.items_json)) {
      setOrderItems(template.items_json.map((item: any) => ({
        product_name: item.product_name || "",
        quantity: item.quantity || 1,
        unit: item.unit || "unité",
        comment: item.comment || "",
      })));
    }

    // Apply default service if set
    if (template.default_service_id) {
      setServiceId(template.default_service_id);
    }

    toast.success(`Modèle "${template.template_name}" appliqué`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!serviceId || !dueDate || !dueTime) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        setLoading(false);
        return;
      }

      let finalCustomerId = customerId;

      // Create new customer if needed
      if (showNewCustomer && !customerId) {
        if (!newCustomer.name) {
          toast.error("Le nom du client est obligatoire");
          setLoading(false);
          return;
        }

        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .insert([newCustomer])
          .select()
          .single();

        if (customerError) throw customerError;
        finalCustomerId = customerData.id;
      }

      // Combine date and time
      const dueAt = new Date(`${dueDate}T${dueTime}`);

      const orderPayload = {
        customer_id: finalCustomerId || null,
        service_id: serviceId,
        type,
        due_at: dueAt.toISOString(),
        location,
        address: address || null,
        status,
        priority,
        notes: notes || null,
      };

      let orderId: string;
      if (editOrder) {
        const { error: updateError } = await supabase
          .from("orders")
          .update(orderPayload)
          .eq("id", editOrder.id);
        if (updateError) throw updateError;
        orderId = editOrder.id;
      } else {
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .insert([orderPayload])
          .select()
          .single();
        if (orderError) throw orderError;
        orderId = orderData.id;
      }

      // Create order items and add new products to catalog
      const validItems = orderItems.filter(item => item.product_name);

      // Add any new products to catalog
      for (const item of validItems) {
        const productExists = products.some(
          p => p.name.toLowerCase() === item.product_name.toLowerCase()
        );
        if (!productExists) {
          const { error: productError } = await supabase
            .from("products")
            .insert([{ name: item.product_name, unit: item.unit, active: true }]);
          if (productError) console.error("Error creating product:", productError);
        }
      }

      // For edits, replace existing items
      if (editOrder) {
        const { error: delError } = await supabase
          .from("order_items")
          .delete()
          .eq("order_id", orderId);
        if (delError) throw delError;
      }

      if (validItems.length > 0) {
        const itemsToInsert = validItems.map(item => ({
          order_id: orderId,
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          comment: item.comment || null,
        }));
        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      toast.success(editOrder ? "Commande mise à jour" : "Commande créée avec succès !");

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error(error.message || "Erreur lors de la création de la commande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {editOrder ? "Modifier la commande" : "Nouvelle commande"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Client</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewCustomer(!showNewCustomer)}
              >
                {showNewCustomer ? "Sélectionner existant" : "Nouveau client"}
              </Button>
            </div>

            {showNewCustomer ? (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <div className="col-span-2">
                  <Label>Nom *</Label>
                  <Input
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Adresse par défaut</Label>
                  <Input
                    value={newCustomer.default_address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, default_address: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <Select
                key={`customer-${customers.length}-${customerId}`}
                value={customerId}
                onValueChange={setCustomerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un client" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone && `(${customer.phone})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Service *</Label>
              <Select
                key={`service-${services.length}-${serviceId}`}
                value={serviceId}
                onValueChange={setServiceId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }} />
                        {service.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as OrderType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="produit_simple">Produit simple</SelectItem>
                  <SelectItem value="traiteur">Traiteur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date prêt à *</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Heure prêt à *</Label>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Lieu</Label>
              <Select value={location} onValueChange={(v) => setLocation(v as LocationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retrait">Retrait</SelectItem>
                  <SelectItem value="livraison">Livraison</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {location === "livraison" && (
              <div>
                <Label>Adresse de livraison</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Adresse complète"
                />
              </div>
            )}

            <div>
              <Label>Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_faire">À faire</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="pret">Prêt</SelectItem>
                  <SelectItem value="livre">Livré</SelectItem>
                  <SelectItem value="annule">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as OrderPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basse">Basse</SelectItem>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="haute">Haute</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes internes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes et instructions spéciales..."
              rows={3}
            />
          </div>

          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <Label>Utiliser un modèle</Label>
              <Select onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un modèle de commande" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.template_name}
                      {template.services && ` (${template.services.name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Le modèle remplacera les articles actuels
              </p>
            </div>
          )}

          {/* Order Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Produits</Label>
              <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un produit
              </Button>
            </div>

            <div className="space-y-3">
              {orderItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                  <div className="col-span-4">
                    <Label className="text-xs">Produit</Label>
                    <Input
                      list={`products-${index}`}
                      value={item.product_name}
                      onChange={(e) => updateOrderItem(index, "product_name", e.target.value)}
                      placeholder="Nom du produit"
                    />
                    <datalist id={`products-${index}`}>
                      {products.map((product) => (
                        <option key={product.id} value={product.name} />
                      ))}
                    </datalist>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Quantité</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateOrderItem(index, "quantity", parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Unité</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) => updateOrderItem(index, "unit", e.target.value)}
                    />
                  </div>

                  <div className="col-span-3">
                    <Label className="text-xs">Commentaire</Label>
                    <Input
                      value={item.comment}
                      onChange={(e) => updateOrderItem(index, "comment", e.target.value)}
                      placeholder="Optionnel"
                    />
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOrderItem(index)}
                      disabled={orderItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editOrder ? "Enregistrer" : "Créer la commande"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OrderFormModal;
