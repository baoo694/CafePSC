# 🛡️ Phân Tích Bảo Vệ Chống Spam Đơn Hàng

**Ngày kiểm tra:** 2025-01-21  
**Trạng thái:** ⚠️ **CÓ THỂ BỊ SPAM** - Cần cải thiện

---

## 📊 Tổng Quan

| Biện Pháp | Trạng Thái | Hiệu Quả |
|-----------|-----------|----------|
| Rate Limiting (IP-based) | ✅ Có | 🟡 Trung bình |
| Input Validation | ✅ Có | ✅ Tốt |
| Product Availability Check | ✅ Có | ✅ Tốt |
| Customer-based Rate Limit | ❌ Không | ❌ Thiếu |
| CAPTCHA/Verification | ❌ Không | ❌ Thiếu |
| Distributed Rate Limiting | ❌ Không | ❌ Thiếu |

---

## ✅ Các Biện Pháp Đã Có

### 1. Rate Limiting (IP-based)
**Giới hạn:** 10 đơn hàng/phút/IP

**Code:**
```javascript
'/api/orders': 10, // 10 orders per minute per IP
```

**Vấn đề:**
- ⚠️ **In-memory rate limiting** không hoạt động tốt trong serverless environment
- ⚠️ Mỗi Vercel function instance có Map riêng, không chia sẻ state
- ⚠️ Attacker có thể bypass bằng cách:
  - Sử dụng nhiều IP khác nhau (VPN, proxy)
  - Gửi requests đến nhiều instances khác nhau
  - Chờ window reset (1 phút)

**Hiệu quả:** 🟡 **Trung bình** - Chỉ chống được spam cơ bản

---

### 2. Input Validation
**Đã có:**
- ✅ Validate customer_name (required, max 100 chars)
- ✅ Validate phone (format, max 20 chars)
- ✅ Validate items (array, max 50 items)
- ✅ Validate quantity (1-100 per item)
- ✅ Validate product_id
- ✅ Check products exist
- ✅ Check products available (double-check)

**Hiệu quả:** ✅ **Tốt** - Ngăn chặn invalid data

---

### 3. Product Availability Check
**Đã có:**
- ✅ Check availability trước khi tạo order
- ✅ Double-check ngay trước khi insert
- ✅ Rollback nếu không có items hợp lệ

**Hiệu quả:** ✅ **Tốt** - Ngăn chặn đơn hàng với sản phẩm đã tắt

---

## ❌ Các Lỗ Hổng Có Thể Bị Spam

### 1. **Rate Limiting In-Memory (Serverless Issue)** 🔴

**Vấn đề:**
- Rate limiting sử dụng in-memory Map
- Trong serverless, mỗi instance có Map riêng
- Attacker có thể spam bằng cách:
  - Gửi requests đến nhiều instances khác nhau
  - Mỗi instance sẽ có counter riêng → bypass rate limit

**Kịch bản tấn công:**
```
Time 0s:  Request 1 → Instance A (count = 1)
Time 0.1s: Request 2 → Instance B (count = 1) 
Time 0.2s: Request 3 → Instance C (count = 1)
...
Time 0.9s: Request 10 → Instance J (count = 1)
→ Tất cả đều pass vì mỗi instance có counter riêng!
```

**Giải pháp:**
- 🔄 Sử dụng Redis hoặc Upstash Redis cho distributed rate limiting
- 🔄 Hoặc sử dụng Vercel Edge Config

---

### 2. **Không Có Customer-based Rate Limit** 🔴

**Vấn đề:**
- Chỉ giới hạn theo IP, không giới hạn theo customer_name/phone
- Attacker có thể spam với cùng thông tin customer nhưng khác IP
- Hoặc spam với nhiều customer_name khác nhau

**Kịch bản tấn công:**
```
IP 1: customer_name="Test1", phone="0900000001" → 10 orders
IP 2: customer_name="Test1", phone="0900000001" → 10 orders (cùng customer, khác IP)
IP 3: customer_name="Test2", phone="0900000002" → 10 orders
...
→ Spam không giới hạn với nhiều IP hoặc nhiều customer
```

**Giải pháp:**
- 🔄 Thêm rate limit theo customer_name + phone
- 🔄 Giới hạn: 5-10 đơn hàng/phút/customer

---

### 3. **Không Có CAPTCHA/Verification** 🟡

**Vấn đề:**
- Không có CAPTCHA để chống bot
- Bot có thể tự động spam đơn hàng
- Không có verification cho phone number

**Giải pháp:**
- 🔄 Thêm CAPTCHA (reCAPTCHA v3) cho form đặt hàng
- 🔄 Hoặc thêm phone verification (SMS OTP)

---

### 4. **Không Có Blacklist/Pattern Detection** 🟡

