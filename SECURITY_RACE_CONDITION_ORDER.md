# 🔒 Báo Cáo Bảo Mật: Lỗ Hổng Race Condition trong Đặt Hàng

**Ngày kiểm tra:** 2025-01-21  
**Mức độ nghiêm trọng:** ⚠️ **MEDIUM** - Có thể spam đặt hàng khi admin tắt sản phẩm

---

## 📋 Tóm Tắt

Hệ thống có **lỗ hổng Race Condition (TOCTOU - Time-of-check to time-of-use)** cho phép người dùng vẫn có thể đặt hàng sản phẩm đã bị admin tắt trong khoảng thời gian giữa việc kiểm tra availability và việc tạo order.

---

## 🔍 Chi Tiết Lỗ Hổng

### Vấn Đề

Trong các endpoint tạo order, có một khoảng trống thời gian giữa:
1. **Bước 1:** Kiểm tra product availability (SELECT query)
2. **Bước 2:** Tạo order (INSERT query)

**Kịch bản tấn công:**
```
Time 0ms:  User A gửi request đặt hàng sản phẩm X (đang available)
Time 10ms: Server check availability → sản phẩm X = available ✅
Time 20ms: Admin tắt sản phẩm X (is_available = false)
Time 30ms: Server insert order → thành công ❌ (sản phẩm đã bị tắt nhưng order vẫn được tạo)
```

### Các Endpoint Bị Ảnh Hưởng

#### 1. `backend/server.js` - POST /api/orders
**Vị trí:** Lines 244-314

```javascript
// Line 244-265: Check availability
const { data: products, error: productsError } = await supabase
  .from('products')
  .select('id, name, is_available')
  .in('id', productIds);

const unavailableProducts = products.filter(p => !p.is_available);
if (unavailableProducts.length > 0) {
  return res.status(400).json({ error: '...' });
}

// ⚠️ RACE CONDITION WINDOW ⚠️
// Admin có thể tắt product ở đây

// Line 279-283: Insert order (không check lại)
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert(orderData)
  .select()
  .single();
```

#### 2. `frontend/api/orders/index.js` - POST /api/orders
**Vị trí:** Lines 139-198

Tương tự như trên, có khoảng trống giữa check (line 142-161) và insert (line 172-198).

#### 3. `frontend/api/orders.js` - POST /api/orders
**Vị trí:** Lines 144-206

Tương tự như trên, có khoảng trống giữa check (line 147-163) và insert (line 180-206).

---

## 🎯 Tác Động

### Mức Độ Nghiêm Trọng: **MEDIUM**

**Hậu quả:**
- ✅ User có thể đặt hàng sản phẩm đã bị admin tắt
- ✅ Có thể spam đặt hàng bằng cách gửi nhiều requests đồng thời
- ✅ Tạo ra đơn hàng không hợp lệ trong hệ thống
- ⚠️ Ảnh hưởng đến quản lý inventory và workflow của admin

**Điều kiện khai thác:**
- Cần timing chính xác (race condition window ~10-50ms)
- Có thể tự động hóa bằng script
- Không cần authentication

---

## ✅ Giải Pháp Đề Xuất

### Giải Pháp 1: Double-Check Pattern (Recommended)

Kiểm tra lại availability ngay trước khi insert order:

```javascript
// Check availability lần 1
const { data: products, error: productsError } = await supabase
  .from('products')
  .select('id, name, is_available')
  .in('id', productIds);

const unavailableProducts = products.filter(p => !p.is_available);
if (unavailableProducts.length > 0) {
  return res.status(400).json({ error: '...' });
}

// ... prepare orderData ...

// ✅ CHECK LẠI LẦN 2 ngay trước khi insert
const { data: productsRecheck, error: recheckError } = await supabase
  .from('products')
  .select('id, name, is_available')
  .in('id', productIds);

if (recheckError) throw recheckError;

const unavailableRecheck = productsRecheck.filter(p => !p.is_available);
if (unavailableRecheck.length > 0) {
  const productNames = unavailableRecheck.map(p => p.name).join(', ');
  return res.status(400).json({ 
    error: `Sản phẩm đã bị tắt trong lúc xử lý: ${productNames}` 
  });
}

// Insert order
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert(orderData)
  .select()
  .single();
```

**Ưu điểm:**
- ✅ Dễ implement
- ✅ Giảm đáng kể race condition window
- ✅ Không cần thay đổi database schema

