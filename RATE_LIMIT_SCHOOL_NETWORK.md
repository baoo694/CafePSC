# 🎓 Vấn Đề Rate Limiting Trong Môi Trường Trường Học

## ❌ Vấn Đề Với IP-based Rate Limiting

### Kịch Bản Thực Tế

**Môi trường:** Trường đại học - tất cả sinh viên dùng chung mạng WiFi của trường

**Vấn đề:**
- Tất cả sinh viên có cùng **public IP** (NAT/Proxy của trường)
- Rate limit hiện tại: **10 đơn/phút/IP**
- Nếu có 100 sinh viên cùng đặt hàng:
  - Sinh viên 1-10: ✅ Đặt được
  - Sinh viên 11-100: ❌ Bị rate limit (dù họ không spam!)

**Hậu quả:**
- ⚠️ Sinh viên hợp lệ bị chặn
- ⚠️ Một sinh viên spam có thể chặn tất cả người khác
- ⚠️ Trải nghiệm người dùng rất tệ

---

## ✅ Giải Pháp: Customer-based Rate Limiting

### Thay Đổi Chiến Lược

**Thay vì:** Rate limit theo IP  
**Nên dùng:** Rate limit theo **customer_name + phone**

**Lý do:**
- ✅ Mỗi sinh viên có thông tin riêng (tên, số điện thoại)
- ✅ Không bị ảnh hưởng bởi người khác
- ✅ Vẫn chống được spam (mỗi người chỉ được 5-10 đơn/phút)

---

## 🔧 Implementation Plan

### Option 1: Customer-based Only (Recommended)
- Rate limit theo `customer_name + phone`
- Bỏ IP-based rate limiting cho `/api/orders`
- Giới hạn: 5-10 đơn/phút/customer

### Option 2: Hybrid (IP + Customer)
- IP-based: 50 đơn/phút (cho toàn bộ mạng trường)
- Customer-based: 5 đơn/phút (cho mỗi sinh viên)
- Chặn nếu vượt một trong hai giới hạn

### Option 3: Customer-based + Pattern Detection
- Customer-based rate limit
- Detect pattern spam (Test1, Test2, Test3...)
- Blacklist tự động

---

## 📊 So Sánh

| Phương Pháp | Ưu Điểm | Nhược Điểm | Phù Hợp |
|-------------|---------|------------|---------|
| **IP-based** | Đơn giản | ❌ Không phù hợp mạng chung | ❌ Không |
| **Customer-based** | ✅ Phù hợp mạng chung | Cần validate customer info | ✅ **Có** |
| **Hybrid** | Bảo vệ tốt nhất | Phức tạp hơn | ✅ Có |

---

## 🎯 Khuyến Nghị

**Cho môi trường trường học:** Sử dụng **Customer-based Rate Limiting**

**Giới hạn đề xuất:**
- 5-10 đơn hàng/phút/customer
- Có thể tăng lên 15-20 nếu cần

**Lợi ích:**
- ✅ Mỗi sinh viên có quota riêng
- ✅ Không bị ảnh hưởng bởi người khác
- ✅ Vẫn chống được spam hiệu quả


