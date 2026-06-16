import { useState, useEffect, useMemo } from "react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format } from "date-fns";
import { fr } from "date-fns/locale";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, CalendarRange, Loader2 } from "lucide-react";

interface AggregatedLine {
  productName: string;
  unit: string;
  totalQuantity: number;
  orderCount: number;
}

interface ServiceGroup {
  serviceId: string;
  serviceName: string;
  serviceType: string;
  lines: AggregatedLine[];
}

const SERVICE_COLORS: Record<string, string> = {
  cuisine: "bg-cuisine/10 text-cuisine border-cuisine/30",
  charcuterie: "bg-charcuterie/10 text-charcuterie border-charcuterie/30",
  commande: "bg-commande/10 text-commande border-commande/30",
  boutique: "bg-boutique/10 text-boutique border-boutique/30",
};

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

      const normalize = (s: string) =>
        (s || "").trim().toLowerCase().replace(/\s+/g, " ");

      const result: ServiceGroup[] = (services || []).map((service) => {
        const serviceOrders = (orders || []).filter((o: any) => o.service_id === service.id);

        // Cumule les quantités par (nom de produit normalisé + unité normalisée),
        // pour qu'une commande de 60 et une commande de 40 du même produit
        // donnent bien 100 au total.
        const lineMap = new Map<string, AggregatedLine>();
        for (const order of serviceOrders) {
          for (const item of order.order_items || []) {
            const unit = (item.unit || "unité").trim();
            const key = `${normalize(item.product_name)}__${normalize(unit)}`;
            const existing = lineMap.get(key);
            if (existing) {
              existing.totalQuantity += Number(item.quantity) || 0;
              existing.orderCount += 1;
            } else {
              lineMap.set(key, {
                productName: item.product_name,
                unit,
                totalQuantity: Number(item.quantity) || 0,
                orderCount: 1,
              });
            }
          }
        }

        const lines = Array.from(lineMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);

        return {
          serviceId: service.id,
          serviceName: service.name,
          serviceType: service.type,
          lines,
        };
      });

      setGroups(result);
    } catch (e) {
      console.error("Error loading weekly summary:", e);
    } finally {
      setLoading(false);
    }
  };

  const totalLinesAcrossServices = groups.reduce((sum, g) => sum + g.lines.length, 0);

  const globalSummary = useMemo(() => {
    const normalize = (s: string) =>
      (s || "").trim().toLowerCase().replace(/\s+/g, " ");
    const map = new Map<string, AggregatedLine>();
    for (const group of groups) {
      for (const line of group.lines) {
        const key = `${normalize(line.productName)}__${normalize(line.unit)}`;
        const existing = map.get(key);
        if (existing) {
          existing.totalQuantity += line.totalQuantity;
          existing.orderCount += line.orderCount;
        } else {
          map.set(key, { ...line });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [groups]);

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
        ) : totalLinesAcrossServices === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune commande avec des produits sur cette semaine.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Cumul global */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-xl">Cumul global</CardTitle>
                <Badge variant="outline">
                  {globalSummary.length} produit{globalSummary.length > 1 ? "s" : ""}
                </Badge>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {globalSummary.map((line) => (
                    <li
                      key={`global-${line.productName}-${line.unit}`}
                      className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="text-foreground">{line.productName}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {line.totalQuantity % 1 === 0 ? line.totalQuantity : line.totalQuantity.toFixed(2)} {line.unit}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({line.orderCount} cmd{line.orderCount > 1 ? "s" : ""})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Détail par service */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groups.map((group) => (
                <Card key={group.serviceId} className={SERVICE_COLORS[group.serviceType] ? "" : ""}>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-xl">{group.serviceName}</CardTitle>
                    <Badge variant="outline" className={SERVICE_COLORS[group.serviceType] || ""}>
                      {group.lines.length} produit{group.lines.length > 1 ? "s" : ""}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    {group.lines.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Rien à préparer cette semaine.</p>
                    ) : (
                      <ul className="space-y-2">
                        {group.lines.map((line) => (
                          <li
                            key={`${line.productName}-${line.unit}`}
                            className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0"
                          >
                            <span className="text-foreground">{line.productName}</span>
                            <span className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {line.totalQuantity % 1 === 0 ? line.totalQuantity : line.totalQuantity.toFixed(2)} {line.unit}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({line.orderCount} cmd{line.orderCount > 1 ? "s" : ""})
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
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
