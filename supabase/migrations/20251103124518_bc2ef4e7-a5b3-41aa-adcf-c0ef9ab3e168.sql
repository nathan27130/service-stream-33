-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum for user roles
CREATE TYPE app_role AS ENUM ('admin', 'service', 'readonly');

-- Create service_type enum
CREATE TYPE service_type AS ENUM ('cuisine', 'charcuterie', 'commande', 'boutique');

-- Create order_status enum
CREATE TYPE order_status AS ENUM ('a_faire', 'en_cours', 'pret', 'livre', 'annule');

-- Create order_priority enum
CREATE TYPE order_priority AS ENUM ('basse', 'normale', 'haute');

-- Create order_type enum
CREATE TYPE order_type AS ENUM ('produit_simple', 'traiteur');

-- Create location_type enum
CREATE TYPE location_type AS ENUM ('retrait', 'livraison');

-- Create services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type service_type NOT NULL UNIQUE,
  color TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default services
INSERT INTO services (name, type, color) VALUES
  ('Cuisine', 'cuisine', '#2E86AB'),
  ('Charcuterie', 'charcuterie', '#C0392B'),
  ('Commande', 'commande', '#27AE60'),
  ('Boutique', 'boutique', '#8E44AD');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  service_id UUID REFERENCES services(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT 'unité',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) NOT NULL,
  type order_type NOT NULL DEFAULT 'produit_simple',
  due_at TIMESTAMPTZ NOT NULL,
  location location_type NOT NULL DEFAULT 'retrait',
  address TEXT,
  status order_status NOT NULL DEFAULT 'a_faire',
  priority order_priority NOT NULL DEFAULT 'normale',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create order_items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  unit TEXT DEFAULT 'unité',
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user service
CREATE OR REPLACE FUNCTION get_user_service(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT service_id FROM profiles WHERE id = _user_id
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for services
CREATE POLICY "Everyone can view services"
  ON services FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage services"
  ON services FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for customers
CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and service users can manage customers"
  ON customers FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'service')
  );

-- RLS Policies for products
CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service users can view their service orders"
  ON orders FOR SELECT
  USING (
    has_role(auth.uid(), 'service') AND 
    service_id = get_user_service(auth.uid())
  );

CREATE POLICY "Readonly users can view all orders"
  ON orders FOR SELECT
  USING (has_role(auth.uid(), 'readonly'));

CREATE POLICY "Admins and service users can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'service')
  );

CREATE POLICY "Admins can update all orders"
  ON orders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service users can update their service orders"
  ON orders FOR UPDATE
  USING (
    has_role(auth.uid(), 'service') AND 
    service_id = get_user_service(auth.uid())
  );

CREATE POLICY "Admins can delete orders"
  ON orders FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for order_items
CREATE POLICY "Users can view order items if they can view the order"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id
    )
  );

CREATE POLICY "Users can manage order items if they can manage the order"
  ON order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id
      AND (
        has_role(auth.uid(), 'admin') OR
        (has_role(auth.uid(), 'service') AND service_id = get_user_service(auth.uid()))
      )
    )
  );

-- Create trigger for profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();