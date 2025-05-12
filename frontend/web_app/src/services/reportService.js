import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';

// Create axios instance with base URL
const reportAPI = axios.create({
  baseURL: `${API_URL}/reports`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
reportAPI.interceptors.request.use(
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

// Fetch dashboard summary
export const fetchDashboardSummary = async (days = 30) => {
  try {
    const response = await reportAPI.get('/dashboard-summary', {
      params: { days }
    });
    return response.data.dashboard_summary;
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch dashboard summary');
  }
};

// Fetch failure rates
export const fetchFailureRates = async (params = {}) => {
  try {
    const response = await reportAPI.get('/failure-rates', { params });
    return response.data.failure_rates;
  } catch (error) {
    console.error('Error fetching failure rates:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch failure rates');
  }
};

// Fetch uptime statistics
export const fetchUptimeStats = async (params = {}) => {
  try {
    const response = await reportAPI.get('/uptime', { params });
    return response.data.uptime_statistics;
  } catch (error) {
    console.error('Error fetching uptime statistics:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch uptime statistics');
  }
};

// Fetch MTBF and MTTR statistics
export const fetchMTBFMTTR = async (params = {}) => {
  try {
    const response = await reportAPI.get('/mtbf-mttr', { params });
    return response.data.mtbf_mttr_statistics;
  } catch (error) {
    console.error('Error fetching MTBF/MTTR statistics:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch MTBF/MTTR statistics');
  }
};

// Fetch work order statistics
export const fetchWorkOrderStats = async (params = {}) => {
  try {
    const response = await reportAPI.get('/work-orders', { params });
    return response.data.work_order_statistics;
  } catch (error) {
    console.error('Error fetching work order statistics:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch work order statistics');
  }
};

// Generate PDF report
export const generatePDFReport = async (reportData) => {
  try {
    const response = await reportAPI.post('/generate-pdf', reportData, {
      responseType: 'blob',
    });
    
    // Create a URL for the blob
    const url = window.URL.createObjectURL(new Blob([response.data]));
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report-${new Date().toISOString().slice(0,10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw new Error('Failed to generate PDF report');
  }
};

// Export data to Excel
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