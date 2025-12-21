# Hướng Dẫn Set ALLOWED_ORIGINS trong Vercel

## 📋 ALLOWED_ORIGINS là gì?

`ALLOWED_ORIGINS` là danh sách các domain được phép gọi API của bạn. Đây là một phần của CORS (Cross-Origin Resource Sharing) configuration để bảo vệ API khỏi các request từ domain không được phép.

## 🔧 Cách Set trong Vercel

### Bước 1: Mở Vercel Dashboard

1. Đăng nhập vào [vercel.com](https://vercel.com)
2. Chọn project của bạn (CafePSC)
3. Vào **Settings** (thanh menu trên cùng)
4. Chọn **Environment Variables** (menu bên trái)

### Bước 2: Thêm Environment Variable

1. Click nút **Add New** hoặc **Add**
2. Điền thông tin:
   - **Name:** `ALLOWED_ORIGINS`
   - **Value:** Xem format bên dưới
   - **Environment:** Chọn tất cả (Production, Preview, Development) hoặc chỉ Production

### Bước 3: Format Value

#### Option 1: Single Domain (Khuyến nghị cho Production)
```
https://your-domain.vercel.app
```

#### Option 2: Multiple Domains (Nếu có nhiều domain)
```
https://your-domain.vercel.app,https://www.your-domain.com,https://your-custom-domain.com
```

**Lưu ý:** 
- Mỗi domain cách nhau bởi dấu phẩy (`,`)
- **KHÔNG có khoảng trắng** giữa các domain
- Phải bao gồm protocol (`https://` hoặc `http://`)

#### Option 3: Development + Production
```
https://your-domain.vercel.app,http://localhost:5173,http://localhost:3000
```

### Bước 4: Redeploy

Sau khi thêm environment variable:
1. Vào tab **Deployments**
2. Click **...** trên deployment mới nhất
3. Chọn **Redeploy**
4. Hoặc đợi Vercel tự động deploy khi bạn push code mới

## 📝 Ví Dụ Cụ Thể

### Ví dụ 1: Chỉ Production Domain
```
https://cafepsc.vercel.app
```

### Ví dụ 2: Production + Custom Domain
```
https://cafepsc.vercel.app,https://cafe.yourdomain.com
```

### Ví dụ 3: Production + Development
```
https://cafepsc.vercel.app,http://localhost:5173
```

### Ví dụ 4: Nhiều Domains
```
https://cafepsc.vercel.app,https://www.cafepsc.com,https://cafe.example.com
```

## ⚠️ Lưu Ý Quan Trọng

### ✅ ĐÚNG
- ✅ Chỉ thêm các domain bạn sở hữu hoặc tin cậy
- ✅ Luôn dùng `https://` cho production
- ✅ Test sau khi set để đảm bảo frontend vẫn hoạt động

### ❌ SAI
- ❌ **KHÔNG BAO GIỜ** dùng `*` trong production (cho phép tất cả)
- ❌ Không thêm domain của người khác
- ❌ Không quên protocol (`https://` hoặc `http://`)

## 🔍 Kiểm Tra Sau Khi Set

### Test 1: Frontend hoạt động bình thường
- Mở ứng dụng frontend
- Kiểm tra các chức năng: đặt hàng, xem menu, admin login
- Tất cả phải hoạt động bình thường

### Test 2: CORS hoạt động đúng
Mở Browser Console và thử:
```javascript
// Test từ domain được phép (sẽ thành công)
fetch('https://your-api.vercel.app/api/orders', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log);

// Test từ domain không được phép (sẽ fail với CORS error)
// Nếu bạn test từ domain khác, sẽ thấy CORS error
```

## 🐛 Xử Lý Lỗi

### Lỗi: "Access to fetch blocked by CORS policy"
**Nguyên nhân:** Domain của bạn không có trong `ALLOWED_ORIGINS`

**Giải pháp:**
1. Kiểm tra domain hiện tại của bạn (xem URL trên browser)
2. Thêm domain đó vào `ALLOWED_ORIGINS` trong Vercel
3. Redeploy

### Lỗi: Frontend không thể gọi API
**Nguyên nhân:** Có thể do format sai trong `ALLOWED_ORIGINS`

**Giải pháp:**
1. Kiểm tra format: phải có `https://` hoặc `http://`
2. Kiểm tra không có khoảng trắng thừa
3. Kiểm tra dấu phẩy giữa các domain
4. Redeploy sau khi sửa

### Lỗi: Vẫn cho phép tất cả origins
**Nguyên nhân:** Code đang fallback về `['*']` nếu không có `ALLOWED_ORIGINS`

**Giải pháp:**
- Đảm bảo đã set `ALLOWED_ORIGINS` trong Vercel
- Kiểm tra code có đọc đúng environment variable không

## 📊 Code Hiện Tại

Code đang sử dụng `ALLOWED_ORIGINS` ở các file:
- `frontend/api/admin/login.js`
- `frontend/api/orders/index.js`

Format trong code:
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
```

Điều này có nghĩa:
- Nếu có `ALLOWED_ORIGINS`, sẽ split theo dấu phẩy
- Nếu không có, sẽ fallback về `['*']` (cho phép tất cả) - **KHÔNG AN TOÀN**

## ✅ Checklist

- [ ] Đã thêm `ALLOWED_ORIGINS` vào Vercel Environment Variables
- [ ] Format đúng (có protocol, cách nhau bởi dấu phẩy)
- [ ] Đã redeploy sau khi thêm
- [ ] Đã test frontend hoạt động bình thường
- [ ] Đã test từ domain khác sẽ bị block (nếu muốn)

## 🎯 Khuyến Nghị

### Cho Production:
```
https://your-production-domain.vercel.app
```

### Cho Development:
```
http://localhost:5173,http://localhost:3000
```

### Cho cả hai:
```
https://your-production-domain.vercel.app,http://localhost:5173
```

**Lưu ý:** Có thể set khác nhau cho từng environment:
- **Production:** Chỉ production domain
- **Preview:** Preview domains + localhost
- **Development:** Localhost

