// Updated frontend RCM service for unit-first structure
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

// Fetch RCM units
export const fetchRCMUnits = async (equipmentId = null) => {
  try {
    let url = '/units';
    if (equipmentId) {
      url += `?equipment_id=${equipmentId}`;
    }
    
    const response = await rcmAPI.get(url);
    return response.data.units;
  } catch (error) {
    console.error('Error fetching RCM units:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch RCM units');
  }
};

// Create new RCM unit
export const createRCMUnit = async (unitData) => {
  try {
    const response = await rcmAPI.post('/units', unitData);
    return response.data;
  } catch (error) {
    console.error('Error creating RCM unit:', error);
    throw new Error(error.response?.data?.message || 'Failed to create RCM unit');
  }
};

// Fetch functions for a specific unit
export const fetchRCMFunctionsForUnit = async (unitId) => {
  try {
    const response = await rcmAPI.get(`/units/${unitId}/functions`);
    return response.data.functions;
  } catch (error) {
    console.error('Error fetching RCM functions for unit:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch RCM functions');
  }
};

// Create new function for a unit
export const createRCMFunctionForUnit = async (unitId, functionData) => {
  try {
    const response = await rcmAPI.post(`/units/${unitId}/functions`, functionData);
    return response.data;
  } catch (error) {
    console.error('Error creating RCM function:', error);
    throw new Error(error.response?.data?.message || 'Failed to create RCM function');
  }
};

// Fetch complete RCM analysis
export const fetchRCMAnalysis = async (equipmentId = null) => {
  try {
    let url = '/analysis';
    if (equipmentId) {
      url += `?equipment_id=${equipmentId}`;
    }
    
    const response = await rcmAPI.get(url);
    return response.data.rcm_analysis;
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

// Import RCM data
export const importRCMData = async (data) => {
  try {
    const response = await rcmAPI.post('/import', data);
    return response.data;
  } catch (error) {
    console.error('Error importing RCM data:', error);
    throw new Error(error.response?.data?.message || 'Failed to import RCM data');
  }
};

// Upload RCM Excel file
export const uploadRCMExcel = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/rcm/upload-excel`, formData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        // Don't set Content-Type here - it will be set automatically with the boundary
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading RCM Excel:', error);
    throw new Error(error.response?.data?.message || 'Failed to upload RCM Excel file');
  }
};