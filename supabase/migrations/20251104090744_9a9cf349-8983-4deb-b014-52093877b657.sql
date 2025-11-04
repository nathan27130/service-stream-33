-- Fix security issues: Add input validation constraints and improve trigger security

-- 1. Add length constraints to prevent unbounded input on customers table
ALTER TABLE customers 
  ADD CONSTRAINT customers_name_length CHECK (char_length(name) <= 200),
  ADD CONSTRAINT customers_phone_length CHECK (phone IS NULL OR char_length(phone) <= 50),
  ADD CONSTRAINT customers_email_length CHECK (email IS NULL OR char_length(email) <= 255),
  ADD CONSTRAINT customers_address_length CHECK (default_address IS NULL OR char_length(default_address) <= 500);

-- 2. Add length constraints to orders table
ALTER TABLE orders
  ADD CONSTRAINT orders_notes_length CHECK (notes IS NULL OR char_length(notes) <= 5000),
  ADD CONSTRAINT orders_address_length CHECK (address IS NULL OR char_length(address) <= 500);

-- 3. Add length constraints to order_items table
ALTER TABLE order_items
  ADD CONSTRAINT order_items_product_name_length CHECK (char_length(product_name) <= 200),
  ADD CONSTRAINT order_items_unit_length CHECK (unit IS NULL OR char_length(unit) <= 50),
  ADD CONSTRAINT order_items_comment_length CHECK (comment IS NULL OR char_length(comment) <= 1000),
  ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);

-- 4. Add length constraints to products table
ALTER TABLE products
  ADD CONSTRAINT products_name_length CHECK (char_length(name) <= 200),
  ADD CONSTRAINT products_category_length CHECK (category IS NULL OR char_length(category) <= 100),
  ADD CONSTRAINT products_unit_length CHECK (unit IS NULL OR char_length(unit) <= 50);

-- 5. Improve handle_new_user trigger with input validation and error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  extracted_name text;
BEGIN
  -- Extract and validate full_name from metadata
  extracted_name := new.raw_user_meta_data->>'full_name';
  
  -- Validate extracted name: must be present and within length limits
  IF extracted_name IS NULL OR trim(extracted_name) = '' THEN
    extracted_name := new.email;
  END IF;
  
  -- Enforce maximum length (truncate if needed to prevent errors)
  IF char_length(extracted_name) > 100 THEN
    extracted_name := substring(extracted_name, 1, 100);
  END IF;
  
  -- Validate email format (basic check)
  IF new.email IS NULL OR char_length(new.email) > 255 THEN
    RAISE EXCEPTION 'Invalid email format or length';
  END IF;
  
  -- Insert profile with validated data and error handling
  BEGIN
    INSERT INTO profiles (id, full_name, email)
    VALUES (
      new.id,
      extracted_name,
      new.email
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Profile already exists, this is acceptable (e.g., retry scenario)
      RAISE NOTICE 'Profile already exists for user %', new.id;
    WHEN OTHERS THEN
      -- Log error but don't block user creation
      RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
  END;
  
  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile on signup with input validation and error handling';