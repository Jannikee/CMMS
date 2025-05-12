// frontend/web_app/src/services/rcmService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with base URL
const rcmAPI = axios.create({
  baseURL: `${API_URL}/rcm`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
rcmAPI.interceptors.request.use(
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

// Fetch RCM analysis for equipment
export const fetchRCMAnalysis = async (equipmentId = null) => {
  try {
    let url = '/analysis';
    if (equipmentId) {
      url += `?equipment_id=${equipmentId}`;
    }
    
    const response = await rcmAPI.get(url);
    return response.data.rcm_analysis || [];
  } catch (error) {
    console.error('Error fetching RCM analysis:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch RCM analysis');
  }
};

// Generate work orders from RCM analysis
export const generateWorkOrders = async (equipmentId) => {
  try {
    const response = await rcmAPI.post('/generate-work-orders', {
      equipment_id: equipmentId
    });
    return response.data;
  } catch (error) {
    console.error('Error generating work orders:', error);
    throw new Error(error.response?.data?.message || 'Failed to generate work orders');
  }
};

// Upload RCM Excel file
export const uploadRCMExcel = async (formData) => {
  try {
    // For file uploads, we need to use the base axios instance with the right headers
    const token = localStorage.getItem('token');
    
    const response = await axios.post(`${API_URL}/rcm/upload-excel`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        // Let the browser set the content type with boundary automatically
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading RCM Excel:', error);
    
    // Enhanced error handling
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message || 'Failed to upload RCM Excel file');
    }
    
    throw new Error('Failed to upload RCM Excel file: Network error');
  }
};

export default {
  fetchRCMAnalysis,
  generateWorkOrders,
  uploadRCMExcel
};