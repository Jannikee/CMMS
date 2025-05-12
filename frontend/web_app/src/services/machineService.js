// frontend/web_app/src/services/machineService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with base URL
const machineAPI = axios.create({
  baseURL: `${API_URL}/machines`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
machineAPI.interceptors.request.use(
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

// Fetch all machines
export const fetchMachines = async () => {
  try {
    const response = await machineAPI.get('/');
    return response.data.machines || [];
  } catch (error) {
    console.error('Error fetching machines:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch machines');
  }
};

// Fetch a single machine by ID
export const fetchMachineById = async (id) => {
  try {
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
    console.log(`Fetching component hierarchy for machine ${machineId}`);
    const token = localStorage.getItem('token');
    
    const response = await axios.get(`${API_URL}/machines/${machineId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Check if response contains the necessary data
    if (response.data && response.data.machine) {
      console.log("Hierarchy data fetched successfully");
      
      // Return formatted hierarchy data
      return {
        hierarchy: {
          id: response.data.machine.id,
          name: response.data.machine.name,
          technical_id: response.data.machine.technical_id,
          subsystems: response.data.machine.subsystems || []
        }
      };
    } else {
      console.warn("Machine data received but missing expected structure");
      throw new Error('Machine data structure is invalid');
    }
  } catch (error) {
    console.error(`Error fetching hierarchy for machine ${machineId}:`, error);
    throw error;
  }
};

// Upload component structure Excel file
export const uploadComponentStructure = async (formData) => {
  try {
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