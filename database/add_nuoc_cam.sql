-- ============================================
-- THÊM SẢN PHẨM: NƯỚC CAM
-- ============================================
-- Chạy script này trong Supabase SQL Editor để thêm sản phẩm nước cam
-- Size M: 20,000đ
-- Size L: 25,000đ (base 20,000đ + 5,000đ)

-- Thêm sản phẩm Nước cam
INSERT INTO products (name, price, category, is_available)
VALUES ('Nước cam', 20000, 'juice', true)
ON CONFLICT DO NOTHING;

-- Kiểm tra sản phẩm đã được thêm
SELECT id, name, price, category, is_available 
FROM products 
WHERE name = 'Nước cam';



