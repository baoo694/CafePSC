# 🔧 Fix Lỗi 500 - Cấu Hình Environment Variables trong Vercel

## ❌ Lỗi Hiện Tại

Khi truy cập `/admin` và đăng nhập, bạn gặp lỗi:
- `POST /api/admin/login 500 (Internal Server Error)`

**Nguyên nhân:** Thiếu environment variables trong Vercel.

---

## ✅ Giải Pháp

### Bước 1: Vào Vercel Dashboard

1. Truy cập: https://vercel.com/dashboard
2. Chọn project `cafe-psc` (hoặc tên project của bạn)
3. Vào **Settings** → **Environment Variables**

### Bước 2: Thêm Các Environment Variables

Thêm các biến sau:

#### 1. `ADMIN_PASSWORD` (Bắt buộc)
```
Name: ADMIN_PASSWORD
Value: [Mật khẩu admin của bạn - ít nhất 12 ký tự, mạnh]
Environment: Production, Preview, Development
```

**Ví dụ:** `MySecureP@ssw0rd123!`

#### 2. `CSRF_SECRET` (Bắt buộc)
```
Name: CSRF_SECRET
Value: [Random string 32+ ký tự]
Environment: Production, Preview, Development
```

**Cách tạo CSRF_SECRET:**
```bash
# Chạy lệnh này để generate random secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Hoặc sử dụng online tool:** https://randomkeygen.com/

**Ví dụ:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

#### 3. `SUPABASE_URL` (Nếu chưa có)
```
Name: SUPABASE_URL
Value: [URL Supabase project của bạn]
Environment: Production, Preview, Development
```

**Ví dụ:** `https://xxxxx.supabase.co`

#### 4. `SUPABASE_ANON_KEY` (Nếu chưa có)
```
Name: SUPABASE_ANON_KEY
Value: [Supabase Anon Key]
Environment: Production, Preview, Development
```

#### 5. `SUPABASE_SERVICE_ROLE_KEY` (Nếu chưa có)
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: [Supabase Service Role Key]
Environment: Production, Preview, Development
```

#### 6. `ALLOWED_ORIGINS` (Khuyến nghị)
```
Name: ALLOWED_ORIGINS
Value: https://cafe-psc.vercel.app
Environment: Production, Preview, Development
```

**Lưu ý:** Không dùng `*` trong production!

---

### Bước 3: Redeploy

Sau khi thêm environment variables:

1. Vào **Deployments** tab
2. Click **...** (3 dots) trên deployment mới nhất
3. Chọn **Redeploy**
4. Hoặc push một commit mới để trigger auto-deploy

---

## 🧪 Kiểm Tra

Sau khi redeploy, thử lại:

1. Truy cập: https://cafe-psc.vercel.app/admin
2. Đăng nhập với `ADMIN_PASSWORD` đã set
3. Nếu vẫn lỗi, kiểm tra Vercel Function Logs:
   - Vào **Deployments** → Click vào deployment
   - Xem **Function Logs** để debug

---

## 📋 Checklist

- [ ] `ADMIN_PASSWORD` đã được set
- [ ] `CSRF_SECRET` đã được set (32+ ký tự random)
- [ ] `SUPABASE_URL` đã được set
- [ ] `SUPABASE_ANON_KEY` đã được set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` đã được set
- [ ] `ALLOWED_ORIGINS` đã được set (không dùng `*`)
- [ ] Đã redeploy sau khi thêm env vars

---

## 🔍 Debug

Nếu vẫn lỗi, kiểm tra:

1. **Vercel Function Logs:**
   - Vào deployment → Function Logs
   - Tìm error message chi tiết

2. **Environment Variables:**
   - Verify tất cả variables đã được set đúng
   - Check spelling (case-sensitive)

3. **Test Local:**
   ```bash
   # Tạo file .env.local
   ADMIN_PASSWORD=your-password
   CSRF_SECRET=your-secret-32-chars
   SUPABASE_URL=your-url
   SUPABASE_ANON_KEY=your-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   ALLOWED_ORIGINS=https://cafe-psc.vercel.app
   
   # Test local
   npm run dev
   ```

---

## ⚠️ Lưu Ý Bảo Mật

1. **Không commit `.env` vào git**
2. **Sử dụng mật khẩu mạnh cho `ADMIN_PASSWORD`**
3. **`CSRF_SECRET` phải là random string, không đoán được**
4. **Không share environment variables**
5. **Rotate secrets định kỳ**

---

## 📞 Hỗ Trợ

Nếu vẫn gặp vấn đề:
1. Check Vercel Function Logs
2. Verify tất cả env vars đã được set
3. Thử redeploy lại

