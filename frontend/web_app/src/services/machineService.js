// frontend/web_app/src/services/machineService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';

// Create axios instance with base URL
const machineAPI = axios.create({
  baseURL: `${API_URL}/machines`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging and token
machineAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
machineAPI.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} for ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`API Response error for ${error.config?.url || 'unknown request'}:`, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Fetch all machines
export const fetchMachines = async () => {
  try {
    console.log('Fetching all machines');
    const response = await machineAPI.get('/');
    
    if (!response.data) {
      console.warn('Machine API returned empty response');
      return [];
    }
    
    if (!response.data.machines) {
      console.warn('Machine API response missing machines array:', response.data);
      return [];
    }
    
    console.log(`Received ${response.data.machines.length} machines`);
    return response.data.machines || [];
  } catch (error) {
    console.error('Error fetching machines:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch machines');
  }
};

// Fetch a single machine by ID
export const fetchMachineById = async (id) => {
  try {
    if (!id) {
      throw new Error('Machine ID is required');
    }
    
    console.log(`Fetching machine with ID: ${id}`);
    const response = await machineAPI.get(`/${id}`);
    return response.data.machine;
  } catch (error) {
    console.error(`Error fetching machine ${id}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch machine');
  }
};

// Create a new machine
export const createMachine = async (machineData) => {
  try {
    console.log('Creating new machine:', machineData);
    const response = await machineAPI.post('/', machineData);
    return response.data;
  } catch (error) {
    console.error('Error creating machine:', error);
    throw new Error(error.response?.data?.message || 'Failed to create machine');
  }
};

// Update machine
export const updateMachine = async (id, machineData) => {
  try {
    console.log(`Updating machine ${id}:`, machineData);
    const response = await machineAPI.put(`/${id}`, machineData);
    return response.data;
  } catch (error) {
    console.error(`Error updating machine ${id}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to update machine');
  }
};

// Fetch subsystems for a machine
export const fetchSubsystems = async (machineId) => {
  try {
    if (!machineId) {
      throw new Error('Machine ID is required');
    }
    
    console.log(`Fetching subsystems for machine ${machineId}`);
    const response = await machineAPI.get(`/${machineId}/subsystems`);
    return response.data.subsystems || [];
  } catch (error) {
    console.error(`Error fetching subsystems for machine ${machineId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch subsystems');
  }
};

// Create a new subsystem
export const createSubsystem = async (machineId, subsystemData) => {
  try {
    console.log(`Creating subsystem for machine ${machineId}:`, subsystemData);
    const response = await machineAPI.post(`/${machineId}/subsystems`, subsystemData);
    return response.data;
  } catch (error) {
    console.error(`Error creating subsystem for machine ${machineId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to create subsystem');
  }
};

// Fetch a single subsystem by ID
export const fetchSubsystemById = async (subsystemId) => {
  try {
    if (!subsystemId) {
      throw new Error('Subsystem ID is required');
    }
    
    console.log(`Fetching subsystem ${subsystemId}`);
    const response = await machineAPI.get(`/subsystems/${subsystemId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching subsystem ${subsystemId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch subsystem');
  }
};

// Fetch components for a subsystem
export const fetchComponents = async (subsystemId) => {
  try {
    if (!subsystemId) {
      throw new Error('Subsystem ID is required');
    }
    
    console.log(`Fetching components for subsystem ${subsystemId}`);
    const response = await machineAPI.get(`/subsystems/${subsystemId}/components`);
    return response.data.components || [];
  } catch (error) {
    console.error(`Error fetching components for subsystem ${subsystemId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch components');
  }
};

// Fetch component hierarchy for a machine
export const getComponentHierarchy = async (machineId) => {
  try {
    if (!machineId) {
      throw new Error('Machine ID is required');
    }
    
    console.log(`Fetching component hierarchy for machine ${machineId}`);
    const token = localStorage.getItem('token');
    
    const response = await axios.get(`${API_URL}/machines/${machineId}/hierarchy`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Hierarchy response received:', response.status);
    
    // Check if response contains the necessary data
    if (response.data && response.data.hierarchy) {
      return response.data;
    } else {
      console.warn("Hierarchy data missing expected structure", response.data);
      throw new Error('Hierarchy data structure is invalid');
    }
  } catch (error) {
    console.error(`Error fetching hierarchy for machine ${machineId}:`, error);
    throw error;
  }
};

// Upload component structure Excel file
export const uploadComponentStructure = async (formData) => {
  try {
    console.log('Uploading component structure file');
    const token = localStorage.getItem('token');
    
    const response = await axios.post(`${API_URL}/machines/upload-structure`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - it will be set automatically
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading component structure:', error);
    throw new Error(error.response?.data?.message || 'Failed to upload component structure');
  }
};

export default {
  fetchMachines,
  fetchMachineById,
  createMachine,
  updateMachine,
  fetchSubsystems,
  createSubsystem,
  fetchSubsystemById,
  fetchComponents,
  getComponentHierarchy,
  uploadComponentStructure
};