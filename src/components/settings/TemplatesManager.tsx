import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit3, Trash2, X } from "lucide-react";
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

interface TemplateItem {
  product_name: string;
  quantity: number;
  unit: string;
  comment: string;
}

const TemplatesManager = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    template_name: "",
    default_service_id: "",
    items_json: [] as TemplateItem[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [templatesData, servicesData, productsData] = await Promise.all([
      supabase.from("templates").select("*, services(name)").order("template_name"),
      supabase.from("services").select("*").eq("active", true).order("name"),
      supabase.from("products").select("*").eq("active", true).order("name"),
    ]);

    if (templatesData.data) setTemplates(templatesData.data);
    if (servicesData.data) setServices(servicesData.data);
    if (productsData.data) setProducts(productsData.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.template_name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    if (formData.items_json.length === 0) {
      toast.error("Ajoutez au moins un article");
      return;
    }

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from("templates")
          .update({
            template_name: formData.template_name,
            default_service_id: formData.default_service_id || null,
            items_json: formData.items_json as any,
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Modèle modifié");
      } else {
        const { error } = await supabase
          .from("templates")
          .insert([{
            template_name: formData.template_name,
            default_service_id: formData.default_service_id || null,
            items_json: formData.items_json as any,
          }]);

        if (error) throw error;
        toast.success("Modèle créé");
      }

      loadData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      default_service_id: template.default_service_id || "",
      items_json: template.items_json || [],
    });
    setShowDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast.success("Modèle supprimé");
      loadData();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteId(null);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingTemplate(null);
    setFormData({
      template_name: "",
      default_service_id: "",
      items_json: [],
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items_json: [
        ...formData.items_json,
        { product_name: "", quantity: 1, unit: "unité", comment: "" },
      ],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items_json: formData.items_json.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: keyof TemplateItem, value: any) => {
    const updatedItems = [...formData.items_json];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items_json: updatedItems });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestion des modèles</h2>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau modèle
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom du modèle</TableHead>
              <TableHead>Service par défaut</TableHead>
              <TableHead>Nb articles</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Aucun modèle
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.template_name}</TableCell>
                  <TableCell>{template.services?.name || "-"}</TableCell>
                  <TableCell>{template.items_json?.length || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(template.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Modifier le modèle" : "Nouveau modèle"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="template_name">Nom du modèle *</Label>
              <Input
                id="template_name"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                maxLength={200}
                required
              />
            </div>

            <div>
              <Label htmlFor="default_service_id">Service par défaut</Label>
              <Select
                value={formData.default_service_id}
                onValueChange={(value) => setFormData({ ...formData, default_service_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Articles du modèle *</Label>
                <Button type="button" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              {formData.items_json.map((item, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <div className="col-span-2">
                        <Label className="text-xs">Produit *</Label>
                        <Input
                          value={item.product_name}
                          onChange={(e) => updateItem(index, "product_name", e.target.value)}
                          list={`products-${index}`}
                          required
                        />
                        <datalist id={`products-${index}`}>
                          {products.map((p) => (
                            <option key={p.id} value={p.name} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <Label className="text-xs">Quantité *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value))}
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Unité *</Label>
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(index, "unit", e.target.value)}
                          required
                        />
                      </div>

                      <div className="col-span-4">
                        <Label className="text-xs">Commentaire</Label>
                        <Input
                          value={item.comment}
                          onChange={(e) => updateItem(index, "comment", e.target.value)}
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="shrink-0 mt-5"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}

              {formData.items_json.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">
                  Aucun article - Cliquez sur "Ajouter" pour commencer
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Annuler
              </Button>
              <Button type="submit">
                {editingTemplate ? "Modifier" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce modèle ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TemplatesManager;
