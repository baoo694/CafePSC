# 🚨 Fix: Chống Spam Đơn Hàng với Pattern Tăng Dần

**Ngày:** 2025-01-21  
**Mức độ:** 🔴 **Nghiêm trọng** - Đã bị tấn công thực tế

---

## 🎯 Vụ Tấn Công

### Mô Tả
Attacker đã spam đơn hàng với pattern tăng dần:
- **Tên khách hàng:** `khach1`, `khach2`, `khach3`, ...
- **Số điện thoại:** `0900000001`, `0900000002`, `0900000003`, ...
- **Địa chỉ:** `A1`, `A2`, `A3`, ... hoặc tương tự

### Tác Động
- ⚠️ Tạo hàng loạt đơn hàng giả
- ⚠️ Làm tắc nghẽn hệ thống
- ⚠️ Ảnh hưởng đến trải nghiệm người dùng thật
- ⚠️ Với 10000 sinh viên, có thể spam không giới hạn

---

## ✅ Giải Pháp Đã Triển Khai

### 1. **Spam Pattern Detection** 🔒

**File:** `frontend/lib/spamDetection.js`

**Phát hiện:**
- ✅ Pattern tên: `khach1`, `test2`, `user3`...
- ✅ Pattern số điện thoại: `0900000001`, `0900000002`...
- ✅ Pattern địa chỉ: `A1`, `A2`, `address1`...
- ✅ Tên quá ngắn + số: `a1`, `b2`...

**Code:**
```javascript
// Pattern detection
const spamNamePattern = /^(khach|test|user|customer|guest|demo|spam|hack)\d+$/i;
if (spamNamePattern.test(name)) {
  return { isSpam: true };
}
```

---

### 2. **Tăng Cường Validation** 🔒

**Validation mới:**
- ✅ Tên phải có ít nhất 2 ký tự chữ (không tính số)
- ✅ Chặn tên chỉ có số hoặc quá ngắn
- ✅ Validate pattern số điện thoại tăng dần

**Code:**
```javascript
// Tên phải có ít nhất 2 ký tự chữ
const nameWithoutNumbers = customer_name.replace(/\d/g, '');
if (nameWithoutNumbers.trim().length < 2) {
  return res.status(400).json({ error: 'Tên khách hàng phải có ít nhất 2 ký tự chữ' });
}
```

---

### 3. **Giảm Customer Rate Limit** 🔒

**Thay đổi:**
- Trước: 10 đơn/phút/customer
- Sau: **5 đơn/phút/customer**

**Lý do:**
- Với 10000 sinh viên, cần giới hạn chặt hơn
- 5 đơn/phút vẫn đủ cho nhu cầu bình thường
- Chống spam hiệu quả hơn

---

### 4. **Áp Dụng Cho Cả Frontend và Backend** 🔒

- ✅ `frontend/api/orders.js` - Vercel serverless
- ✅ `backend/server.js` - Express server
- ✅ Cả 2 đều có spam detection

---

## 📊 Các Pattern Bị Chặn

### ✅ Sẽ Bị Chặn:
- `khach1`, `khach2`, `khach3`...
- `test1`, `test2`, `test3`...
- `user1`, `user2`, `user3`...
- `0900000001`, `0900000002`...
- `A1`, `A2`, `A3`...
- `a1`, `b2`, `c3`...

### ✅ Vẫn Cho Phép:
- `Nguyễn Văn A`
- `Trần Thị B`
- `0901234567` (số điện thoại thật)
- `Phòng A101` (địa chỉ thật)

---

## 🧪 Test Cases

### Test 1: Pattern Spam
```bash
# Sẽ bị chặn
POST /api/orders
{
  "customer_name": "khach1",
  "phone": "0900000001",
  "delivery_address": "A1",
  "items": [...]
}
# Response: 400 - "Đơn hàng không hợp lệ. Vui lòng sử dụng thông tin thật của bạn."
```

### Test 2: Tên Hợp Lệ
```bash
# Sẽ pass
POST /api/orders
{
  "customer_name": "Nguyễn Văn A",
  "phone": "0901234567",
  "delivery_address": "Phòng A101",
  "items": [...]
}
# Response: 200 - Order created
```

---

## 🔧 Cấu Hình

### Rate Limits Hiện Tại:
- **Customer-based:** 5 đơn/phút/customer
- **IP-based:** 50 đơn/phút/IP (backup cho mạng chung)

### Spam Detection:
- **Pattern detection:** Tự động phát hiện
- **Blacklist:** `khach`, `test`, `user`, `customer`, `guest`, `demo`, `spam`, `hack`
- **Validation:** Tên phải có ít nhất 2 ký tự chữ

---

## 📋 Checklist

- [x] Spam pattern detection
- [x] Tăng cường validation
- [x] Giảm customer rate limit
- [x] Áp dụng cho frontend và backend
- [x] Test với các pattern spam
- [ ] (Optional) Thêm CAPTCHA
- [ ] (Optional) Thêm phone verification

---

## 🚀 Kết Quả

**Trước:**
- ❌ Có thể spam với pattern tăng dần
- ❌ Không có detection
- ❌ Rate limit quá cao (10/phút)

**Sau:**
- ✅ Tự động chặn pattern spam
- ✅ Validation chặt chẽ hơn
- ✅ Rate limit phù hợp (5/phút)
- ✅ Phù hợp cho 10000 sinh viên

---

## ⚠️ Lưu Ý

1. **Pattern có thể thay đổi:** Attacker có thể dùng pattern khác
2. **Cần monitoring:** Theo dõi logs để phát hiện pattern mới
3. **Có thể cần CAPTCHA:** Nếu vẫn bị spam, nên thêm CAPTCHA
4. **Phone verification:** Có thể thêm SMS OTP để verify số điện thoại

---

## 🔄 Cập Nhật Pattern (Nếu Cần)

Nếu phát hiện pattern spam mới, cập nhật trong:
- `frontend/lib/spamDetection.js`
- `backend/server.js` (function `detectSpamPattern`)

**Thêm pattern mới:**
```javascript
// Thêm vào SPAM_PATTERNS
newPattern: /^pattern_mới$/i
```

---

**Status:** ✅ **ĐÃ FIX**  
**Priority:** 🔴 **URGENT**  
**Deploy:** Ngay lập tức


