// API URL - sử dụng Vercel API routes hoặc localhost cho development
const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' 
    ? `http://localhost:3001/api`  // Local backend
    : '/api'  // Vercel serverless functions
);

// Helper function to get CSRF token from localStorage
function getCSRFToken() {
  return localStorage.getItem('csrfToken') || null;
}

// Helper function to set CSRF token
function setCSRFToken(token) {
  if (token) {
    localStorage.setItem('csrfToken', token);
  } else {
    localStorage.removeItem('csrfToken');
  }
}

// Products API
export async function fetchProducts() {
  const response = await fetch(`${API_URL}/products`);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
}

export async function updateProductAvailability(id, isAvailable) {
  const csrfToken = getCSRFToken();
  const headers = { 
    'Content-Type': 'application/json'
  };
  
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  const response = await fetch(`${API_URL}/products/${id}/availability`, {
    method: 'PUT',
    credentials: 'include', // Gửi cookies (httpOnly)
    headers,
    body: JSON.stringify({ is_available: isAvailable }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update product' }));
    throw new Error(error.error || 'Failed to update product');
  }
  return response.json();
}

// Orders API
export async function fetchOrders() {
  const response = await fetch(`${API_URL}/orders`, {
    credentials: 'include' // Include cookies for auth
  });
  if (!response.ok) {
    // Handle 401 (Unauthorized) gracefully - user not authenticated
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to fetch orders');
  }
  return response.json();
}

export async function fetchCustomerOrders(customerName, phone) {
  const params = new URLSearchParams({
    customer_name: customerName,
    phone: phone
  });
  const response = await fetch(`${API_URL}/orders/customer?${params}`);
  if (!response.ok) throw new Error('Failed to fetch customer orders');
  return response.json();
}

export async function createOrder(orderData) {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create order' }));
    // Log chi tiết để debug
    console.error('Order creation failed:', {
      status: response.status,
      statusText: response.statusText,
      error: error,
      orderData: orderData
    });
    throw new Error(error.error || 'Không thể đặt hàng. Vui lòng thử lại.');
  }
  return response.json();
}

export async function updateOrderStatus(id, status) {
  const csrfToken = getCSRFToken();
  const headers = { 
    'Content-Type': 'application/json'
  };
  
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  const response = await fetch(`${API_URL}/orders/${id}/status`, {
    method: 'PUT',
    credentials: 'include', // Gửi cookies (httpOnly)
    headers,
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update order' }));
    throw new Error(error.error || 'Failed to update order');
  }
  return response.json();
}

export async function resetAllOrders() {
  const csrfToken = getCSRFToken();
  const headers = {};
  
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  const response = await fetch(`${API_URL}/orders/reset`, {
    method: 'DELETE',
    credentials: 'include', // Gửi cookies (httpOnly)
    headers
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to reset orders' }));
    throw new Error(error.error || 'Failed to reset orders');
  }
  return response.json();
}

export async function cancelOrder(id, customerName, phone) {
  const response = await fetch(`${API_URL}/orders/${id}/cancel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: customerName,
      phone: phone
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel order');
  }
  return response.json();
}

export async function deleteOrder(id) {
  const csrfToken = getCSRFToken();
  const headers = {};
  
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  const response = await fetch(`${API_URL}/orders/${id}`, {
    method: 'DELETE',
    credentials: 'include', // Gửi cookies (httpOnly)
    headers
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete order' }));
    throw new Error(error.error || 'Failed to delete order');
  }
  return response.json();
}

// Admin authentication
export async function adminLogin(password) {
  const response = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    credentials: 'include', // Gửi và nhận cookies
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }
  const data = await response.json();
  
  // Store CSRF token if provided
  if (data.csrfToken) {
    setCSRFToken(data.csrfToken);
  }
  
  return data;
}

// Admin logout
export async function adminLogout() {
  // Clear CSRF token
  setCSRFToken(null);
  
  const response = await fetch(`${API_URL}/admin/logout`, {
    method: 'POST',
    credentials: 'include' // Gửi cookies để xóa
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Logout failed');
  }
  return response.json();
}

// Check admin authentication status
export async function checkAdminAuth() {
  // Use dedicated auth check endpoint to avoid unnecessary 401 logs
  // This endpoint returns 200 if authenticated, 401 if not
  try {
    const response = await fetch(`${API_URL}/admin/check`, {
      method: 'GET',
      credentials: 'include',
    });
    // 401 = not authenticated (expected, not an error)
    // 200 = authenticated
    return response.status === 200;
  } catch (error) {
    // Network error or other issues
    return false;
  }
}

