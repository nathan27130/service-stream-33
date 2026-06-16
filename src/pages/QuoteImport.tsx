import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Plus, Trash2, CheckCircle2 } from "lucide-react";

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface ExtractedLine {
  description: string;
  quantite: number;
  unite: string | null;
  prix_unitaire_ttc: number;
  total_ttc: number;
  service_suggere: "cuisine" | "charcuterie" | "commande" | "boutique";
}

interface ExtractedData {
  client: { nom: string; adresse: string | null; email: string | null; telephone: string | null };
  numero_devis: string | null;
  date_devis: string | null;
  date_prestation: string | null;
  heure_livraison: string | null;
  nb_personnes: number | null;
  customer_type: "particulier" | "pro" | "traiteur";
  lignes: ExtractedLine[];
  total_ht: number | null;
  total_ttc: number | null;
  tva: number | null;
  notes: string | null;
}

export default function QuoteImport() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [result, setResult] = useState<ExtractedData | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [existingCustomer, setExistingCustomer] = useState<any | null>(null);

  useEffect(() => {
    supabase.from("services").select("*").eq("active", true).order("name").then(({ data }) => {
      if (data) setServices(data);
    });
  }, []);

  const handleExtract = async () => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("PDF trop volumineux (max 15 Mo).");
      return;
    }

    setLoading(true);
    setResult(null);
    setCreated(false);
    try {
      const pdfBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("extract-quote", {
        body: { pdfBase64, filename: file.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const extracted = data?.data as ExtractedData;
      setResult(extracted);

      // Vérifie si ce client existe déjà (par nom) pour éviter les doublons
      if (extracted?.client?.nom) {
        const { data: match } = await supabase
          .from("customers")
          .select("*")
          .ilike("name", extracted.client.nom)
          .maybeSingle();
        setExistingCustomer(match ?? null);
      }

      toast.success("Devis extrait — vérifie les informations avant de créer la commande");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Échec de l'extraction");
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (index: number, field: keyof ExtractedLine, value: any) => {
    if (!result) return;
    const lignes = [...result.lignes];
    lignes[index] = { ...lignes[index], [field]: value };
    setResult({ ...result, lignes });
  };

  const removeLine = (index: number) => {
    if (!result) return;
    setResult({ ...result, lignes: result.lignes.filter((_, i) => i !== index) });
  };

  const addLine = () => {
    if (!result) return;
    setResult({
      ...result,
      lignes: [
        ...result.lignes,
        { description: "", quantite: 1, unite: "unité", prix_unitaire_ttc: 0, total_ttc: 0, service_suggere: "commande" },
      ],
    });
  };

  const serviceIdForType = (type: string) => services.find((s) => s.type === type)?.id;

  const handleCreateOrder = async () => {
    if (!result) return;
    if (result.lignes.length === 0) {
      toast.error("Ajoute au moins une ligne de produit");
      return;
    }

    setCreating(true);
    try {
      // 1. Client : on réutilise le client existant trouvé, sinon on en crée un
      let customerId = existingCustomer?.id;
      if (!customerId && result.client?.nom) {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert([{
            name: result.client.nom,
            email: result.client.email || null,
            phone: result.client.telephone || null,
            default_address: result.client.adresse || null,
            customer_type: result.customer_type || "particulier",
          }])
          .select()
          .single();
        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // 2. Les lignes peuvent viser des services différents : on regroupe
      //    les lignes par service suggéré et on crée une commande par service,
      //    pour que chaque équipe (tablette) ne voie que ce qui la concerne.
      const grouped = new Map<string, ExtractedLine[]>();
      for (const ligne of result.lignes) {
        const key = ligne.service_suggere || "commande";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(ligne);
      }

      const dueDateRaw = result.date_prestation || new Date().toISOString().slice(0, 10);
      const dueTimeRaw = result.heure_livraison?.match(/\d{2}:\d{2}/)?.[0] || "12:00";
      const dueAt = new Date(`${dueDateRaw}T${dueTimeRaw}`);

      const isTraiteur = result.customer_type === "traiteur";
      const notesParts = [
        result.numero_devis ? `Devis n° ${result.numero_devis}` : null,
        result.nb_personnes ? `${result.nb_personnes} personnes` : null,
        result.notes,
      ].filter(Boolean);

      let createdCount = 0;
      for (const [serviceType, lignes] of grouped.entries()) {
        const serviceId = serviceIdForType(serviceType);
        if (!serviceId) continue;

        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert([{
            customer_id: customerId || null,
            service_id: serviceId,
            type: isTraiteur ? "traiteur" : "produit_simple",
            due_at: dueAt.toISOString(),
            location: "livraison",
            status: "a_faire",
            priority: isTraiteur ? "haute" : "normale",
            notes: notesParts.join(" — ") || null,
          }])
          .select()
          .single();
        if (orderError) throw orderError;

        const itemsToInsert = lignes.map((l) => ({
          order_id: order.id,
          product_name: l.description,
          quantity: l.quantite,
          unit: l.unite || "unité",
          comment: null,
        }));
        const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
        if (itemsError) throw itemsError;

        createdCount++;
      }

      toast.success(`${createdCount} commande(s) créée(s) et dispatchée(s) par service`);
      setCreated(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erreur lors de la création de la commande");
    } finally {
      setCreating(false);
    }
  };

  const serviceLabel: Record<string, string> = {
    cuisine: "Cuisine",
    charcuterie: "Charcuterie",
    commande: "Commande",
    boutique: "Boutique",
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importer un devis IsaFact</h1>
        <p className="text-muted-foreground">
          Téléverse un PDF de devis, l'IA extrait les informations et propose un dispatch par service.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Fichier PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button onClick={handleExtract} disabled={!file || loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extraction…</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" /> Extraire</>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && !created && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>2. Client</CardTitle>
              {existingCustomer && (
                <CardDescription>
                  Client existant trouvé : {existingCustomer.name} — il sera réutilisé (pas de doublon créé).
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom</Label>
                <Input
                  value={result.client?.nom || ""}
                  onChange={(e) => setResult({ ...result, client: { ...result.client, nom: e.target.value } })}
                />
              </div>
              <div>
                <Label>Type de client</Label>
                <Select
                  value={result.customer_type}
                  onValueChange={(v) => setResult({ ...result, customer_type: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particulier">Particulier</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="traiteur">Traiteur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date de prestation</Label>
                <Input
                  type="date"
                  value={result.date_prestation || ""}
                  onChange={(e) => setResult({ ...result, date_prestation: e.target.value })}
                />
              </div>
              <div>
                <Label>Heure de livraison</Label>
                <Input
                  value={result.heure_livraison || ""}
                  onChange={(e) => setResult({ ...result, heure_livraison: e.target.value })}
                  placeholder="ex: 14h-16h"
                />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={result.notes || ""}
                  onChange={(e) => setResult({ ...result, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Produits et dispatch par service</CardTitle>
              <CardDescription>
                Le service est proposé automatiquement à partir du devis. Corrige-le si besoin avant de créer la commande.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.lignes.map((ligne, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                  <div className="col-span-4">
                    <Label className="text-xs">Désignation</Label>
                    <Input
                      value={ligne.description}
                      onChange={(e) => updateLine(index, "description", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Quantité</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={ligne.quantite}
                      onChange={(e) => updateLine(index, "quantite", parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Unité</Label>
                    <Input
                      value={ligne.unite || ""}
                      onChange={(e) => updateLine(index, "unite", e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Service</Label>
                    <Select
                      value={ligne.service_suggere}
                      onValueChange={(v) => updateLine(index, "service_suggere", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(serviceLabel).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter une ligne
              </Button>

              {result.total_ttc != null && (
                <p className="text-sm text-muted-foreground pt-2">
                  Total TTC du devis : <span className="font-medium text-foreground">{result.total_ttc.toFixed(2)} €</span>
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleCreateOrder} disabled={creating} size="lg">
              {creating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création…</>
              ) : (
                "Créer la ou les commandes"
              )}
            </Button>
          </div>
        </>
      )}

      {created && (
        <Card className="border-green-500">
          <CardContent className="flex items-center gap-3 py-6">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium">Commande(s) créée(s) avec succès</p>
              <p className="text-sm text-muted-foreground">
                Elles sont visibles dans le tableau de bord, dispatchées par service.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
