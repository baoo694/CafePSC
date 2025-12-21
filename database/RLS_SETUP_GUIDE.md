# Hướng Dẫn Bật Row Level Security (RLS)

## ⚠️ TẠI SAO CẦN BẬT RLS?

**Row Level Security (RLS) đang BỊ TẮT** trong database của bạn. Đây là một lỗ hổng bảo mật nghiêm trọng!

### Vấn đề khi RLS tắt:
- ❌ Bất kỳ ai có Supabase Anon Key đều có thể truy cập TRỰC TIẾP vào database
- ❌ Có thể đọc, sửa, xóa dữ liệu mà KHÔNG CẦN qua API
- ❌ Có thể spam đơn hàng, thay đổi giá sản phẩm, xóa đơn hàng
- ❌ Bỏ qua tất cả các lớp bảo mật ở API layer

### Khi RLS được bật:
- ✅ Chỉ có thể thực hiện các thao tác được policy cho phép
- ✅ Service Role Key (backend) có thể làm mọi thứ
- ✅ Anon Key (frontend) chỉ có thể làm những gì policy cho phép
- ✅ Bảo vệ dữ liệu ngay cả khi API có lỗ hổng

## 📋 CÁCH BẬT RLS

### Bước 1: Mở Supabase Dashboard
1. Đăng nhập vào [supabase.com](https://supabase.com)
2. Chọn project của bạn
3. Vào **SQL Editor** (thanh bên trái)

### Bước 2: Chạy SQL để bật RLS
1. Copy toàn bộ nội dung từ file `database/rls_policies.sql`
2. Paste vào SQL Editor
3. Click **Run** hoặc nhấn `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Bước 3: Kiểm tra RLS đã bật
1. Vào **Table Editor** trong Supabase Dashboard
2. Chọn bảng `products` (hoặc `orders`, `order_items`)
3. Kiểm tra xem có thấy **"RLS enabled"** (màu xanh) thay vì **"RLS disabled"** (màu đỏ)

## 🔍 KIỂM TRA SAU KHI BẬT RLS

### Test 1: Frontend vẫn hoạt động
- Mở ứng dụng frontend
- Kiểm tra menu hiển thị đúng
- Thử đặt một đơn hàng test
- Kiểm tra đơn hàng xuất hiện trong admin panel

### Test 2: Không thể truy cập trực tiếp từ client
Mở Browser Console và thử:

```javascript
// Lấy Anon Key từ environment variables
const supabaseUrl = 'YOUR_SUPABASE_URL';
const anonKey = 'YOUR_ANON_KEY';

// Thử xóa một sản phẩm (sẽ FAIL nếu RLS đúng)
fetch(`${supabaseUrl}/rest/v1/products?id=eq.1`, {
  method: 'DELETE',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  }
})
.then(r => r.json())
.then(console.log);
```

Nếu RLS đúng, bạn sẽ nhận được lỗi permission denied.

### Test 3: API backend vẫn hoạt động
- Đăng nhập admin
- Thử bật/tắt sản phẩm
- Thử thay đổi trạng thái đơn hàng
- Tất cả phải hoạt động bình thường

## 📝 CÁC POLICIES ĐÃ TẠO

### Bảng `products`:
- ✅ **SELECT**: Mọi người có thể đọc (để hiển thị menu)
- ✅ **INSERT/UPDATE/DELETE**: Chỉ service role (backend API)

### Bảng `orders`:
- ✅ **SELECT**: Mọi người có thể đọc (để hiển thị đơn hàng)
- ✅ **INSERT**: Mọi người có thể tạo đơn hàng mới (qua API)
- ✅ **UPDATE/DELETE**: Chỉ service role (backend API)

### Bảng `order_items`:
- ✅ **SELECT**: Mọi người có thể đọc
- ✅ **INSERT**: Mọi người có thể tạo (khi tạo đơn hàng)
- ✅ **UPDATE/DELETE**: Chỉ service role (backend API)

## 🔐 LƯU Ý QUAN TRỌNG VỀ KEYS

### Supabase Anon Key (Public Key)
- ✅ **CÓ THỂ** sử dụng trong frontend code
- ✅ **CÓ THỂ** commit vào git (vì đã có RLS bảo vệ)
- ⚠️ Với RLS đã bật, chỉ có thể làm những gì policy cho phép

### Supabase Service Role Key (Secret Key)
- ❌ **KHÔNG BAO GIỜ** sử dụng trong frontend
- ❌ **KHÔNG BAO GIỜ** commit vào git
- ✅ **CHỈ** sử dụng trong backend API (server-side)
- ✅ Có quyền bypass RLS (nên cần bảo vệ cẩn thận)

## 🐛 XỬ LÝ LỖI

### Lỗi: "new row violates row-level security policy"
- **Nguyên nhân**: Policy không cho phép thao tác này
- **Giải pháp**: Kiểm tra lại policy, có thể cần điều chỉnh

### Lỗi: Frontend không hiển thị dữ liệu
- **Nguyên nhân**: Policy SELECT quá hạn chế
- **Giải pháp**: Đảm bảo có policy "Allow public read access" cho bảng đó

### Lỗi: Không thể tạo đơn hàng
- **Nguyên nhân**: Policy INSERT không cho phép
- **Giải pháp**: Kiểm tra policy INSERT cho bảng `orders` và `order_items`

## 📚 TÀI LIỆU THAM KHẢO

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

