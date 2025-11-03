import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OrderStatusBadgeProps {
  status: "a_faire" | "en_cours" | "pret" | "livre" | "annule";
}

const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const statusConfig = {
    a_faire: {
      label: "À faire",
      className: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
    },
    en_cours: {
      label: "En cours",
      className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    pret: {
      label: "Prêt",
      className: "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
    },
    livre: {
      label: "Livré",
      className: "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400",
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
