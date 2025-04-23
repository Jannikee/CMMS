import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create base axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to inject the auth token
api.interceptors.request.use(
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

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Handle 403 Forbidden errors
    if (error.response && error.response.status === 403) {
      console.error('Permission denied:', error.response.data.message || 'You do not have permission to perform this action');
    }
    
    // Handle other errors
    return Promise.reject(error);
  }
);

// Auth API

export const loginUser = async (username, password) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

export const logoutUser = () => {
  localStorage.removeItem('token');
};

// Work Orders API

export const fetchWorkOrders = async (filters = {}) => {
  try {
    const response = await api.get('/work-orders', { params: filters });
    return response.data.work_orders;
  } catch (error) {
    console.error('Failed to fetch work orders:', error);
    throw error;
  }
};

export const fetchWorkOrderById = async (id) => {
  try {
    const response = await api.get(`/work-orders/${id}`);
    return response.data.work_order;
  } catch (error) {
    console.error(`Failed to fetch work order ${id}:`, error);
    throw error;
  }
};

export const createWorkOrder = async (workOrderData) => {
  try {
    const response = await api.post('/work-orders', workOrderData);
    return response.data;
  } catch (error) {
    console.error('Failed to create work order:', error);
    throw error;
  }
};

export const updateWorkOrder = async (id, workOrderData) => {
  try {
    const response = await api.put(`/work-orders/${id}`, workOrderData);
    return response.data;
  } catch (error) {
    console.error(`Failed to update work order ${id}:`, error);
    throw error;
  }
};

export const updateWorkOrderStatus = async (id, status, notes = '') => {
  try {
    const response = await api.put(`/work-orders/${id}`, { status, notes });
    return response.data;
  } catch (error) {
    console.error(`Failed to update work order ${id} status:`, error);
    throw error;
  }
};

// Machines API

export const fetchMachines = async () => {
  try {
    const response = await api.get('/machines');
    return response.data.machines;
  } catch (error) {
    console.error('Failed to fetch machines:', error);
    throw error;
  }
};

export const fetchMachineById = async (id) => {
  try {
    const response = await api.get(`/machines/${id}`);
    return response.data.machine;
  } catch (error) {
    console.error(`Failed to fetch machine ${id}:`, error);
    throw error;
  }
};

export const createMachine = async (machineData) => {
  try {
    const response = await api.post('/machines', machineData);
    return response.data;
  } catch (error) {
    console.error('Failed to create machine:', error);
    throw error;
  }
};

export const fetchSubsystems = async (machineId) => {
  try {
    const response = await api.get(`/machines/${machineId}/subsystems`);
    return response.data.subsystems;
  } catch (error) {
    console.error(`Failed to fetch subsystems for machine ${machineId}:`, error);
    throw error;
  }
};

export const createSubsystem = async (machineId, subsystemData) => {
  try {
    const response = await api.post(`/machines/${machineId}/subsystems`, subsystemData);
    return response.data;
  } catch (error) {
    console.error(`Failed to create subsystem for machine ${machineId}:`, error);
    throw error;
  }
};

export const fetchComponents = async (subsystemId) => {
  try {
    const response = await api.get(`/machines/subsystems/${subsystemId}/components`);
    return response.data.components;
  } catch (error) {
    console.error(`Failed to fetch components for subsystem ${subsystemId}:`, error);
    throw error;
  }
};

export const createComponent = async (subsystemId, componentData) => {
  try {
    const response = await api.post(`/machines/subsystems/${subsystemId}/components`, componentData);
    return response.data;
  } catch (error) {
    console.error(`Failed to create component for subsystem ${subsystemId}:`, error);
    throw error;
  }
};

// Maintenance API

export const fetchMaintenanceLogs = async (filters = {}) => {
  try {
    const response = await api.get('/maintenance', { params: filters });
    return response.data.maintenance_logs;
  } catch (error) {
    console.error('Failed to fetch maintenance logs:', error);
    throw error;
  }
};

