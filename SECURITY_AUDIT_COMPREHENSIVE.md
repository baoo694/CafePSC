# 🔒 Báo Cáo Bảo Mật Toàn Diện - CafePSC

**Ngày kiểm tra:** 2025-01-21  
**Phiên bản:** 2.0  
**Phạm vi:** Toàn bộ hệ thống (Frontend + Backend + Database)

---

## 📊 Tổng Quan

| Loại Lỗ Hổng | Số Lượng | Trạng Thái |
|--------------|----------|------------|
| 🔴 Nghiêm trọng | 2 | ⚠️ Cần fix |
| 🟡 Trung bình | 5 | 🔄 Nên fix |
| 🟢 Thấp | 3 | 📝 Khuyến nghị |
| ✅ Đã được bảo vệ | 8 | ✅ OK |

**Điểm bảo mật tổng thể:** 7.5/10

---

## 🔴 LỖ HỔNG NGHIÊM TRỌNG

### 1. **CSRF Secret Key Default Value** ⚠️

**Mức độ:** 🔴 Nghiêm trọng  
**Vị trí:** `frontend/lib/csrf.js:4`

**Vấn đề:**
```javascript
const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';
```

- Nếu không set `CSRF_SECRET` trong environment variables, sử dụng default value
- Attacker có thể đoán được secret và tạo CSRF token giả mạo
- CSRF protection sẽ không hoạt động hiệu quả

**Giải pháp:**
```javascript
const CSRF_SECRET = process.env.CSRF_SECRET;
if (!CSRF_SECRET) {
  throw new Error('CSRF_SECRET environment variable is required');
}
```

**Khuyến nghị:**
- 🔄 **BẮT BUỘC**: Set `CSRF_SECRET` trong Vercel Environment Variables
- 🔄 Generate random secret key (ít nhất 32 ký tự)
- 🔄 Không commit secret vào git

---

### 2. **Admin Token Weak Security** ⚠️

**Mức độ:** 🔴 Nghiêm trọng  
**Vị trí:** `backend/server.js:48`, `frontend/api/admin/login.js:51`

**Vấn đề:**
```javascript
const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
```

- Token chỉ là base64 encoding của `admin:timestamp`
- Không có cryptographic signature
- Dễ dàng decode và tạo token giả mạo
- Không có mechanism để invalidate token

**Giải pháp:**
- 🔄 Sử dụng JWT với secret key
- 🔄 Thêm HMAC signature
- 🔄 Implement token blacklist cho logout

**Khuyến nghị:**
```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const token = jwt.sign(
  { 
    role: 'admin',
    iat: Math.floor(Date.now() / 1000)
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);
```

---

## 🟡 LỖ HỔNG TRUNG BÌNH

### 3. **CORS Default to Wildcard** ⚠️

**Mức độ:** 🟡 Trung bình  
**Vị trí:** Nhiều API routes

**Vấn đề:**
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
```

- Default là `['*']` - cho phép tất cả origins
- Có thể bị CSRF attack từ domain khác
- Mặc dù đã có CSRF protection, nhưng vẫn nên hạn chế CORS

**Giải pháp:**
- ✅ Đã có cấu hình `ALLOWED_ORIGINS`
- 🔄 **BẮT BUỘC**: Set `ALLOWED_ORIGINS` trong production
- 🔄 Không dùng `*` trong production

**Khuyến nghị:**
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  throw new Error('ALLOWED_ORIGINS must be set in production');
}
```

---

### 4. **Rate Limiting In-Memory (Serverless Issue)** ⚠️

**Mức độ:** 🟡 Trung bình  
**Vị trí:** `frontend/lib/rateLimit.js`

**Vấn đề:**
- Rate limiting sử dụng in-memory Map
- Trong serverless environment, mỗi instance có Map riêng
- Rate limiting không hoạt động hiệu quả giữa các instances
- Attacker có thể bypass bằng cách gửi requests đến nhiều instances

**Giải pháp:**
- ✅ Đã có rate limiting cơ bản
- 🔄 Sử dụng Redis hoặc Upstash Redis cho distributed rate limiting
- 🔄 Hoặc sử dụng Vercel Edge Config

**Khuyến nghị:**
```javascript
// Sử dụng Upstash Redis
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
```

---

