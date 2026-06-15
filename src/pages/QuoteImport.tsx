import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function QuoteImport() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleExtract = async () => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("PDF trop volumineux (max 15 Mo).");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const pdfBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("extract-quote", {
        body: { pdfBase64, filename: file.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data?.data);
      toast.success("Devis extrait avec succès");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Échec de l'extraction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importer un devis IsaFact</h1>
        <p className="text-muted-foreground">
          Téléverse un PDF de devis, l'IA extrait automatiquement les informations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Fichier PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button onClick={handleExtract} disabled={!file || loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extraction…</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" /> Extraire</>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>2. Données extraites</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-[600px]">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
