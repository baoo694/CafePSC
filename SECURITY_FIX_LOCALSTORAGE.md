# 🔒 Fix: Chuyển Token từ localStorage sang httpOnly Cookies

## 📋 Tổng Quan

Đã chuyển đổi cách lưu trữ admin token từ `localStorage` (dễ bị XSS) sang `httpOnly cookies` để tăng cường bảo mật.

**Ngày thực hiện:** 2025-01-21  
**Lý do:** localStorage có thể bị truy cập bởi JavaScript, dễ bị XSS attack

---

## ✅ Các Thay Đổi

### 1. **Backend - Login Endpoint** (`frontend/api/admin/login.js`)

**Trước:**
```javascript
const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
return res.status(200).json({ success: true, token });
```

**Sau:**
```javascript
const token = Buffer.from(`admin:${Date.now()}`).toString('base64');

// Set httpOnly cookie
const maxAge = 24 * 60 * 60; // 24 hours
const cookieOptions = [
  `adminToken=${token}`,
  'HttpOnly',
  'SameSite=Strict',
  `Max-Age=${maxAge}`,
  'Path=/'
];

if (isProduction) {
  cookieOptions.push('Secure');
}

res.setHeader('Set-Cookie', cookieOptions.join('; '));
return res.status(200).json({ success: true });
```

**Lợi ích:**
- ✅ Token không thể truy cập từ JavaScript (HttpOnly)
- ✅ Chỉ gửi qua HTTPS trong production (Secure)
- ✅ Bảo vệ khỏi CSRF (SameSite=Strict)

---

### 2. **Backend - Auth Middleware** (`frontend/api/lib/auth.js`)

**Trước:**
```javascript
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return { valid: false, error: 'Missing authorization header' };
}
const token = authHeader.substring(7);
```

**Sau:**
```javascript
// Ưu tiên đọc từ cookie (an toàn hơn)
let token = null;
const cookies = req.headers.cookie;

if (cookies) {
  const cookieMatch = cookies.match(/adminToken=([^;]+)/);
  if (cookieMatch) {
    token = cookieMatch[1];
  }
}

// Fallback: đọc từ Authorization header (backward compatibility)
if (!token) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
}
```

**Lợi ích:**
- ✅ Ưu tiên cookie (an toàn hơn)
- ✅ Vẫn hỗ trợ Authorization header (backward compatibility)

---

### 3. **Backend - Logout Endpoint** (`frontend/api/admin/logout.js`)

**Mới:** Tạo endpoint mới để xóa cookie

```javascript
// Xóa cookie bằng cách set Max-Age=0
res.setHeader('Set-Cookie', 'adminToken=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/');
```

---

### 4. **Frontend - API Calls** (`frontend/src/api/index.js`)

**Trước:**
```javascript
const token = localStorage.getItem('adminToken');
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Sau:**
```javascript
const response = await fetch(url, {
  credentials: 'include', // Gửi cookies tự động
  headers: {
    'Content-Type': 'application/json'
  }
});
```

**Các hàm đã cập nhật:**
- ✅ `updateProductAvailability()`
- ✅ `updateOrderStatus()`
- ✅ `resetAllOrders()`
- ✅ `deleteOrder()`
- ✅ `adminLogin()` - thêm `credentials: 'include'`
- ✅ `adminLogout()` - hàm mới
- ✅ `checkAdminAuth()` - hàm mới để kiểm tra auth status

---

### 5. **Frontend - AdminPage** (`frontend/src/pages/AdminPage.jsx`)

**Trước:**
```javascript
// Check auth
const token = localStorage.getItem('adminToken');
if (token) {
  setIsAuthenticated(true);
}

// Login
localStorage.setItem('adminToken', response.token);

// Logout
localStorage.removeItem('adminToken');
```

**Sau:**
```javascript
// Check auth
useEffect(() => {
  async function checkAuth() {
    const isAuth = await checkAdminAuth();
    setIsAuthenticated(isAuth);
  }
  checkAuth();
}, []);

// Login
await adminLogin(password);
// Cookie được set tự động

// Logout
await adminLogout();
// Cookie được xóa tự động
```

---

### 6. **CORS Headers** (Tất cả admin API routes)

**Thêm:**
```javascript
res.setHeader('Access-Control-Allow-Credentials', 'true');
```

**Các routes đã cập nhật:**
- ✅ `frontend/api/products/[id]/availability.js`
- ✅ `frontend/api/orders/[id]/status.js`
- ✅ `frontend/api/orders/reset.js`
- ✅ `frontend/api/orders/[id]/index.js`
- ✅ `frontend/api/admin/login.js`
- ✅ `frontend/api/admin/logout.js`

---

## 🔒 Lợi Ích Bảo Mật

### Trước (localStorage):
- ❌ Token có thể bị đọc bởi JavaScript (XSS)
- ❌ Token tồn tại mãi mãi cho đến khi xóa thủ công
- ❌ Dễ bị lấy cắp qua malicious scripts

### Sau (httpOnly Cookies):
- ✅ Token không thể truy cập từ JavaScript (HttpOnly)
- ✅ Tự động hết hạn sau 24 giờ (Max-Age)
- ✅ Chỉ gửi qua HTTPS trong production (Secure)
- ✅ Bảo vệ khỏi CSRF (SameSite=Strict)
- ✅ Tự động gửi với mọi request (credentials: 'include')

---

## 🧪 Testing

### Kiểm tra Cookie:
1. Đăng nhập admin
2. Mở DevTools → Application → Cookies
3. Kiểm tra cookie `adminToken` có các flags:
   - ✅ HttpOnly
   - ✅ Secure (trong production)
   - ✅ SameSite=Strict

### Kiểm tra JavaScript không thể đọc:
```javascript
// Trong console browser
document.cookie // Không thấy adminToken (vì HttpOnly)
localStorage.getItem('adminToken') // null
```

### Kiểm tra Logout:
1. Đăng nhập
2. Gọi `adminLogout()`
3. Cookie `adminToken` bị xóa

---

## 📝 Lưu Ý

### Development vs Production:
- **Development:** Cookie không có `Secure` flag (localhost không có HTTPS)
- **Production:** Cookie có `Secure` flag (chỉ gửi qua HTTPS)

### Backward Compatibility:
- Auth middleware vẫn hỗ trợ Authorization header
- Có thể dùng cả cookie và header trong quá trình migration

### CORS Configuration:
- Phải set `Access-Control-Allow-Credentials: true` để gửi cookies
- Phải set `credentials: 'include'` trong fetch requests

---

## ✅ Checklist

- [x] Login endpoint set httpOnly cookie
- [x] Auth middleware đọc từ cookie
- [x] Logout endpoint xóa cookie
- [x] Frontend API calls dùng credentials: 'include'
- [x] AdminPage không dùng localStorage
- [x] CORS headers hỗ trợ credentials
- [x] Backward compatibility với Authorization header

---

## 🚀 Deployment

Không cần thay đổi environment variables. Tất cả thay đổi đều tương thích ngược.

**Lưu ý:** Trong production, đảm bảo:
- ✅ HTTPS được bật (Vercel tự động)
- ✅ `ALLOWED_ORIGINS` được set đúng domain
- ✅ Cookie sẽ tự động có `Secure` flag

---

## 📚 Tài Liệu Tham Khảo

- [OWASP: XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: HttpOnly Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies)
- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)


