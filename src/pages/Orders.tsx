import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Orders = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Commandes</h1>
            <p className="text-muted-foreground mt-2">
              Gérez toutes vos commandes clients
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-5 w-5" />
            Nouvelle commande
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            La liste des commandes sera disponible prochainement.
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Orders;
