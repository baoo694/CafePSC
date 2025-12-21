# Hướng Dẫn Cấu Hình Environment Variables trên Vercel

## 📋 Các Biến Môi Trường Cần Thiết

### ✅ Đã Có (Từ Hình Ảnh)
- `SUPABASE_URL` - URL của Supabase project
- `SUPABASE_ANON_KEY` - Public anonymous key (dùng cho public operations)
- `ADMIN_PASSWORD` - Mật khẩu admin
- `VITE_SUPABASE_URL` - Supabase URL cho frontend (Vite)
- `VITE_SUPABASE_ANON_KEY` - Supabase Anon Key cho frontend (Vite)

### ⚠️ CẦN THÊM
- `SUPABASE_SERVICE_ROLE_KEY` - **QUAN TRỌNG**: Service Role Key để admin routes hoạt động với RLS

## 🔐 Cách Lấy SUPABASE_SERVICE_ROLE_KEY

1. Đăng nhập vào [Supabase Dashboard](https://supabase.com)
2. Chọn project của bạn
3. Vào **Settings** → **API**
4. Tìm phần **Project API keys**
5. Copy **`service_role`** key (KHÔNG phải `anon` key)
6. ⚠️ **LƯU Ý**: Service Role Key có quyền bypass RLS, cần bảo vệ cẩn thận!

## 📝 Cách Thêm vào Vercel

### Bước 1: Mở Vercel Dashboard
1. Đăng nhập vào [vercel.com](https://vercel.com)
2. Chọn project của bạn

### Bước 2: Thêm Environment Variable
1. Vào **Settings** → **Environment Variables**
2. Click **Add New**
3. Thêm các biến sau:

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (service_role key) | Production, Preview, Development |

### Bước 3: Redeploy
Sau khi thêm biến môi trường mới, bạn cần **Redeploy** để áp dụng:
- Vào **Deployments**
- Click **...** trên deployment mới nhất
- Chọn **Redeploy**

## ✅ Kiểm Tra Sau Khi Thêm

Sau khi thêm `SUPABASE_SERVICE_ROLE_KEY` và redeploy:

1. ✅ **Frontend hoạt động bình thường**
   - Menu hiển thị đúng
   - Có thể đặt hàng

2. ✅ **Admin routes hoạt động**
   - Đăng nhập admin thành công
   - Có thể bật/tắt sản phẩm
   - Có thể thay đổi trạng thái đơn hàng
   - Có thể xóa đơn hàng
   - Có thể reset đơn hàng

3. ✅ **RLS đã bảo vệ**
   - Không thể truy cập trực tiếp database từ client
   - Chỉ admin routes (với SERVICE_ROLE_KEY) mới có thể modify data

## 🔒 Bảo Mật

### ✅ ĐÚNG
- ✅ Thêm `SUPABASE_SERVICE_ROLE_KEY` vào Vercel Environment Variables
- ✅ Chỉ sử dụng trong server-side API routes
- ✅ Không commit vào git
- ✅ Không expose trong frontend code

### ❌ SAI
- ❌ Không thêm `SUPABASE_SERVICE_ROLE_KEY` vào `.env` local (trừ khi cần test)
- ❌ Không commit `SUPABASE_SERVICE_ROLE_KEY` vào git
- ❌ Không sử dụng trong frontend code
- ❌ Không expose trong browser console

## 📊 Tóm Tắt Các Keys

| Key | Dùng Cho | Quyền | Bảo Mật |
|-----|----------|-------|---------|
| `SUPABASE_ANON_KEY` | Frontend & Public API | Tuân theo RLS | Có thể expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend Admin API | Bypass RLS | **KHÔNG BAO GIỜ expose** |

## 🐛 Xử Lý Lỗi

### Lỗi: "SUPABASE_SERVICE_ROLE_KEY is not set"
- **Nguyên nhân**: Chưa thêm biến môi trường vào Vercel
- **Giải pháp**: Thêm `SUPABASE_SERVICE_ROLE_KEY` vào Vercel Environment Variables và redeploy

### Lỗi: "new row violates row-level security policy"
- **Nguyên nhân**: Đang dùng ANON_KEY cho admin operations
- **Giải pháp**: Đảm bảo admin routes sử dụng `getAdminSupabaseClient()` với SERVICE_ROLE_KEY

### Lỗi: Admin routes không hoạt động sau khi bật RLS
- **Nguyên nhân**: Chưa thêm SERVICE_ROLE_KEY hoặc chưa redeploy
- **Giải pháp**: Thêm `SUPABASE_SERVICE_ROLE_KEY` và redeploy

