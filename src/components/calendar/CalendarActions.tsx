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
import { supabase } from "@/integrations/supabase/client";

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

  const handleExportICal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Vous devez être connecté pour exporter le calendrier");
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const icalUrl = `${supabaseUrl}/functions/v1/ical-export?service=${serviceId}&token=${session.access_token}`;
      
      // Copy authenticated URL to clipboard
      navigator.clipboard.writeText(icalUrl);
      toast.success("URL iCal sécurisée copiée dans le presse-papier");
    } catch (error) {
      console.error("Export iCal error:", error);
      toast.error("Erreur lors de l'export du calendrier");
    }
  };

  const handleDownloadICal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Vous devez être connecté pour télécharger le calendrier");
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const icalUrl = `${supabaseUrl}/functions/v1/ical-export?service=${serviceId}`;
      
      // Fetch with authentication
      const response = await fetch(icalUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Échec du téléchargement");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calendar-${serviceName}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Calendrier téléchargé avec succès");
    } catch (error) {
      console.error("Download iCal error:", error);
      toast.error("Erreur lors du téléchargement du calendrier");
    }
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
