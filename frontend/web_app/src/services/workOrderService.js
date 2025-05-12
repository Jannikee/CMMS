import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';

// Create axios instance with base URL
const workOrderAPI = axios.create({
  baseURL: `${API_URL}/work-orders`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
workOrderAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Fetch all work orders with optional filters
export const fetchWorkOrders = async (filters = {}) => {
  try {
    const response = await workOrderAPI.get('/', { params: filters });
    return response.data.work_orders;
  } catch (error) {
    console.error('Error fetching work orders:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch work orders');
  }
};

// Fetch recent work orders with limit
export const fetchRecentWorkOrders = async (limit = 5) => {
  try {
    const response = await workOrderAPI.get('/', { 
      params: { 
        limit,
        sort: 'created_at',
        order: 'desc'
      } 
    });
    return response.data.work_orders.slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent work orders:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch recent work orders');
  }
};

// Fetch a single work order by ID
export const fetchWorkOrderById = async (id) => {
  try {
    const response = await workOrderAPI.get(`/${id}`);
    return response.data.work_order;
  } catch (error) {
    console.error(`Error fetching work order ${id}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch work order');
  }
};

// Create a new work order
export const createWorkOrder = async (workOrderData) => {
  try {
    const response = await workOrderAPI.post('/', workOrderData);
    return response.data;
  } catch (error) {
    console.error('Error creating work order:', error);
    throw new Error(error.response?.data?.message || 'Failed to create work order');
  }
};

// Update an existing work order
export const updateWorkOrder = async (id, workOrderData) => {
  try {
    const response = await workOrderAPI.put(`/${id}`, workOrderData);
    return response.data;
  } catch (error) {
    console.error(`Error updating work order ${id}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to update work order');
  }
};

// Change work order status
export const updateWorkOrderStatus = async (id, status, notes = '') => {
  try {
    const response = await workOrderAPI.put(`/${id}`, {
      status,
      notes
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating work order ${id} status:`, error);
    throw new Error(error.response?.data?.message || 'Failed to update work order status');
  }
};

// Generate work orders from RCM analysis
export const generateFromRCM = async (equipmentId) => {
  try {
    const response = await axios.post(`${API_URL}/rcm/generate-work-orders`, {
      equipment_id: equipmentId
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error generating work orders from RCM:', error);
    throw new Error(error.response?.data?.message || 'Failed to generate work orders from RCM');
  }
};