### 5. **Error Information Disclosure** ⚠️

**Mức độ:** 🟡 Trung bình  
**Vị trí:** Nhiều API routes

**Vấn đề:**
- Một số endpoints trả về error message chi tiết trong production
- Có thể expose thông tin về hệ thống, database structure
- Stack traces có thể leak code structure

**Giải pháp hiện tại:**
- ✅ Một số endpoints đã có check `NODE_ENV`
- ⚠️ Không nhất quán

**Khuyến nghị:**
```javascript
catch (error) {
  console.error('Error:', error);
  return res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message 
  });
}
```

---

### 6. **Missing Content-Security-Policy Header** ⚠️

**Mức độ:** 🟡 Trung bình  
**Vị trí:** `frontend/vercel.json`

**Vấn đề:**
- Đã có một số security headers
- Thiếu `Content-Security-Policy` (CSP)
- CSP giúp chống XSS attacks

**Giải pháp:**
- ✅ Đã có các headers khác (X-Content-Type-Options, X-Frame-Options, etc.)
- 🔄 Thêm CSP header

**Khuyến nghị:**
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
}
```

---

### 7. **Database RLS Status Unknown** ⚠️

**Mức độ:** 🟡 Trung bình  
**Vị trí:** Supabase Database

**Vấn đề:**
- Có file `database/rls_policies.sql` nhưng không biết đã chạy chưa
- RLS (Row Level Security) chưa được verify
- Nếu RLS chưa bật, client có thể truy cập trực tiếp database

**Giải pháp:**
- 🔄 **CẦN VERIFY**: Kiểm tra RLS đã được bật trong Supabase
- 🔄 Chạy `database/rls_policies.sql` nếu chưa chạy
- 🔄 Test RLS policies hoạt động đúng

**Khuyến nghị:**
1. Vào Supabase Dashboard → Authentication → Policies
2. Verify RLS đã được bật cho tất cả tables
3. Test với Supabase client từ frontend (should fail nếu RLS đúng)

---

## 🟢 LỖ HỔNG THẤP / KHUYẾN NGHỊ

### 8. **Dependency Vulnerabilities** 📝

**Mức độ:** 🟢 Thấp  
**Vị trí:** `frontend/package.json`

**Khuyến nghị:**
- 🔄 Chạy `npm audit` để kiểm tra vulnerabilities
- 🔄 Update dependencies thường xuyên
- 🔄 Sử dụng `npm audit fix` để tự động fix

---

### 9. **Missing Logging & Monitoring** 📝

**Mức độ:** 🟢 Thấp  
**Vị trí:** Toàn bộ hệ thống

**Khuyến nghị:**
- 🔄 Log tất cả admin actions
- 🔄 Log failed authentication attempts
- 🔄 Monitor rate limit violations
- 🔄 Set up alerts cho suspicious activities
- 🔄 Sử dụng Sentry hoặc LogRocket

---

### 10. **No Input Sanitization for XSS** 📝

**Mức độ:** 🟢 Thấp  
**Vị trí:** Frontend components

**Vấn đề:**
- React tự động escape HTML, nhưng vẫn nên có sanitization layer
- Nếu có lỗ hổng trong React hoặc sử dụng `dangerouslySetInnerHTML` trong tương lai

**Khuyến nghị:**
- 🔄 Thêm sanitization cho user input
- 🔄 Sử dụng thư viện như `DOMPurify` nếu cần render HTML

---

## ✅ ĐÃ ĐƯỢC BẢO VỆ TỐT

### 1. **Input Validation** ✅
- ✅ Validate customer_name, phone, delivery_address, note
- ✅ Validate quantity (1-100)
- ✅ Validate items array (max 50)
- ✅ Validate product_id
- ✅ Validate status values

### 2. **Authentication** ✅
- ✅ Admin routes có authentication
- ✅ Token verification đã được implement
- ✅ Token có thời hạn 24 giờ
- ✅ HttpOnly cookies cho admin token

### 3. **CSRF Protection** ✅
- ✅ CSRF token generation và verification
- ✅ Origin verification
- ✅ HMAC signature cho CSRF tokens

### 4. **Rate Limiting** ✅
- ✅ Rate limiting cho `/api/orders` (10 req/min)
- ✅ Rate limiting cho `/api/admin/login` (5 req/min)
- ✅ Rate limiting cho `/api/orders/cancel` (5 req/min)

### 5. **Product Availability Check** ✅
- ✅ Double-check pattern để prevent race condition
- ✅ Check availability trước khi tạo order
- ✅ Check lại ngay trước khi insert

### 6. **Security Headers** ✅
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy
- ✅ Permissions-Policy

### 7. **HTTPS** ✅
- ✅ Vercel tự động cung cấp HTTPS
- ✅ Secure flag cho cookies trong production

### 8. **SQL Injection Prevention** ✅
- ✅ Sử dụng Supabase client (parameterized queries)
- ✅ Không có raw SQL queries
- ✅ Input validation trước khi query

---

## 📋 CHECKLIST TRƯỚC KHI DEPLOY PRODUCTION

### Bắt Buộc (Must Fix)

- [ ] **Set `CSRF_SECRET` trong Vercel** (random 32+ characters)
- [ ] **Set `ADMIN_PASSWORD` trong Vercel** (strong password, 12+ chars)
- [ ] **Set `ALLOWED_ORIGINS` trong Vercel** (không dùng `*`)
- [ ] **Set `SUPABASE_SERVICE_ROLE_KEY` trong Vercel**
- [ ] **Verify RLS đã được bật trong Supabase**
- [ ] **Upgrade admin token to JWT** (hoặc ít nhất thêm HMAC signature)

### Nên Làm (Should Fix)

- [ ] Thêm Content-Security-Policy header
- [ ] Implement distributed rate limiting (Redis)
- [ ] Thêm error logging và monitoring
- [ ] Chạy `npm audit` và fix vulnerabilities
- [ ] Test tất cả security features

### Khuyến Nghị (Nice to Have)

- [ ] Input sanitization layer
- [ ] Admin action logging
- [ ] Security monitoring và alerts
- [ ] Regular security audits

---

## 🔧 CÁC FILE CẦN SỬA

### 1. `frontend/lib/csrf.js`
```javascript
// Thay đổi từ:
const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';