**Nhược điểm:**
- ⚠️ Vẫn có thể bị race condition nếu timing cực kỳ chính xác
- ⚠️ Tăng 1 query mỗi order

---

### Giải Pháp 2: Database Constraint + Transaction (Best Practice)

Sử dụng database constraint và transaction để đảm bảo atomicity:

#### Bước 1: Tạo Database Function

```sql
-- Function để check availability trước khi insert order_items
CREATE OR REPLACE FUNCTION check_product_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if product is available
  IF NOT EXISTS (
    SELECT 1 FROM products 
    WHERE id = NEW.product_id 
    AND is_available = true
  ) THEN
    RAISE EXCEPTION 'Product % is not available', NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger trước khi insert order_items
CREATE TRIGGER check_availability_before_insert
BEFORE INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION check_product_availability();
```

#### Bước 2: Sử dụng Transaction trong Code

```javascript
// Sử dụng Supabase transaction (nếu hỗ trợ) hoặc RPC
const { data, error } = await supabase.rpc('create_order_with_check', {
  p_customer_name: customer_name,
  p_phone: phone,
  p_items: items,
  // ... other params
});
```

**Ưu điểm:**
- ✅ Atomic operation - không thể bypass
- ✅ Database-level protection
- ✅ Đảm bảo data integrity

**Nhược điểm:**
- ⚠️ Cần thay đổi database schema
- ⚠️ Phức tạp hơn trong implementation

---

### Giải Pháp 3: Optimistic Locking với Version

Thêm version field vào products table và check version khi update:

```sql
ALTER TABLE products ADD COLUMN version INTEGER DEFAULT 1;
```

```javascript
// Check với version
const { data: products } = await supabase
  .from('products')
  .select('id, name, is_available, version')
  .in('id', productIds);

// Store versions
const productVersions = {};
products.forEach(p => {
  productVersions[p.id] = p.version;
});

// ... prepare order ...

// Check lại với version
const { data: productsRecheck } = await supabase
  .from('products')
  .select('id, name, is_available, version')
  .in('id', productIds);

// Verify versions haven't changed
for (const product of productsRecheck) {
  if (productVersions[product.id] !== product.version) {
    return res.status(400).json({ 
      error: 'Sản phẩm đã thay đổi, vui lòng thử lại' 
    });
  }
}
```

---

## 🛠️ Implementation Plan

### Phase 1: Quick Fix (Immediate)
1. ✅ Thêm double-check pattern vào tất cả 3 endpoints
2. ✅ Test với concurrent requests
3. ✅ Deploy ngay

### Phase 2: Long-term Solution (Recommended)
1. ✅ Tạo database trigger/constraint
2. ✅ Implement transaction-based order creation
3. ✅ Add monitoring và alerting

---

## 📊 Testing

### Test Case 1: Race Condition
```javascript
// Simulate race condition
const productId = 1;

// Request 1: User đặt hàng
const orderRequest = fetch('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    customer_name: 'Test',
    items: [{ product_id: productId, quantity: 1 }]
  })
});

// Request 2: Admin tắt product (cùng lúc)
const disableRequest = fetch(`/api/products/${productId}/availability`, {
  method: 'PUT',
  body: JSON.stringify({ is_available: false })
});

// Kết quả mong đợi: Order request phải fail
```

### Test Case 2: Concurrent Orders
```javascript
// Gửi 10 requests đồng thời cho sản phẩm đang available
// Admin tắt product sau 50ms
// Kết quả: Tất cả orders sau khi product bị tắt phải fail
```

---

## 📝 Checklist

- [ ] Fix `backend/server.js` - POST /api/orders
- [ ] Fix `frontend/api/orders/index.js` - POST /api/orders  
- [ ] Fix `frontend/api/orders.js` - POST /api/orders
- [ ] Test race condition scenarios
- [ ] Test concurrent requests
- [ ] Deploy và monitor
- [ ] (Optional) Implement database constraint solution

---

## 🔗 References

- [OWASP: Race Conditions](https://owasp.org/www-community/vulnerabilities/Race_condition)
- [Time-of-check to time-of-use (TOCTOU)](https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use)
- [Supabase Transactions](https://supabase.com/docs/guides/database/transactions)

---

**Status:** ⚠️ **CẦN SỬA NGAY**  
**Priority:** Medium  
**Estimated Fix Time:** 1-2 hours (Quick Fix), 4-6 hours (Database Solution)

