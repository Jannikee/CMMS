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
    
    console.log(`Fetching RCM analysis from ${url}`);
    const response = await rcmAPI.get(url);
    
    if (response.data && Array.isArray(response.data.rcm_analysis)) {
      return response.data.rcm_analysis;
    } else if (response.data && typeof response.data.rcm_analysis === 'object') {
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

// Upload RCM Excel file with direct fetch API for better control
export const uploadRCMExcel = async (formData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    console.log('Uploading RCM Excel file...');
    
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