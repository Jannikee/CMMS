import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';
// Create axios instance with base URL
const maintenanceAPI = axios.create({
  baseURL: `${API_URL}/maintenance`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
maintenanceAPI.interceptors.request.use(
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

// Fetch maintenance logs with optional filters
export const fetchMaintenanceLogs = async (filters = {}) => {
  try {
    const response = await maintenanceAPI.get('/', { params: filters });
    return response.data.maintenance_logs;
  } catch (error) {
    console.error('Error fetching maintenance logs:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch maintenance logs');
  }
};

// Fetch recent maintenance logs
export const fetchRecentMaintenanceLogs = async (limit = 5) => {
  try {
    const response = await maintenanceAPI.get('/', {
      params: {
        limit,
        sort: 'timestamp',
        order: 'desc'
      }
    });
    return response.data.maintenance_logs.slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent maintenance logs:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch recent maintenance logs');
  }
};

// Add new maintenance log
export const addMaintenanceLog = async (data, files = []) => {
  try {
    // If no files, use JSON content type
    if (!files.length) {
      const response = await maintenanceAPI.post('/', data);
      return response.data;
    }
    
    // If files are included, use FormData
    const formData = new FormData();
    
    // Add all data fields to FormData
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });
    
    // Add files to FormData
    files.forEach(file => {
      formData.append('images', file);
    });
    
    const response = await axios.post(`${API_URL}/maintenance/`, formData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error adding maintenance log:', error);
    throw new Error(error.response?.data?.message || 'Failed to add maintenance log');
  }
};

// Get maintenance log by ID
export const getMaintenanceLogById = async (id) => {
  try {
    const response = await maintenanceAPI.get(`/${id}`);
    return response.data.maintenance_log;
  } catch (error) {
    console.error(`Error fetching maintenance log ${id}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch maintenance log');
  }
};

// Report a deviation/failure
export const reportDeviation = async (maintenanceData, files = []) => {
  // Set has_deviation to true
  const data = {
    ...maintenanceData,
    has_deviation: true
  };
  
  // Use the same addMaintenanceLog function
  return addMaintenanceLog(data, files);
};