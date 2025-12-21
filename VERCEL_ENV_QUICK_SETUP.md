# ⚡ Vercel Environment Variables - Quick Setup

## 🔴 QUAN TRỌNG: Phải Set Các Variables Này Trong Vercel

Sau khi deploy JWT upgrade, bạn **PHẢI** set các environment variables sau trong Vercel:

### Bắt Buộc (Required)

1. **JWT_SECRET**
   - Secret key để ký và verify JWT tokens
   - Generate bằng: `node scripts/generate-secrets.js`
   - Copy giá trị `JWT_SECRET` vào Vercel

2. **CSRF_SECRET**
   - Secret key cho CSRF protection
   - Generate bằng: `node scripts/generate-secrets.js`
   - Copy giá trị `CSRF_SECRET` vào Vercel

3. **ADMIN_PASSWORD**
   - Mật khẩu admin (set thủ công)
   - Phải là mật khẩu mạnh (12+ ký tự)

### Khuyến Nghị (Recommended)

4. **ALLOWED_ORIGINS**
   - Danh sách origins được phép (comma-separated)
   - Ví dụ: `https://cafe-psc.vercel.app,https://yourdomain.com`
   - **KHÔNG dùng `*` trong production**

5. **SUPABASE_URL**
   - Supabase project URL

6. **SUPABASE_ANON_KEY**
   - Supabase anonymous key

7. **SUPABASE_SERVICE_ROLE_KEY**
   - Supabase service role key (cho admin operations)

## 📝 Cách Set Trong Vercel

1. Vào Vercel Dashboard
2. Chọn project `CafePSC`
3. Settings → Environment Variables
4. Add từng variable:
   - Name: `JWT_SECRET`
   - Value: `<paste-generated-value>`
   - Environment: Production, Preview, Development (chọn tất cả)
5. Repeat cho tất cả variables

## ⚠️ Lưu Ý

- **JWT_SECRET và CSRF_SECRET phải giống nhau** giữa tất cả environments
- Sau khi set, cần **Redeploy** để áp dụng
- Không commit secrets vào git
- Generate secrets mới cho mỗi project

## 🔧 Generate Secrets

```bash
node scripts/generate-secrets.js
```

Copy output và paste vào Vercel Environment Variables.

## ✅ Verify Setup

Sau khi set và redeploy:

1. Login vào admin panel
2. Nếu login thành công → JWT_SECRET đã đúng
3. Nếu vẫn gặp 401/403 → Kiểm tra lại:
   - JWT_SECRET đã set chưa?
   - CSRF_SECRET đã set chưa?
   - Đã redeploy chưa?
   - Cookies có được gửi không? (check DevTools → Network)

## 🐛 Troubleshooting

### 401 Unauthorized
- ✅ Check JWT_SECRET đã set trong Vercel
- ✅ Check token có được gửi trong cookie (DevTools → Application → Cookies)
- ✅ Try logout và login lại

### 403 Forbidden (CSRF)
- ✅ Check CSRF_SECRET đã set trong Vercel
- ✅ Check CSRF token có trong localStorage (DevTools → Application → Local Storage)
- ✅ Try logout và login lại để có CSRF token mới

### Old Token Format
- ✅ Hệ thống đã có backward compatibility
- ✅ Old tokens (base64) vẫn hoạt động tạm thời
- ✅ Nhưng nên logout và login lại để upgrade lên JWT

---

**Status:** ⚠️ **CẦN SET ENVIRONMENT VARIABLES TRƯỚC KHI SỬ DỤNG**

