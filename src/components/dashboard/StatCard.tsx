import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  serviceType?: "cuisine" | "charcuterie" | "commande" | "boutique" | "logistique";
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard = ({ title, value, icon: Icon, serviceType, trend }: StatCardProps) => {
  const serviceColors = {
    cuisine: "bg-cuisine text-cuisine-foreground",
    charcuterie: "bg-charcuterie text-charcuterie-foreground",
    commande: "bg-commande text-commande-foreground",
    boutique: "bg-boutique text-boutique-foreground",
    logistique: "bg-logistique text-logistique-foreground",
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "rounded-lg p-2",
            serviceType ? serviceColors[serviceType] : "bg-primary text-primary-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={cn(
            "text-xs mt-1",
            trend.isPositive ? "text-commande" : "text-destructive"
          )}>
            {trend.isPositive ? "+" : ""}{trend.value}% depuis la semaine dernière
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
