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
    return response.data.machines;
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

// Fetch subsystems for a machine
export const fetchSubsystems = async (machineId) => {
  try {
    const response = await machineAPI.get(`/${machineId}/subsystems`);
    return response.data.subsystems;
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
    return response.data.subsystem;
  } catch (error) {
    console.error(`Error fetching subsystem ${subsystemId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch subsystem');
  }
};

// Fetch components for a subsystem
export const fetchComponents = async (subsystemId) => {
  try {
    const response = await machineAPI.get(`/subsystems/${subsystemId}/components`);
    return response.data.components;
  } catch (error) {
    console.error(`Error fetching components for subsystem ${subsystemId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch components');
  }
};

// Create a new component
export const createComponent = async (subsystemId, componentData) => {
  try {
    const response = await machineAPI.post(`/subsystems/${subsystemId}/components`, componentData);
    return response.data;
  } catch (error) {
    console.error(`Error creating component for subsystem ${subsystemId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to create component');
  }
};

// Fetch a single component by ID
export const fetchComponentById = async (componentId) => {
  try {
    const response = await machineAPI.get(`/components/${componentId}`);
    return response.data.component;
  } catch (error) {
    console.error(`Error fetching component ${componentId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch component');
  }
};

// Upload machine component structure from Excel
export const uploadComponentStructure = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/machines/upload-structure`, formData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        // Don't set Content-Type here - it will be set automatically with the boundary
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading component structure:', error);
    throw new Error(error.response?.data?.message || 'Failed to upload component structure');
  }
};

// Fetch component hierarchy for a machine
export const fetchComponentHierarchy = async (machineId) => {
  try {
    const response = await axios.get(`${API_URL}/machines/hierarchy`, {
      params: { machine_id: machineId },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.hierarchy;
  } catch (error) {
    console.error(`Error fetching hierarchy for machine ${machineId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch component hierarchy');
  }
};
export const updateMachine = async (id, machineData) => {
  try {
    const response = await machineAPI.put(`/${id}`, machineData);
    return response.data;
  } catch (error) {
    console.error(`Error updating machine ${id}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to update machine');
  }
};