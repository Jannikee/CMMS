// services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://127.0.0.1:5000/api'; // Change this to your server address

export async function login(username, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Store the token
    await AsyncStorage.setItem('userToken', data.access_token);
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function fetchWorkOrders(token, type = 'daily') {
  try {
    // We'll assume you have an endpoint that can filter by type
    const response = await fetch(`${API_URL}/work-orders?type=${type}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch work orders');
    }
    
    return data.work_orders;
  } catch (error) {
    console.error('Fetch work orders error:', error);
    throw error;
  }
}

export async function completeWorkOrder(token, workOrderId, notes = "") {
  try {
    const response = await fetch(`${API_URL}/work-orders/${workOrderId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'completed',
        notes: notes,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update work order');
    }
    
    return data;
  } catch (error) {
    console.error('Complete work order error:', error);
    throw error;
  }
}