export const addMaintenanceLog = async (data, files = []) => {
  try {
    if (!files.length) {
      const response = await api.post('/maintenance', data);
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
    
    const response = await axios.post(`${API_URL}/maintenance`, formData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to add maintenance log:', error);
    throw error;
  }
};

// RCM API

export const fetchRCMAnalysis = async (equipmentId = null) => {
  try {
    let url = '/rcm/analysis';
    if (equipmentId) {
      url += `?equipment_id=${equipmentId}`;
    }
    
    const response = await api.get(url);
    return response.data.rcm_analysis;
  } catch (error) {
    console.error('Failed to fetch RCM analysis:', error);
    throw error;
  }
};

export const generateRCMWorkOrders = async (equipmentId) => {
  try {
    const response = await api.post('/rcm/generate-work-orders', {
      equipment_id: equipmentId
    });
    return response.data;
  } catch (error) {
    console.error('Failed to generate work orders from RCM:', error);
    throw error;
  }
};
/*
export const uploadRCMExcel = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/rcm/upload-excel`, formData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        // Don't set Content-Type, it will be set automatically
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to upload RCM Excel:', error);
    throw error;
  }
};
*/
// Reports API

export const fetchDashboardSummary = async (days = 30) => {
  try {
    const response = await api.get('/reports/dashboard-summary', {
      params: { days }
    });
    return response.data.dashboard_summary;
  } catch (error) {
    console.error('Failed to fetch dashboard summary:', error);
    throw error;
  }
};

export const fetchFailureRates = async (params = {}) => {
  try {
    const response = await api.get('/reports/failure-rates', { params });
    return response.data.failure_rates;
  } catch (error) {
    console.error('Failed to fetch failure rates:', error);
    throw error;
  }
};

export const fetchUptimeStats = async (params = {}) => {
  try {
    const response = await api.get('/reports/uptime', { params });
    return response.data.uptime_statistics;
  } catch (error) {
    console.error('Failed to fetch uptime statistics:', error);
    throw error;
  }
};

export const fetchMTBFMTTR = async (params = {}) => {
  try {
    const response = await api.get('/reports/mtbf-mttr', { params });
    return response.data.mtbf_mttr_statistics;
  } catch (error) {
    console.error('Failed to fetch MTBF/MTTR statistics:', error);
    throw error;
  }
};

export const exportToExcel = (type, params = {}) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }
  
  // Build query string
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.set(key, value);
    }
  });
  
  // Redirect to export endpoint
  const url = `${API_URL}/reports/export/${type}?${queryParams.toString()}`;
  window.location.href = url;
};

export default api;

export const uploadRCMExcel = async (formData) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/rcm/upload-excel`, {
        method: 'POST',
        headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type here - it will be set automatically with the boundary
        },
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
    }

    return await response.json();
};

export const tekniskPlasstrukturImport = async (formData) => {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/components/upload-structure`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type here - it will be set automatically with the boundary
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Upload failed');
    }
    
    return await response.json();
};
  
export const getComponentHierarchy = async (equipmentId) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/components/hierarchy?equipment_id=${equipmentId}`, {
        headers: {
        'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch component hierarchy');
    }

    return await response.json();
};  
/*
export const fetchRCMAnalysis = async (equipmentId = null) => {
    const token = localStorage.getItem('token');
    
    let url = `${API_URL}/rcm/analysis`;
    if (equipmentId) {
      url += `?equipment_id=${equipmentId}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch RCM analysis');
    }
    
    return await response.json();
};
*/

export const generateWorkOrders = async (equipmentId) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/rcm/generate-work-orders`, {
        method: 'POST',
        headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({ equipment_id: equipmentId })
    });

    if (!response.ok) {
        throw new Error('Failed to generate work orders');
    }

    return await response.json();
};
  
export const importRCMData = async (data) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/rcm/import`, {
        method: 'POST',
        headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error('Failed to import RCM data');
    }

    return await response.json();
};
