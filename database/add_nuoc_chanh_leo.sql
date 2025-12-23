-- ============================================
-- THÊM SẢN PHẨM: NƯỚC CHANH LEO
-- ============================================
-- Chạy script này trong Supabase SQL Editor để thêm sản phẩm nước chanh leo
-- Size M: 20,000đ
-- Size L: 25,000đ (base 20,000đ + 5,000đ)

-- Thêm sản phẩm Nước chanh leo
INSERT INTO products (name, price, category, is_available)
VALUES ('Nước chanh leo', 20000, 'juice', true)
ON CONFLICT DO NOTHING;

-- Kiểm tra sản phẩm đã được thêm
SELECT id, name, price, category, is_available 
FROM products 
WHERE name = 'Nước chanh leo';

