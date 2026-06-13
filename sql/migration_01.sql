-- Migration 01: add order_id to sales for multi-product sale grouping
ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_id UUID;
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales(order_id);
