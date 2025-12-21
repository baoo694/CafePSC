/**
 * Spam Detection và Pattern Detection
 * Phát hiện và chặn spam đơn hàng với pattern tăng dần
 */

// Blacklist patterns
const SPAM_PATTERNS = {
  // Pattern số điện thoại tăng dần: 0900000001, 0900000002...
  sequentialPhone: /^0\d{8}(0[1-9]|[1-9]\d)$/,
  // Pattern địa chỉ tăng dần: A1, A2, A3... hoặc address1, address2...
  sequentialAddress: /^(A|address|diachi|add)\s*\d+$/i,
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
  
  // Check sequential number pattern (khach1, Khách 1, Khách1...)
  // Chặn pattern "Khách n" với n từ 1 đến 100000
  // Pattern: "Khách 1", "Khách 2", "khach1", "Khách1" (có hoặc không có khoảng trắng)
  const sequentialMatch = name.match(/^(khách|khach|test|user|customer|guest|demo|spam|hack)\s*(\d+)$/i);
  if (sequentialMatch) {
    const number = parseInt(sequentialMatch[2]);
    // Chặn nếu số từ 1 đến 100000
    if (number >= 1 && number <= 100000) {
      return {
        isSpam: true,
        reason: `Tên khách hàng có pattern spam (tăng dần: Khách ${number})`,
        pattern: 'sequential_numbers',
        detectedNumber: number
      };
    }
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
  
  const phoneClean = phone.replace(/[\s\-\(\)\.]/g, ''); // Remove spaces, dashes, parentheses, dots
  
  // Validate Vietnamese phone format: 10 digits starting with 0
  // Hoặc 11 digits với +84
  if (phoneClean.length < 10 || phoneClean.length > 11) {
    return { isSpam: false }; // Let validation handle invalid length
  }
  
  // Remove +84 prefix if present
  let phoneNumber = phoneClean;
  if (phoneClean.startsWith('+84')) {
    phoneNumber = '0' + phoneClean.slice(3);
  }
  
  // Must start with 0 and be 10 digits
  if (!phoneNumber.match(/^0\d{9}$/)) {
    return { isSpam: false }; // Let validation handle
  }
  
  // Check sequential phone pattern (0900000001, 0900000002...)
  // Pattern 1: Số cuối tăng dần (01, 02, 03... đến 100000)
  const lastDigits = phoneNumber.slice(-3);
  const lastDigit = parseInt(lastDigits);
  
  if (lastDigit >= 1 && lastDigit <= 100000) {
    const prefix = phoneNumber.slice(0, -lastDigits.length);
    // Check if prefix is mostly same digits (like 090000000, 091111111)
    const uniqueDigits = new Set(prefix.split(''));
    if (uniqueDigits.size <= 2) {
      return {
        isSpam: true,
        reason: `Số điện thoại có pattern spam (tăng dần: ${phoneNumber})`,
        pattern: 'sequential_phone',
        detectedNumber: lastDigit
      };
    }
  }
  
  // Pattern 2: Số có nhiều chữ số giống nhau (0900000000, 0911111111)
  const digitCounts = {};
  for (const digit of phoneNumber) {
    digitCounts[digit] = (digitCounts[digit] || 0) + 1;
  }
  const maxCount = Math.max(...Object.values(digitCounts));
  // Nếu một chữ số xuất hiện >= 7 lần (trong 10 chữ số) → có thể là spam
  if (maxCount >= 7) {
    return {
      isSpam: true,
      reason: 'Số điện thoại có nhiều chữ số giống nhau (có thể là giả)',
      pattern: 'repeated_digits_phone'
    };
  }
  
  // Pattern 3: Số điện thoại có pattern lặp lại (0909090909, 0123456789)
  if (phoneNumber.match(/^0(\d)\1{8}$/) || // 0111111111
      phoneNumber.match(/^0(\d{2})\1{4}$/) || // 0120120120
      phoneNumber === '0123456789' || // Sequential
      phoneNumber === '0987654321') { // Reverse sequential
    return {
      isSpam: true,
      reason: 'Số điện thoại có pattern không hợp lệ',
      pattern: 'invalid_pattern_phone'
    };
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
  
  // Pattern 1: Sequential address (A1, A2, address1, address2...)
  const sequentialMatch = addr.match(/^(A|address|diachi|add|test|demo|spam)\s*(\d+)$/i);
  if (sequentialMatch) {
    const number = parseInt(sequentialMatch[2]);
    // Chặn nếu số từ 1 đến 100000
    if (number >= 1 && number <= 100000) {
      return {
        isSpam: true,
        reason: `Địa chỉ có pattern spam (tăng dần: ${address})`,
        pattern: 'sequential_address',
        detectedNumber: number
      };
    }
  }
  
  // Pattern 2: Địa chỉ quá ngắn và chỉ có số (A1, B2, C3...)
  if (addr.length <= 3 && /^[a-z]\d+$/i.test(addr)) {
    const number = parseInt(addr.match(/\d+/)?.[0] || '0');
    if (number >= 1 && number <= 100000) {
      return {
        isSpam: true,
        reason: 'Địa chỉ quá ngắn và có pattern spam',
        pattern: 'short_sequential_address'
      };
    }
  }
  
  // Pattern 3: Địa chỉ chỉ có từ spam + số
  const spamWords = ['test', 'demo', 'spam', 'fake', 'hack', 'bot'];
  for (const word of spamWords) {
    if (addr.includes(word) && /\d+/.test(addr)) {
      return {
        isSpam: true,
        reason: 'Địa chỉ có từ khóa spam',
        pattern: 'spam_keyword_address'
      };
    }
  }
  
  // Pattern 4: Địa chỉ quá ngắn (< 5 ký tự) và có số
  if (addr.length < 5 && /\d+/.test(addr)) {
    return {
      isSpam: true,
      reason: 'Địa chỉ quá ngắn và có dấu hiệu spam',
      pattern: 'too_short_address'
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

