import MainLayout from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServicesManager from "@/components/settings/ServicesManager";
import ProductsManager from "@/components/settings/ProductsManager";
import TemplatesManager from "@/components/settings/TemplatesManager";

const Settings = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-2">
            Configurez vos services, produits et modèles
          </p>
        </div>

        <Tabs defaultValue="services" className="w-full">
          <TabsList>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="templates">Modèles</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-6">
            <ServicesManager />
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <ProductsManager />
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <TemplatesManager />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;
