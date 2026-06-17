import { useState, useEffect, useMemo } from "react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format } from "date-fns";
import { fr } from "date-fns/locale";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, CalendarRange, Loader2 } from "lucide-react";

interface RawItem {
  productName: string;
  unit: string;
  quantity: number;
}

interface ProductGroup {
  productName: string;
  unit: string;
  totalQuantity: number;
  items: RawItem[];
}

interface ServiceGroup {
  serviceId: string;
  serviceName: string;
  serviceType: string;
  groups: ProductGroup[];
}

const SERVICE_COLORS: Record<string, string> = {
  cuisine: "bg-cuisine/10 text-cuisine border-cuisine/30",
  charcuterie: "bg-charcuterie/10 text-charcuterie border-charcuterie/30",
  commande: "bg-commande/10 text-commande border-commande/30",
  boutique: "bg-boutique/10 text-boutique border-boutique/30",
  logistique: "bg-logistique/10 text-logistique border-logistique/30",
};

const normalizeText = (s: string) =>
  (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const normalizeProductName = (name: string) =>
  normalizeText(name).replace(/\s*\((pce|piece|pieces|unite|unites)\)\s*$/i, "");

const normalizeUnit = (unit: string) => {
  const value = normalizeText(unit || "unité").replace(/\./g, "");
  return ["pce", "piece", "pieces", "la piece", "unite", "unites", "unit"].includes(value)
    ? "unité"
    : value;
};

function formatQty(q: number) {
  return q % 1 === 0 ? String(q) : q.toFixed(2);
}

function ProductTable({ groups }: { groups: ProductGroup[] }) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-[1fr_120px_120px] gap-2 text-xs text-muted-foreground border-b border-border pb-1 mb-1">
        <span>Produit</span>
        <span className="text-right">Qté</span>
        <span className="text-right">Total</span>
      </div>
      <div className="space-y-0">
        {groups.map((group) => (
          <div key={`${group.productName}-${group.unit}`}>
            {group.items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_120px_120px] gap-2 py-1 border-b border-border/30 last:border-0 items-center"
              >
                <span className="text-foreground truncate" title={item.productName}>
                  {item.productName}
                </span>
                <span className="text-right text-foreground">
                  {formatQty(item.quantity)} {item.unit}
                </span>
                {idx === group.items.length - 1 ? (
                  <span className="text-right font-bold text-primary">
                    {formatQty(group.totalQuantity)} {group.unit}
                  </span>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const WeeklySummary = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ServiceGroup[]>([]);

  const weekStart = useMemo(() => startOfWeek(selectedDate, { locale: fr }), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { locale: fr }), [selectedDate]);

  useEffect(() => {
    loadWeekData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const loadWeekData = async () => {
    setLoading(true);
    try {
      const { data: services, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("name");
      if (servicesError) throw servicesError;

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          service_id,
          status,
          due_at,
          order_items(product_name, quantity, unit)
        `)
        .gte("due_at", weekStart.toISOString())
        .lte("due_at", weekEnd.toISOString())
        .neq("status", "annule");
      if (ordersError) throw ordersError;

      const result: ServiceGroup[] = (services || []).map((service) => {
        const serviceOrders = (orders || []).filter((o: any) => o.service_id === service.id);

        const map = new Map<string, ProductGroup>();
        for (const order of serviceOrders) {
          for (const item of order.order_items || []) {
            const unit = (item.unit || "unité").trim();
            const key = `${normalizeProductName(item.product_name)}__${normalizeUnit(unit)}`;
            const existing = map.get(key);
            const qty = Number(item.quantity) || 0;
            if (existing) {
              existing.totalQuantity += qty;
              existing.items.push({ productName: item.product_name, unit, quantity: qty });
            } else {
              map.set(key, {
                productName: item.product_name,
                unit,
                totalQuantity: qty,
                items: [{ productName: item.product_name, unit, quantity: qty }],
              });
            }
          }
        }

        const groups = Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);

        return {
          serviceId: service.id,
          serviceName: service.name,
          serviceType: service.type,
          groups,
        };
      });

      setGroups(result);
    } catch (e) {
      console.error("Error loading weekly summary:", e);
    } finally {
      setLoading(false);
    }
  };

  const totalGroupsAcrossServices = groups.reduce((sum, g) => sum + g.groups.length, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Synthèse hebdomadaire</h1>
            <p className="text-muted-foreground mt-2">
              Cumul des produits à préparer cette semaine, par service
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => subWeeks(d, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setSelectedDate(new Date())} className="gap-2">
              <CalendarRange className="h-4 w-4" />
              {format(weekStart, "d MMM", { locale: fr })} – {format(weekEnd, "d MMM yyyy", { locale: fr })}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => addWeeks(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Chargement…
          </div>
        ) : totalGroupsAcrossServices === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune commande avec des produits sur cette semaine.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Détail par service */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groups.map((group) => (
                <Card key={group.serviceId} className={SERVICE_COLORS[group.serviceType] ? "" : ""}>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-xl">{group.serviceName}</CardTitle>
                    <Badge variant="outline" className={SERVICE_COLORS[group.serviceType] || ""}>
                      {group.groups.length} produit{group.groups.length > 1 ? "s" : ""}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    {group.groups.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Rien à préparer cette semaine.</p>
                    ) : (
                      <ProductTable groups={group.groups} />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default WeeklySummary;
