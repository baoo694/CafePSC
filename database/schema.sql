-- CafePSC Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100) DEFAULT 'drink',
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  delivery_address VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'making', 'done', 'cancelled')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration: Rename student_id to delivery_address if table already exists
-- Run this in Supabase SQL Editor if you have existing data:
-- ALTER TABLE orders RENAME COLUMN student_id TO delivery_address;
-- Or if column doesn't exist yet:
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address VARCHAR(255);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  options_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Insert sample products (Vietnamese coffee menu)
INSERT INTO products (name, price, category, is_available) VALUES
  ('Cà Phê Sữa Đá', 25000, 'coffee', true),
  ('Cà Phê Đen Đá', 20000, 'coffee', true),
  ('Bạc Xỉu', 28000, 'coffee', true),
  ('Cà Phê Trứng', 35000, 'coffee', true),
  ('Latte', 40000, 'coffee', true),
  ('Cappuccino', 40000, 'coffee', true),
  ('Americano', 35000, 'coffee', true),
  ('Mocha', 45000, 'coffee', true),
  ('Trà Đào', 30000, 'tea', true),
  ('Trà Vải', 30000, 'tea', true),
  ('Trà Chanh', 25000, 'tea', true),
  ('Hồng Trà', 25000, 'tea', true),
  ('Matcha Latte', 45000, 'tea', true),
  ('Sinh Tố Bơ', 35000, 'smoothie', true),
  ('Sinh Tố Xoài', 30000, 'smoothie', true),
  ('Nước Ép Cam', 30000, 'juice', true)
ON CONFLICT DO NOTHING;

-- Enable Realtime for tables (required for Vercel deployment)
-- Run this in Supabase SQL Editor:
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- Enable Row Level Security (optional, can be configured later)
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

