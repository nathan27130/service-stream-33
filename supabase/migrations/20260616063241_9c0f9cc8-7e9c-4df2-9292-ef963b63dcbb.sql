-- 1. Distinguer Particulier / Pro / Traiteur au niveau du client
CREATE TYPE customer_type AS ENUM ('particulier', 'pro', 'traiteur');

ALTER TABLE public.customers
  ADD COLUMN customer_type customer_type NOT NULL DEFAULT 'particulier';

COMMENT ON COLUMN public.customers.customer_type IS
  'Segment commercial du client : particulier (boutique), pro (revendeurs/B2B), traiteur (prestations événementielles)';

-- 2. Lier chaque produit à un service par défaut
ALTER TABLE public.products
  ADD COLUMN default_service_id UUID REFERENCES public.services(id);

COMMENT ON COLUMN public.products.default_service_id IS
  'Service qui prépare ce produit par défaut. Utilisé pour le dispatch automatique depuis un devis importé.';

-- 3. Index pour filtres par segment client
CREATE INDEX idx_customers_customer_type ON public.customers(customer_type);