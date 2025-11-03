import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface CalendarActionsProps {
  serviceId: string;
  serviceName: string;
  selectedDate: Date;
}

const CalendarActions = ({ serviceId, serviceName, selectedDate }: CalendarActionsProps) => {
  const handlePrintWeek = () => {
    const weekParam = selectedDate.toISOString().split("T")[0];
    window.open(`/print/planning?service=${serviceId}&week=${weekParam}`, "_blank");
  };

  const handleExportICal = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const icalUrl = `${supabaseUrl}/functions/v1/ical-export?service=${serviceId}`;
    
    // Copy URL to clipboard
    navigator.clipboard.writeText(icalUrl);
    toast.success("URL iCal copiée dans le presse-papier");
  };

  const handleDownloadICal = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const icalUrl = `${supabaseUrl}/functions/v1/ical-export?service=${serviceId}`;
    
    // Download the file
    window.open(icalUrl, "_blank");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{serviceName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handlePrintWeek}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimer planning semaine
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Calendrier iCal (lecture seule)
        </DropdownMenuLabel>
        
        <DropdownMenuItem onClick={handleDownloadICal}>
          <Download className="h-4 w-4 mr-2" />
          Télécharger .ics
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleExportICal}>
          <Download className="h-4 w-4 mr-2" />
          Copier URL iCal
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CalendarActions;
