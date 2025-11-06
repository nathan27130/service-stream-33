-- Add weight field to order_items table
ALTER TABLE order_items 
  ADD COLUMN weight numeric;

COMMENT ON COLUMN order_items.weight IS 'Weight of the item in grams or kilograms as entered by service or admin';