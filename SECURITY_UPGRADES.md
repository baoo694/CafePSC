# 🔒 Security Upgrades - Hướng Dẫn Nâng Cấp Bảo Mật

**Ngày nâng cấp:** 2025-01-21  
**Phiên bản:** 2.0

---

## 📋 Tổng Quan Các Thay Đổi

### ✅ Đã Hoàn Thành

1. **Nâng cấp Admin Token lên JWT** ✅
   - Thay thế base64 encoding bằng JWT với cryptographic signature
   - Token được ký bằng secret key, không thể giả mạo
   - Tự động verify expiration và signature

2. **Thêm CSP Header** ✅
   - Content-Security-Policy header trong `vercel.json`
   - Bảo vệ chống XSS attacks
   - Cấu hình cho phép Supabase connections

3. **Cải thiện CSRF Secret** ✅
   - Throw error trong production nếu không có CSRF_SECRET
   - Script generate secrets an toàn

---

## 🔑 1. Nâng Cấp Admin Token lên JWT

### Thay Đổi

**Trước:**
```javascript
// Base64 encoding đơn giản - dễ bị giả mạo
const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
```

**Sau:**
```javascript
// JWT với cryptographic signature - an toàn
const token = generateAdminToken(); // JWT signed with secret key
```

### Files Đã Thay Đổi

- ✅ `frontend/lib/jwt.js` - JWT helper functions (mới)
- ✅ `backend/jwt.js` - JWT helper functions cho backend (mới)
- ✅ `frontend/lib/auth.js` - Sử dụng JWT verification
- ✅ `frontend/api/admin/login.js` - Generate JWT token
- ✅ `backend/server.js` - Sử dụng JWT verification

### Environment Variable Cần Thiết

**JWT_SECRET** (bắt buộc trong production)
- Secret key để ký và verify JWT tokens
- Nên là random string ít nhất 32 ký tự
- Sử dụng script `generate-secrets.js` để tạo

---

## 🛡️ 2. Content-Security-Policy Header

### Thay Đổi

Đã thêm CSP header vào `vercel.json`:

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel.app wss://*.vercel.app; font-src 'self' data:; frame-ancestors 'none';"
}
```

### Mục Đích

- **default-src 'self'**: Chỉ cho phép load resources từ cùng origin
- **script-src**: Cho phép inline scripts (cần cho Vite)
- **connect-src**: Cho phép kết nối đến Supabase và Vercel
- **frame-ancestors 'none'**: Chống clickjacking

---

## 🔐 3. Script Generate Secrets

### Cách Sử Dụng

```bash
node scripts/generate-secrets.js
```

Script sẽ generate:
- **CSRF_SECRET**: 64 ký tự hex (cho CSRF protection)
- **JWT_SECRET**: 64 ký tự hex (cho JWT signing)

### Output Example

```
🔐 Generating secure secrets for environment variables...

🔒 CSRF_SECRET:
3fb162e87fed49679e855666274ab4f1f06a448b423b1447f15f400e69d7a9a7

🔑 JWT_SECRET:
ab1b95f8690138029cee374ab7bc97f968c59956856ccd0e4f6b715877c9e9d2
```

---

## 📝 Environment Variables Checklist

### Bắt Buộc (Required)

- [ ] **JWT_SECRET** - Secret key cho JWT (generate bằng script)
- [ ] **CSRF_SECRET** - Secret key cho CSRF (generate bằng script)
- [ ] **ADMIN_PASSWORD** - Mật khẩu admin (set thủ công, mạnh)
- [ ] **SUPABASE_URL** - Supabase project URL
- [ ] **SUPABASE_ANON_KEY** - Supabase anonymous key
- [ ] **SUPABASE_SERVICE_ROLE_KEY** - Supabase service role key

### Khuyến Nghị (Recommended)

- [ ] **ALLOWED_ORIGINS** - Comma-separated list (không dùng `*` trong production)
- [ ] **NODE_ENV** - Set to `production` trong production

---

## 🚀 Deployment Steps

### 1. Generate Secrets

```bash
node scripts/generate-secrets.js
```

### 2. Set Vercel Environment Variables

Vào Vercel Dashboard → Project Settings → Environment Variables:

```
JWT_SECRET=<generated-value>
CSRF_SECRET=<generated-value>
ADMIN_PASSWORD=<strong-password>
ALLOWED_ORIGINS=https://yourdomain.com
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NODE_ENV=production
```

### 3. Redeploy

```bash
git add .
git commit -m "Security upgrade: JWT tokens, CSP headers"
git push
```

Vercel sẽ tự động deploy với environment variables mới.

---

## 🔄 Backward Compatibility

### Token Migration

- ✅ Hệ thống vẫn hỗ trợ đọc token từ cookie hoặc Authorization header
- ✅ Old tokens (base64) sẽ bị reject (invalid token)
- ✅ Users cần login lại để nhận JWT token mới

### Breaking Changes

- ❌ Old admin tokens (base64) sẽ không hoạt động
- ✅ Users cần login lại sau khi deploy

---

## 🧪 Testing

### Test JWT Token Generation

```javascript
// In admin login endpoint
const token = generateAdminToken();
console.log('JWT Token:', token);
```

### Test JWT Token Verification

```javascript
// In protected routes
const verification = verifyAdminToken(token);
if (verification.valid) {
  console.log('Token payload:', verification.payload);
}
```

### Test CSP Header

1. Deploy lên Vercel
2. Mở DevTools → Network tab
3. Check response headers có `Content-Security-Policy`

---

## ⚠️ Important Notes

1. **JWT_SECRET và CSRF_SECRET phải giống nhau** giữa tất cả instances
   - Nếu không, tokens tạo ở instance này sẽ không verify được ở instance khác
   - Đảm bảo set trong Vercel Environment Variables (shared across all instances)

2. **Không commit secrets vào git**
   - Script generate-secrets.js chỉ để generate, không lưu vào file
   - Copy values vào Vercel Environment Variables

3. **Token Expiration**
   - JWT tokens expire sau 24 giờ
   - Users cần login lại sau khi token hết hạn

4. **Development vs Production**
   - Development: Có thể dùng default secrets (có warning)
   - Production: BẮT BUỘC phải set environment variables

---

## 📊 Security Improvements Summary

| Feature | Before | After | Improvement |
|---------|--------|-------|-------------|
| Admin Token | Base64 encoding | JWT with signature | ✅ Cryptographic security |
| CSRF Secret | Default value | Required in production | ✅ No default secrets |
| CSP Header | Missing | Configured | ✅ XSS protection |
| Token Verification | Manual timestamp check | JWT automatic | ✅ More secure |

---

## 🔗 References

- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Status:** ✅ **HOÀN THÀNH**  
**Next Steps:** Set environment variables và deploy

