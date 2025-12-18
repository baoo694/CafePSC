// API URL - sử dụng Vercel API routes hoặc localhost cho development
const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' 
    ? `http://localhost:3001/api`  // Local backend
    : '/api'  // Vercel serverless functions
);

// Products API
export async function fetchProducts() {
  const response = await fetch(`${API_URL}/products`);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
}

export async function updateProductAvailability(id, isAvailable) {
  const response = await fetch(`${API_URL}/products/${id}/availability`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_available: isAvailable }),
  });
  if (!response.ok) throw new Error('Failed to update product');
  return response.json();
}

// Orders API
export async function fetchOrders() {
  const response = await fetch(`${API_URL}/orders`);
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
}

export async function createOrder(orderData) {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  if (!response.ok) throw new Error('Failed to create order');
  return response.json();
}

export async function updateOrderStatus(id, status) {
  const response = await fetch(`${API_URL}/orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update order');
  return response.json();
}

export async function resetAllOrders() {
  const response = await fetch(`${API_URL}/orders/reset`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to reset orders');
  return response.json();
}

export async function cancelOrder(id) {
  const response = await fetch(`${API_URL}/orders/${id}/cancel`, {
    method: 'PUT',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel order');
  }
  return response.json();
}

// Admin authentication
export async function adminLogin(password) {
  const response = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }
  return response.json();
}

