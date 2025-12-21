# 🛡️ Tổng Hợp Cơ Chế Limit và Chống Spam

**Ngày cập nhật:** 2025-01-21  
**Phiên bản:** 2.0  
**Trạng thái:** ✅ Đã triển khai đầy đủ

---

## 📋 Mục Lục

1. [Rate Limiting](#rate-limiting)
2. [Spam Detection](#spam-detection)
3. [Banlist System](#banlist-system)
4. [DDoS Protection](#ddos-protection)
5. [Cấu Hình Chi Tiết](#cấu-hình-chi-tiết)
6. [Luồng Xử Lý](#luồng-xử-lý)

---

## 🔒 Rate Limiting

### 1. IP-based Rate Limiting

**Mục đích:** Giới hạn số lượng requests từ mỗi IP

**Cấu hình:**
- `/api/orders`: **50 requests/phút/IP** (backup limit cho mạng chung)
- `/api/admin/login`: **5 attempts/phút/IP**
- `/api/products`: **30 requests/phút/IP** (chống scraping)
- `/api/orders/cancel`: **5 requests/phút/IP**
- Default: **30 requests/phút/IP**

**Window:** 1 phút  
**Reset:** Tự động reset sau 1 phút

**Lưu ý:**
- Limit cao (50) cho `/api/orders` để phù hợp mạng chung (trường học)
- Chỉ là backup limit, customer-based limit là chính

---

### 2. Customer-based Rate Limiting ⭐ (Ưu tiên)

**Mục đích:** Giới hạn số lượng đơn hàng từ mỗi customer (phù hợp mạng chung)

**Cấu hình:**
- **5 orders/phút/customer**
- Key: `customer_name + phone`
- Window: 1 phút

**Lợi ích:**
- ✅ Mỗi sinh viên có quota riêng
- ✅ Không bị ảnh hưởng bởi người khác trong cùng mạng
- ✅ Phù hợp cho 10000 sinh viên chung WiFi

**Ví dụ:**
```
Sinh viên A: 5 đơn/phút ✅
Sinh viên B: 5 đơn/phút ✅ (không ảnh hưởng A)
```

---

## 🚨 Spam Detection

### 1. Pattern Detection

#### A. Tên Khách Hàng

**Pattern bị chặn:**
- `khach1`, `khach2`, `khach3`... đến `khach100000`
- `Khách 1`, `Khách 2`... (có khoảng trắng)
- `test1`, `user1`, `customer1`...
- Tên quá ngắn + số: `a1`, `b2` (< 5 ký tự)

**Validation:**
- Tên phải có ít nhất **2 ký tự chữ** (không tính số)
- Tên không được quá 100 ký tự

**Code:**
```javascript
/^(khách|khach|test|user|customer|guest|demo|spam|hack)\s*(\d+)$/i
// Chặn nếu số từ 1 đến 100000
```

---

#### B. Số Điện Thoại

**Pattern bị chặn:**
- Tăng dần: `0900000001`, `0900000002`... đến `0900000100`
- Nhiều chữ số giống nhau: `0900000000`, `0911111111` (≥7 chữ số giống nhau)
- Pattern không hợp lệ: `0123456789`, `0987654321`

**Validation:**
- Format Việt Nam: 10 chữ số, bắt đầu bằng `0`
- Hỗ trợ format `+84` (tự động convert)

**Code:**
```javascript
// Pattern: prefix giống nhau + số cuối tăng dần (1-100000)
if (lastDigit >= 1 && lastDigit <= 100000 && uniqueDigits <= 2) {
  // Chặn
}
```

---

#### C. Địa Chỉ

**Pattern bị chặn:**
- Tăng dần: `A1`, `A2`, `address1`, `address2`... đến `100000`
- Quá ngắn + số: `A1`, `B2` (< 5 ký tự)
- Từ khóa spam: `test1`, `demo2`, `spam3`...

**Validation:**
- Địa chỉ không được quá 200 ký tự
- Địa chỉ < 5 ký tự + có số → chặn

**Code:**
```javascript
/^(A|address|diachi|add|test|demo|spam)\s*(\d+)$/i
// Chặn nếu số từ 1 đến 100000
```

---

### 2. Comprehensive Spam Detection

**Kiểm tra tất cả các trường:**
- Customer name
- Phone number
- Delivery address

**Logic:**
- Nếu có **≥2 pattern spam** → chặn ngay
- Nếu có **1 pattern spam** → chặn

---

## 🚫 Banlist System

### 1. Customer-based Banlist ⭐ (Chính)

**Mục đích:** Chỉ ban người spam, không ảnh hưởng người khác

**Cấu hình:**
- **5 lần spam trong 2 phút** → ban customer
- **Ban duration: 5 phút**
- Key: `customer_name + phone`

**Window:** 2 phút  
**Reset:** Tự động reset sau 2 phút không có spam

**Lợi ích:**
- ✅ Chỉ ban người spam
- ✅ Không ảnh hưởng người khác trong cùng mạng
- ✅ Phù hợp môi trường trường học

**Ví dụ:**
```
Time 0s:   Spam lần 1 → count = 1
Time 30s:  Spam lần 2 → count = 2
Time 60s:  Spam lần 3 → count = 3
Time 90s:  Spam lần 4 → count = 4
Time 120s: Spam lần 5 → BAN! (5 phút)
```

---

### 2. IP-based Banlist (DDoS Only)

**Mục đích:** Chỉ ban IP khi DDoS thực sự

**Cấu hình:**
- **> 100 requests/phút** → ban IP
- **Ban duration: 5 phút**
- Chỉ áp dụng khi DDoS thực sự

**Lưu ý:**
- Không ban IP cho spam thông thường
- Chỉ ban khi vượt quá threshold cao (DDoS)

---

## 🛡️ DDoS Protection

### 1. Early Rate Limiting

**Thứ tự xử lý:**
1. ✅ Check IP ban (nếu bị ban → return 403 ngay)
2. ✅ Check rate limit (nếu vượt → return 429 ngay)
3. ✅ Parse body tối thiểu (chỉ lấy customer_name, phone, address)
4. ✅ Check spam pattern (nếu spam → return ngay)
5. ✅ Xử lý logic phức tạp (chỉ khi pass tất cả checks)

**Lợi ích:**
- Giảm tải server: không xử lý logic khi đã phát hiện spam
- Phản hồi nhanh: return ngay khi phát hiện spam
- Chống DDoS: ban IP khi DDoS thực sự

---

### 2. Early Spam Detection

**Logic:**
- Phát hiện spam ngay sau khi parse body tối thiểu
- Return ngay, không xử lý validation phức tạp
- Không query database nếu đã phát hiện spam

**Tối ưu:**
- Chỉ parse `customer_name`, `phone`, `delivery_address`
- Không validate phức tạp nếu đã spam
- Không query database nếu đã spam

---

## ⚙️ Cấu Hình Chi Tiết

### Rate Limiting

| Endpoint | IP Limit | Customer Limit | Window |
|----------|----------|----------------|--------|
| `/api/orders` | 50/phút | 5/phút | 1 phút |
| `/api/admin/login` | 5/phút | - | 1 phút |
| `/api/products` | 30/phút | - | 1 phút |
| `/api/orders/cancel` | 5/phút | - | 1 phút |

### Spam Detection

| Loại | Pattern | Threshold | Window |
|------|---------|-----------|--------|
| Customer Name | `khach1`, `Khách 1`... | 1-100000 | - |
| Phone | `0900000001`... | 1-100000 | - |
| Address | `A1`, `address1`... | 1-100000 | - |

### Banlist

| Loại | Threshold | Window | Duration |
|------|-----------|--------|----------|
| Customer Ban | 5 lần spam | 2 phút | 5 phút |
| IP Ban (DDoS) | > 100 requests/phút | 1 phút | 5 phút |

---

## 🔄 Luồng Xử Lý

### POST /api/orders

```
Request →
  1. Check IP ban?
     ├─ BAN → Return 403 (ngay lập tức)
     └─ OK → Tiếp tục
     
  2. Check IP rate limit?
     ├─ EXCEED → Return 429 (ngay lập tức)
     └─ OK → Tiếp tục
     
  3. Parse body tối thiểu (customer_name, phone, address)
  
  4. Check customer ban?
     ├─ BAN → Return 403 (ngay lập tức)
     └─ OK → Tiếp tục
     
  5. Check spam pattern?
     ├─ SPAM → Record attempt → Return 400/403 (ngay lập tức)
     └─ OK → Tiếp tục
     
  6. Check customer rate limit?
     ├─ EXCEED → Return 429
     └─ OK → Tiếp tục
     
  7. Validate input (phức tạp)
  8. Check product availability
  9. Create order
  10. Return success
```

---

## 📊 Tổng Kết

### ✅ Đã Triển Khai

1. **Rate Limiting**
   - ✅ IP-based (50 requests/phút)
   - ✅ Customer-based (5 orders/phút) ⭐

2. **Spam Detection**
   - ✅ Pattern detection (tên, số điện thoại, địa chỉ)
   - ✅ Comprehensive detection
   - ✅ Validation chặt chẽ

3. **Banlist**
   - ✅ Customer-based banlist ⭐
   - ✅ IP banlist (DDoS only)

4. **DDoS Protection**
   - ✅ Early rate limiting
   - ✅ Early spam detection
   - ✅ Tối ưu xử lý

### 🎯 Điểm Mạnh

- ✅ Phù hợp môi trường trường học (10000 sinh viên)
- ✅ Chỉ ban người spam, không ảnh hưởng người khác
- ✅ Chống spam hiệu quả với nhiều lớp bảo vệ
- ✅ Chống DDoS với early detection
- ✅ Tối ưu performance với early return

### ⚠️ Lưu Ý

- ⚠️ Rate limiting là in-memory (serverless có thể không hoàn hảo)
- ⚠️ Có thể cần Redis cho distributed rate limiting
- ⚠️ Pattern có thể thay đổi, cần monitoring

### 🔄 Khuyến Nghị

- 🔄 Có thể thêm CAPTCHA nếu vẫn bị spam
- 🔄 Có thể thêm phone verification (SMS OTP)
- 🔄 Có thể thêm Redis cho distributed rate limiting
- 🔄 Có thể thêm monitoring và alerting

---

## 📝 File Liên Quan

- `frontend/lib/rateLimit.js` - Rate limiting logic
- `frontend/lib/spamDetection.js` - Spam detection logic
- `frontend/api/orders.js` - Order endpoint với protection
- `backend/server.js` - Backend với protection

---

**Status:** ✅ **ĐÃ TRIỂN KHAI ĐẦY ĐỦ**  
**Last Updated:** 2025-01-21  
**Version:** 2.0

