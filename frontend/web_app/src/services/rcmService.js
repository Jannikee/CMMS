// frontend/web_app/src/services/rcmService.js - FIXED VERSION
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';

// Create axios instance with base URL and improved logging
const rcmAPI = axios.create({
  baseURL: `${API_URL}/rcm`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enhanced request interceptor with logging
rcmAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    console.log(`RCM API REQUEST: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, 
                config.params || config.data);
    return config;
  },
  (error) => {
    console.error('RCM API request error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with logging
rcmAPI.interceptors.response.use(
  (response) => {
    console.log(`RCM API RESPONSE ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error('RCM API response error:', 
                  error.response?.status, 
                  error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Fetch RCM analysis for equipment - FIXED
export const fetchRCMAnalysis = async (equipmentId = null) => {
  if (!equipmentId) {
    console.warn("fetchRCMAnalysis called without equipmentId");
    return [];
  }
  
  try {
    // Always append equipment_id to URL if provided
    const url = `/analysis?equipment_id=${equipmentId}`;
    
    console.log(`Fetching RCM analysis from ${url}`);
    const response = await rcmAPI.get(url);
    
    if (!response.data) {
      console.warn("Empty response received from RCM API");
      return [];
    }
    
    if (Array.isArray(response.data.rcm_analysis)) {
      return response.data.rcm_analysis;
    } else if (response.data.rcm_analysis) {
      // If it's an object but not an array, convert it to an array for consistency
      return [response.data.rcm_analysis];
    }
    
    console.warn("Unexpected RCM analysis response format:", response.data);
    return [];
  } catch (error) {
    console.error('Error fetching RCM analysis:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch RCM analysis');
  }
};

// Generate work orders from RCM analysis
export const generateWorkOrders = async (equipmentId) => {
  if (!equipmentId) {
    throw new Error("Equipment ID is required to generate work orders");
  }
  
  try {
    console.log(`Generating work orders for equipment ID: ${equipmentId}`);
    const response = await rcmAPI.post('/generate-work-orders', {
      equipment_id: equipmentId
    });
    return response.data;
  } catch (error) {
    console.error('Error generating work orders:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to generate work orders');
  }
};

// Upload RCM Excel file - FIXED with better error handling
export const uploadRCMExcel = async (formData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    if (!formData.get('file')) {
      throw new Error('No file provided in formData');
    }
    
    if (!formData.get('equipment_id')) {
      throw new Error('No equipment_id provided in formData');
    }
    
    console.log('Uploading RCM Excel file...');
    console.log('FormData contains:', 
                [...formData.entries()].map(e => e[0] === 'file' ? 
                                          `${e[0]}: ${e[1].name}` : 
                                          `${e[0]}: ${e[1]}`));
    
    // Use the fetch API instead of axios for better multipart form handling
    const response = await fetch(`${API_URL}/rcm/upload-excel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type, it will be set automatically with the boundary
      },
      body: formData
    });
    
    if (!response.ok) {
      // Try to parse error response
      let errorMessage = 'Failed to upload RCM Excel file';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If we can't parse the error, use the status text
        errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('Upload successful:', data);
    return data;
  } catch (error) {
    console.error('Error uploading RCM Excel:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

export default {
  fetchRCMAnalysis,
  generateWorkOrders,
  uploadRCMExcel
};