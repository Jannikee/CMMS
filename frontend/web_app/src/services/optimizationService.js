// frontend/web_app/src/services/optimizationService.js
// src/services/optimizationService.js

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with base URL
const optimizationAPI = axios.create({
  baseURL: `${API_URL}/optimization`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
optimizationAPI.interceptors.request.use(
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

// Component Analysis and Optimization
export const analyzeComponent = async (componentId, useKaplanMeier = false, lookBackDays = 180) => {
  try {
    const response = await optimizationAPI.post(`/analyze-component/${componentId}`, {
      use_kaplan_meier: useKaplanMeier,
      look_back_days: lookBackDays
    });
    return response.data;
  } catch (error) {
    console.error(`Error analyzing component ${componentId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to analyze component');
  }
};

export const applyOptimization = async (analysisId) => {
  try {
    const response = await optimizationAPI.post(`/apply-optimization/${analysisId}`);
    return response.data;
  } catch (error) {
    console.error(`Error applying optimization ${analysisId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to apply optimization');
  }
};

// Component Settings
export const getComponentSettings = async (componentId) => {
  try {
    const response = await optimizationAPI.get(`/settings/component/${componentId}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting settings for component ${componentId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to get component settings');
  }
};

export const updateComponentSettings = async (componentId, settings) => {
  try {
    const response = await optimizationAPI.post(`/settings/component/${componentId}`, settings);
    return response.data;
  } catch (error) {
    console.error(`Error updating settings for component ${componentId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to update component settings');
  }
};

// Interval Adjustment History
export const getAdjustmentHistory = async (componentId) => {
  try {
    const response = await optimizationAPI.get(`/adjustment-history/${componentId}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting adjustment history for component ${componentId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to get adjustment history');
  }
};

// Scheduler Management
export const getSchedulerStatus = async () => {
  try {
    const response = await optimizationAPI.get(`/scheduler-status`);
    return response.data;
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    throw new Error(error.response?.data?.message || 'Failed to get scheduler status');
  }
};

export const startScheduler = async () => {
  try {
    const response = await optimizationAPI.post(`/scheduler/start`);
    return response.data;
  } catch (error) {
    console.error('Error starting scheduler:', error);
    throw new Error(error.response?.data?.message || 'Failed to start scheduler');
  }
};

export const stopScheduler = async () => {
  try {
    const response = await optimizationAPI.post(`/scheduler/stop`);
    return response.data;
  } catch (error) {
    console.error('Error stopping scheduler:', error);
    throw new Error(error.response?.data?.message || 'Failed to stop scheduler');
  }
};

export const setAnalysisMethod = async (method) => {
  try {
    const response = await optimizationAPI.post(`/scheduler/set-analysis-method`, { method });
    return response.data;
  } catch (error) {
    console.error('Error setting analysis method:', error);
    throw new Error(error.response?.data?.message || 'Failed to set analysis method');
  }
};

// Manual Operations
export const runScheduledOptimizations = async () => {
  try {
    const response = await optimizationAPI.post(`/run-scheduled-optimizations`);
    return response.data;
  } catch (error) {
    console.error('Error running scheduled optimizations:', error);
    throw new Error(error.response?.data?.message || 'Failed to run scheduled optimizations');
  }
};

export const generateUpdatedWorkOrders = async () => {
  try {
    const response = await optimizationAPI.post(`/generate-updated-work-orders`);
    return response.data;
  } catch (error) {
    console.error('Error generating updated work orders:', error);
    throw new Error(error.response?.data?.message || 'Failed to generate updated work orders');
  }
};

// Effectiveness Analysis
export const validateOptimizationEffectiveness = async (days = 90) => {
  try {
    const response = await optimizationAPI.get(`/validate-optimization-effectiveness`, {
      params: { days }
    });
    return response.data;
  } catch (error) {
    console.error('Error validating optimization effectiveness:', error);
    throw new Error(error.response?.data?.message || 'Failed to validate optimization effectiveness');
  }
};

export default {
  analyzeComponent,
  applyOptimization,
  getComponentSettings,
  updateComponentSettings,
  getAdjustmentHistory,
  getSchedulerStatus,
  startScheduler,
  stopScheduler,
  setAnalysisMethod,
  runScheduledOptimizations,
  generateUpdatedWorkOrders,
  validateOptimizationEffectiveness
};