**Vấn đề:**
- Không detect pattern spam (ví dụ: customer_name="Test1", "Test2", "Test3"...)
- Không có blacklist cho IP hoặc customer
- Không có monitoring để phát hiện spam

**Giải pháp:**
- 🔄 Thêm pattern detection
- 🔄 Thêm blacklist mechanism
- 🔄 Thêm monitoring và alerting

---

## 🎯 Đánh Giá Khả Năng Bị Spam

### Mức Độ Rủi Ro: **MEDIUM-HIGH**

**Có thể spam:**
- ✅ Với nhiều IP khác nhau (VPN, proxy)
- ✅ Với nhiều customer_name khác nhau
- ✅ Bypass rate limiting trong serverless environment
- ✅ Sử dụng bot để tự động hóa

**Không thể spam:**
- ❌ Với cùng IP (bị rate limit 10/phút)
- ❌ Với sản phẩm đã tắt (bị reject)
- ❌ Với data không hợp lệ (bị validation reject)

---

## 🔧 Giải Pháp Đề Xuất

### Priority 1: Distributed Rate Limiting (URGENT)

**Sử dụng Upstash Redis:**

```javascript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function rateLimit(req, endpoint = 'default') {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const key = `rate_limit:${ip}:${endpoint}`;
  const limit = MAX_REQUESTS_PER_WINDOW[endpoint] || 30;
  
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60); // 1 minute
  }
  
  if (count > limit) {
    return { allowed: false, error: 'Rate limit exceeded' };
  }
  
  return { allowed: true };
}
```

**Chi phí:** Upstash Redis có free tier (10,000 requests/day)

---

### Priority 2: Customer-based Rate Limit

**Thêm rate limit theo customer:**

```javascript
// Thêm vào rateLimit.js
export async function customerRateLimit(customerName, phone) {
  const key = `customer_rate_limit:${customerName}:${phone}`;
  const limit = 5; // 5 orders per minute per customer
  
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60);
  }
  
  if (count > limit) {
    return { allowed: false, error: 'Quá nhiều đơn hàng. Vui lòng đợi một chút.' };
  }
  
  return { allowed: true };
}
```

---

### Priority 3: CAPTCHA (Optional)

**Thêm reCAPTCHA v3:**

```javascript
// Frontend
import { loadReCaptcha } from 'react-recaptcha-v3';

// Backend
import fetch from 'node-fetch';

async function verifyCaptcha(token) {
  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body: `secret=${process.env.RECAPTCHA_SECRET}&response=${token}`
  });
  const data = await response.json();
  return data.success && data.score > 0.5;
}
```

---

## 📋 Checklist Cải Thiện

### Immediate (Cần làm ngay)
- [ ] Implement distributed rate limiting (Redis)
- [ ] Thêm customer-based rate limit
- [ ] Test với nhiều IP khác nhau

### Short-term (Nên làm sớm)
- [ ] Thêm CAPTCHA cho form đặt hàng
- [ ] Thêm pattern detection
- [ ] Thêm monitoring và alerting

### Long-term (Khuyến nghị)
- [ ] Phone verification (SMS OTP)
- [ ] Blacklist mechanism
- [ ] Advanced spam detection (ML-based)

---

## 🧪 Test Cases

### Test 1: Spam với nhiều IP
```bash
# Sử dụng curl với nhiều IP khác nhau
for i in {1..20}; do
  curl -X POST https://cafe-psc.vercel.app/api/orders \
    -H "X-Forwarded-For: 1.2.3.$i" \
    -H "Content-Type: application/json" \
    -d '{"customer_name":"Test","items":[...]}'
done
```

**Kết quả mong đợi:** Nên bị rate limit sau 10 requests

### Test 2: Spam với cùng customer, khác IP
```bash
# Spam với cùng customer_name nhưng khác IP
for i in {1..20}; do
  curl -X POST https://cafe-psc.vercel.app/api/orders \
    -H "X-Forwarded-For: 1.2.3.$i" \
    -d '{"customer_name":"SameCustomer","phone":"0900000001",...}'
done
```

**Kết quả mong đợi:** Nên bị customer rate limit sau 5 requests

---

## 📊 Kết Luận

**Hiện tại:** ⚠️ **CÓ THỂ BỊ SPAM** với:
- Nhiều IP khác nhau
- Nhiều customer_name khác nhau
- Bypass rate limiting trong serverless

**Sau khi cải thiện:** ✅ **ĐƯỢC BẢO VỆ TỐT** với:
- Distributed rate limiting
- Customer-based rate limit
- CAPTCHA (optional)

**Khuyến nghị:** Implement Priority 1 và 2 ngay để giảm thiểu spam.

---

## 🔗 References

- [Upstash Redis](https://upstash.com/docs/redis/overall/getstarted)
- [Vercel Edge Config](https://vercel.com/docs/storage/edge-config)
- [reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3)

