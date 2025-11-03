import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OrderStatusBadgeProps {
  status: "a_faire" | "en_cours" | "pret" | "livre" | "annule";
}

const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const statusConfig = {
    a_faire: {
      label: "À faire",
      className: "bg-muted text-muted-foreground hover:bg-muted",
    },
    en_cours: {
      label: "En cours",
      className: "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
    },
    pret: {
      label: "Prêt",
      className: "bg-commande-light text-commande hover:bg-commande-light",
    },
    livre: {
      label: "Livré",
      className: "bg-boutique-light text-boutique hover:bg-boutique-light",
    },
    annule: {
      label: "Annulé",
      className: "bg-destructive/10 text-destructive hover:bg-destructive/10",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
};

export default OrderStatusBadge;
