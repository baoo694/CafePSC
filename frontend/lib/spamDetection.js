/**
 * Spam Detection và Pattern Detection
 * Phát hiện và chặn spam đơn hàng với pattern tăng dần
 */

// Blacklist patterns
const SPAM_PATTERNS = {
  // Pattern tăng dần: khach1, khach2, khach3...
  sequentialNumbers: /^(khach|test|user|customer|guest|demo)\d+$/i,
  // Pattern số điện thoại tăng dần: 0900000001, 0900000002...
  sequentialPhone: /^0\d{8}(0[1-9]|[1-9]\d)$/,
  // Pattern địa chỉ tăng dần: A1, A2, A3... hoặc address1, address2...
  sequentialAddress: /^(A|address|diachi|add)\d+$/i,
};

// Blacklist từng phần
const BLACKLISTED_NAMES = [
  'khach', 'test', 'user', 'customer', 'guest', 'demo',
  'spam', 'hack', 'attack', 'bot'
];

/**
 * Detect spam pattern trong customer name
 */
export function detectSpamName(customerName) {
  if (!customerName || typeof customerName !== 'string') {
    return { isSpam: false };
  }
  
  const name = customerName.trim().toLowerCase();
  
  // Check sequential number pattern
  if (SPAM_PATTERNS.sequentialNumbers.test(name)) {
    return {
      isSpam: true,
      reason: 'Tên khách hàng có pattern spam (tăng dần)',
      pattern: 'sequential_numbers'
    };
  }
  
  // Check blacklisted names
  for (const blacklisted of BLACKLISTED_NAMES) {
    if (name.includes(blacklisted) && /\d+/.test(name)) {
      return {
        isSpam: true,
        reason: 'Tên khách hàng có dấu hiệu spam',
        pattern: 'blacklisted_name_with_numbers'
      };
    }
  }
  
  // Check if name is too short and contains only numbers
  if (name.length < 5 && /^\w+\d+$/.test(name)) {
    return {
      isSpam: true,
      reason: 'Tên khách hàng quá ngắn và có pattern spam',
      pattern: 'short_name_with_numbers'
    };
  }
  
  return { isSpam: false };
}

/**
 * Detect spam pattern trong phone number
 */
export function detectSpamPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isSpam: false };
  }
  
  const phoneClean = phone.replace(/\s/g, '');
  
  // Check sequential phone pattern (0900000001, 0900000002...)
  // Pattern: số bắt đầu bằng 0, có 9-10 chữ số, và kết thúc bằng số nhỏ (< 100)
  if (phoneClean.length >= 10 && phoneClean.length <= 11) {
    // Check if last 2-3 digits are sequential (01, 02, 03... or 001, 002...)
    const lastDigits = phoneClean.slice(-3);
    const lastDigit = parseInt(lastDigits);
    
    // Nếu số cuối nhỏ hơn 1000 và phone có pattern giống nhau
    if (lastDigit < 1000 && lastDigit > 0) {
      const prefix = phoneClean.slice(0, -lastDigits.length);
      // Check if prefix is mostly same digits (like 090000000)
      const uniqueDigits = new Set(prefix.split(''));
      if (uniqueDigits.size <= 2) {
        return {
          isSpam: true,
          reason: 'Số điện thoại có pattern spam (tăng dần)',
          pattern: 'sequential_phone'
        };
      }
    }
  }
  
  return { isSpam: false };
}

/**
 * Detect spam pattern trong delivery address
 */
export function detectSpamAddress(address) {
  if (!address || typeof address !== 'string') {
    return { isSpam: false };
  }
  
  const addr = address.trim().toLowerCase();
  
  // Check sequential address pattern
  if (SPAM_PATTERNS.sequentialAddress.test(addr)) {
    return {
      isSpam: true,
      reason: 'Địa chỉ có pattern spam (tăng dần)',
      pattern: 'sequential_address'
    };
  }
  
  return { isSpam: false };
}

/**
 * Comprehensive spam detection
 * Kiểm tra tất cả các trường và phát hiện pattern spam
 */
export function detectSpamOrder(orderData) {
  const { customer_name, phone, delivery_address } = orderData || {};
  
  const results = [];
  
  // Check customer name
  if (customer_name) {
    const nameCheck = detectSpamName(customer_name);
    if (nameCheck.isSpam) {
      results.push(nameCheck);
    }
  }
  
  // Check phone
  if (phone) {
    const phoneCheck = detectSpamPhone(phone);
    if (phoneCheck.isSpam) {
      results.push(phoneCheck);
    }
  }
  
  // Check address
  if (delivery_address) {
    const addressCheck = detectSpamAddress(delivery_address);
    if (addressCheck.isSpam) {
      results.push(addressCheck);
    }
  }
  
  // Check combination: nếu có nhiều pattern cùng lúc
  if (results.length >= 2) {
    return {
      isSpam: true,
      reason: 'Phát hiện nhiều pattern spam trong đơn hàng',
      patterns: results.map(r => r.pattern),
      details: results
    };
  }
  
  // Nếu có ít nhất 1 pattern spam
  if (results.length > 0) {
    return results[0];
  }
  
  return { isSpam: false };
}

/**
 * Check if multiple orders from similar patterns (advanced detection)
 * Cần lưu trữ recent orders để so sánh
 */
export function detectBulkSpam(recentOrders, currentOrder) {
  if (!recentOrders || recentOrders.length < 3) {
    return { isSpam: false };
  }
  
  const { customer_name, phone } = currentOrder;
  
  // Count similar patterns in recent orders
  let similarCount = 0;
  
  for (const order of recentOrders) {
    // Check if customer_name follows same pattern
    if (customer_name && order.customer_name) {
      const name1 = customer_name.toLowerCase();
      const name2 = order.customer_name.toLowerCase();
      
      // Extract base name and number
      const match1 = name1.match(/^(\w+)(\d+)$/);
      const match2 = name2.match(/^(\w+)(\d+)$/);
      
      if (match1 && match2 && match1[1] === match2[1]) {
        similarCount++;
      }
    }
    
    // Check if phone follows same pattern
    if (phone && order.phone) {
      const phone1 = phone.replace(/\s/g, '');
      const phone2 = order.phone.replace(/\s/g, '');
      
      // Check if same prefix with sequential numbers
      if (phone1.length === phone2.length) {
        const prefix1 = phone1.slice(0, -3);
        const prefix2 = phone2.slice(0, -3);
        
        if (prefix1 === prefix2) {
          similarCount++;
        }
      }
    }
  }
  
  // If more than 3 similar patterns, likely spam
  if (similarCount >= 3) {
    return {
      isSpam: true,
      reason: 'Phát hiện nhiều đơn hàng với pattern tương tự (spam hàng loạt)',
      similarCount
    };
  }
  
  return { isSpam: false };
}

