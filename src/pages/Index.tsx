import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Auth from "./Auth";
import Dashboard from "./Dashboard";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (location.pathname === "/auth") {
        if (session) {
          navigate("/");
        }
        return;
      }

      if (!session) {
        navigate("/auth");
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/");
      } else if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return location.pathname === "/auth" ? <Auth /> : <Dashboard />;
};

export default Index;