// Thành:
const CSRF_SECRET = process.env.CSRF_SECRET;
if (!CSRF_SECRET) {
  throw new Error('CSRF_SECRET environment variable is required');
}
```

### 2. `frontend/vercel.json`
Thêm CSP header (xem khuyến nghị ở trên)

### 3. `backend/server.js` và `frontend/api/admin/login.js`
Upgrade token generation to JWT (xem khuyến nghị ở trên)

---

## 📊 SO SÁNH VỚI AUDIT TRƯỚC

| Lỗ Hổng | Trước | Sau | Status |
|---------|-------|-----|--------|
| Admin routes không được bảo vệ | ❌ | ✅ | Fixed |
| Admin token không verify | ❌ | ✅ | Fixed |
| Thiếu input validation | ❌ | ✅ | Fixed |
| Không có rate limiting | ❌ | ✅ | Fixed |
| CORS quá mở | ⚠️ | ⚠️ | Cần config |
| Race condition | ❌ | ✅ | Fixed |
| CSRF secret default | ❌ | ❌ | **Cần fix** |
| Admin token weak | ⚠️ | ⚠️ | **Cần fix** |
| Rate limiting serverless | ⚠️ | ⚠️ | Nên cải thiện |
| Missing CSP | ❌ | ❌ | Nên thêm |

---

## 🎯 PRIORITY FIX ORDER

1. **🔴 URGENT**: Fix CSRF_SECRET default value
2. **🔴 URGENT**: Upgrade admin token security (JWT)
3. **🟡 HIGH**: Verify và bật RLS trong Supabase
4. **🟡 HIGH**: Set environment variables trong Vercel
5. **🟡 MEDIUM**: Thêm CSP header
6. **🟡 MEDIUM**: Implement distributed rate limiting
7. **🟢 LOW**: Thêm logging và monitoring

---

## 📚 REFERENCES

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Supabase RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Vercel Security Headers](https://vercel.com/docs/concepts/projects/project-configuration#headers)

---

**Status:** ⚠️ **CẦN FIX 2 LỖ HỔNG NGHIÊM TRỌNG TRƯỚC KHI DEPLOY**  
**Next Review:** Sau khi fix các lỗ hổng nghiêm trọng


