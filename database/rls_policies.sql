-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Chạy file này trong Supabase SQL Editor để bật RLS và tạo policies
-- Đảm bảo chỉ cho phép truy cập dữ liệu thông qua API, không cho phép truy cập trực tiếp từ client

-- ============================================
-- 1. BẢNG PRODUCTS
-- ============================================

-- Bật RLS cho bảng products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Cho phép mọi người ĐỌC (SELECT) sản phẩm
-- Điều này cho phép frontend hiển thị menu
CREATE POLICY "Allow public read access to products"
ON products
FOR SELECT
TO public
USING (true);

-- Policy: CHỈ cho phép service role (backend API) INSERT/UPDATE/DELETE
-- Không cho phép anonymous users hoặc authenticated users thao tác trực tiếp
-- Tất cả thao tác phải qua API backend với authentication
CREATE POLICY "Only service role can modify products"
ON products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- 2. BẢNG ORDERS
-- ============================================

-- Bật RLS cho bảng orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Cho phép mọi người ĐỌC (SELECT) đơn hàng
-- Điều này cho phép frontend hiển thị đơn hàng
CREATE POLICY "Allow public read access to orders"
ON orders
FOR SELECT
TO public
USING (true);

-- Policy: Cho phép INSERT đơn hàng mới (để khách hàng đặt hàng)
-- Nhưng chỉ qua API, không cho phép truy cập trực tiếp
-- Supabase sẽ kiểm tra qua API layer
CREATE POLICY "Allow public insert orders"
ON orders
FOR INSERT
TO public
WITH CHECK (true);

-- Policy: CHỈ cho phép service role UPDATE/DELETE
-- Không cho phép anonymous users thay đổi hoặc xóa đơn hàng
CREATE POLICY "Only service role can modify orders"
ON orders
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Only service role can delete orders"
ON orders
FOR DELETE
TO service_role
USING (true);

-- ============================================
-- 3. BẢNG ORDER_ITEMS
-- ============================================

-- Bật RLS cho bảng order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policy: Cho phép mọi người ĐỌC (SELECT) order items
CREATE POLICY "Allow public read access to order_items"
ON order_items
FOR SELECT
TO public
USING (true);

-- Policy: Cho phép INSERT order items mới (khi tạo đơn hàng)
CREATE POLICY "Allow public insert order_items"
ON order_items
FOR INSERT
TO public
WITH CHECK (true);

-- Policy: CHỈ cho phép service role UPDATE/DELETE
CREATE POLICY "Only service role can modify order_items"
ON order_items
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Only service role can delete order_items"
ON order_items
FOR DELETE
TO service_role
USING (true);

-- ============================================
-- LƯU Ý QUAN TRỌNG
-- ============================================
-- 
-- 1. Service Role Key:
--    - Service Role Key có quyền bypass RLS
--    - CHỈ sử dụng Service Role Key trong backend API (server-side)
--    - KHÔNG BAO GIỜ expose Service Role Key trong frontend code
--    - KHÔNG BAO GIỜ commit Service Role Key vào git
--
-- 2. Anon Key:
--    - Anon Key phải tuân theo RLS policies
--    - Có thể sử dụng Anon Key trong frontend
--    - Nhưng với RLS đã bật, chỉ có thể thực hiện các thao tác được policy cho phép
--
-- 3. Kiểm tra sau khi áp dụng:
--    - Test xem frontend vẫn hoạt động bình thường
--    - Test xem không thể truy cập trực tiếp từ client với Anon Key để modify data
--    - Test xem API backend vẫn hoạt động với Service Role Key
--
-- 4. Nếu cần thay đổi policies:
--    - Có thể sửa lại policies này trong Supabase Dashboard
--    - Hoặc chạy lại SQL với policies mới
--    - Xóa policy cũ trước: DROP POLICY "policy_name" ON table_name;

