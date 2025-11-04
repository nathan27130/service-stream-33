-- Add completed field to order_items to track individual item preparation
ALTER TABLE order_items 
ADD COLUMN completed BOOLEAN NOT NULL DEFAULT false;

-- Add index for better performance when filtering completed items
CREATE INDEX idx_order_items_completed ON order_items(completed);

-- Add comment for documentation
COMMENT ON COLUMN order_items.completed IS 'Indicates whether this item has been prepared/completed';