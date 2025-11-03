import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const signupSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, "Le nom complet est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets"),
  email: z.string()
    .trim()
    .email("Format d'email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères"),
  password: z.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
    .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial"),
  companyCode: z.string()
    .min(6, "Le code entreprise doit contenir au moins 6 caractères")
    .max(50, "Le code entreprise doit contenir moins de 50 caractères")
});

const loginSchema = z.object({
  email: z.string().trim().email("Format d'email invalide"),
  password: z.string().min(1, "Le mot de passe est requis")
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [checkingFirstUser, setCheckingFirstUser] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkSession();

    // Check if this is the first user
    const checkFirstUser = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('validate-company-code', {
          body: { action: 'check' }
        });
        
        if (!error && data) {
          const isFirst = !data.exists;
          setIsFirstUser(isFirst);
          // Force signup mode for first user (no accounts exist yet)
          if (isFirst) {
            setIsLogin(false);
          }
        }
      } catch (error) {
        console.error("Error checking first user:", error);
      } finally {
        setCheckingFirstUser(false);
      }
    };

    checkFirstUser();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Validate login
        const loginValidation = loginSchema.safeParse({ email, password });
        if (!loginValidation.success) {
          toast.error(loginValidation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: loginValidation.data.email,
          password: loginValidation.data.password,
        });

        if (error) throw error;
        toast.success("Connexion réussie !");
        navigate("/");
      } else {
        // Validate signup
        const signupValidation = signupSchema.safeParse({
          fullName,
          email,
          password,
          companyCode
        });
        
        if (!signupValidation.success) {
          toast.error(signupValidation.error.errors[0].message);
          setLoading(false);
          return;
        }

        // Call Edge Function to validate or create company code
        const action = isFirstUser ? 'create' : 'validate';
        const { data, error } = await supabase.functions.invoke('validate-company-code', {
          body: { 
            action,
            companyCode: signupValidation.data.companyCode,
            email: signupValidation.data.email,
            password: signupValidation.data.password,
            fullName: signupValidation.data.fullName
          }
        });

        if (error) throw error;

        if (data?.error) {
          toast.error(data.error);
          setLoading(false);
          return;
        }

        if (action === 'validate' && !data?.valid) {
          toast.error("Code entreprise invalide");
          setLoading(false);
          return;
        }

        if (isFirstUser) {
          toast.success("Premier compte administrateur créé ! Vous pouvez maintenant vous connecter.");
          setIsLogin(true);
        } else {
          toast.success("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
          setIsLogin(true);
        }

        // Clear form
        setEmail("");
        setPassword("");
        setFullName("");
        setCompanyCode("");
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (checkingFirstUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isLogin 
              ? "Connexion" 
              : isFirstUser 
                ? "Configuration initiale" 
                : "Inscription"}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? "Entrez vos identifiants pour accéder à l'application" 
              : isFirstUser
                ? "Créez le premier compte administrateur et définissez le code d'entreprise"
                : "Créez un compte avec le code d'entreprise"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Jean Dupont"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyCode">
                    {isFirstUser ? "Créer un code entreprise" : "Code entreprise"}
                  </Label>
                  <Input
                    id="companyCode"
                    type="password"
                    placeholder={isFirstUser ? "Créez un code sécurisé (min. 6 caractères)" : "Entrez le code entreprise"}
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    required
                    minLength={6}
                  />
                  {isFirstUser && (
                    <p className="text-xs text-muted-foreground">
                      ⚠️ Ce code sera requis pour tous les futurs employés. Conservez-le en sécurité !
                    </p>
                  )}
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemple@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isLogin ? 1 : 8}
              />
              {!isLogin && (
                <p className="text-xs text-muted-foreground">
                  8+ caractères avec majuscule, minuscule, chiffre et caractère spécial
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin 
                ? "Se connecter" 
                : isFirstUser
                  ? "Créer le compte administrateur"
                  : "S'inscrire"}
            </Button>

            {!isFirstUser && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin
                  ? "Pas encore de compte ? S'inscrire"
                  : "Déjà un compte ? Se connecter"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
