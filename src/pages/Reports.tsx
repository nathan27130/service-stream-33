import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";

const Reports = () => {
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rapports</h1>
          <p className="text-muted-foreground mt-2">
            Consultez vos statistiques et rapports hebdomadaires
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            Les rapports seront disponibles prochainement.
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Reports;
