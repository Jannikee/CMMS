// services/api.js
// frontend/mobile_app/src/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  mockLogin,
  getMockWorkOrders,
  getMockWorkOrderById,
  getMockMachineById,
  updateMockMachineHours,
  updateMockWorkOrderStatus,
  getMockSubsystemsForMachine
} from './mockDataService';

const API_URL = 'http://192.168.10.116:5000/api';

/**
 * Check if test mode is enabled
 */
const isTestModeEnabled = async () => {
  try {
    const testMode = await AsyncStorage.getItem('testMode');
    return testMode === 'true';
  } catch (error) {
    console.error('Error checking test mode:', error);
    return false;
  }
};
//test login
export async function login(username, password) {
  try {
    // Check if we're in test mode
    const testMode = await isTestModeEnabled();
    
    if (testMode) {
      // Use mock login for testing
      const mockResponse = mockLogin(username, password);
      
      // Store the mock token
      await AsyncStorage.setItem('userToken', mockResponse.access_token);
      await AsyncStorage.setItem('testUser', JSON.stringify({
        username: mockResponse.username,
        role: mockResponse.role
      }));
      
      return mockResponse;
    }
    
    // Real API call for non-test mode
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Store the token
    await AsyncStorage.setItem('userToken', data.access_token);
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
/* test login
// User authentication
export async function login(username, password) {
  try {
    // We'll still use the real API for login even in test mode
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Store the token
    await AsyncStorage.setItem('userToken', data.access_token);
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
*/
/**
 * Work order functions
 */
export async function fetchWorkOrders(token, type = 'daily', machineId = null) {
  try {
    // Check if we're in test mode
    const testMode = await isTestModeEnabled();
    
    if (testMode) {
      // Return mock data
      return getMockWorkOrders(type, machineId);
    }
    
    // Real API call
    let url = `${API_URL}/work-orders?type=${type}`;
    if (machineId) {
      url += `&machine_id=${machineId}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch work orders');
    }
    
    return data.work_orders;
  } catch (error) {
    console.error('Fetch work orders error:', error);
    throw error;
  }
}

export async function fetchWorkOrderDetail(token, workOrderId) {
  try {
    // Check if we're in test mode
    const testMode = await isTestModeEnabled();
    
    if (testMode) {
      // Return mock data
      return getMockWorkOrderById(workOrderId);
    }
    
    // Real API call
    const response = await fetch(`${API_URL}/work-orders/${workOrderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch work order details');
    }
    
    return data.work_order;
  } catch (error) {
    console.error('Fetch work order detail error:', error);
    throw error;
  }
}

export async function completeWorkOrder(token, workOrderId, notes = "") {
  try {
    // Check if we're in test mode
    const testMode = await isTestModeEnabled();
    
    if (testMode) {
      // Update mock data
      return updateMockWorkOrderStatus(workOrderId, 'completed');
    }
    
    // Real API call
    const response = await fetch(`${API_URL}/work-orders/${workOrderId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'completed',
        notes: notes,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update work order');
    }
    
    return data;
  } catch (error) {
    console.error('Complete work order error:', error);
    throw error;
  }
}

/**
 * Machine functions
 */
export async function fetchMachine(token, machineId) {
  try {
    // Check if we're in test mode
    const testMode = await isTestModeEnabled();
    
    if (testMode) {
      // Return mock data
      return getMockMachineById(machineId);
    }
    
    // Real API call
    const response = await fetch(`${API_URL}/machines/${machineId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch machine details');
    }
    
    return data.machine;
  } catch (error) {
    console.error('Fetch machine error:', error);
    throw error;
  }
}

export async function updateMachineHours(token, machineId, hours) {
  try {
    // Check if we're in test mode
    const testMode = await isTestModeEnabled();
    
    if (testMode) {
      // Update mock data
      return updateMockMachineHours(machineId, hours);
    }
    
    // Real API call
    const response = await fetch(`${API_URL}/machines/${machineId}/hours`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hour_counter: hours,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update machine hours');
    }
    
    return data;
  } catch (error) {
    console.error('Update machine hours error:', error);
    throw error;
  }
}

export async function fetchSubsystems(token, machineId) {
  try {
    // Check if we're in test mode
    const testMode = await isTestModeEnabled();
    
    if (testMode) {
      // Return mock data
      return getMockSubsystemsForMachine(machineId);
    }
    
    // Real API call
    const response = await fetch(`${API_URL}/machines/${machineId}/subsystems`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch subsystems');
    }
    
    return data.subsystems;
  } catch (error) {
    console.error('Fetch subsystems error:', error);
    throw error;
  }
}

/**
 * Reporting functions
 */
export async function reportDeviation(token, reportData, images = []) {
  try {
    // Check if we're in test mode
    const testMode = await isTestModeEnabled();
    
    if (testMode) {
      // Just return a successful response in test mode
      return { success: true, message: "Deviation reported successfully (Test Mode)" };
    }
    
    // Real API call
    // If no images, use JSON content type
    if (images.length === 0) {
      const response = await fetch(`${API_URL}/maintenance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...reportData,
          has_deviation: true,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to report deviation');
      }
      
      return data;
    } else {
      // If images are included, use FormData
      const formData = new FormData();
      
      // Add all data fields to the form data
      Object.keys(reportData).forEach(key => {
        if (typeof reportData[key] === 'object' && reportData[key] !== null && !(reportData[key] instanceof File)) {
          // Handle nested objects
          formData.append(key, JSON.stringify(reportData[key]));
        } else {
          formData.append(key, reportData[key]);
        }
      });
      
      // Ensure has_deviation is set
      formData.append('has_deviation', 'true');
      
      // Add images to the form data
      images.forEach((image, index) => {
        formData.append('images', {
          uri: image.uri,
          type: 'image/jpeg',
          name: `image_${index}.jpg`,
        });
      });
      
      const response = await fetch(`${API_URL}/maintenance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to report deviation');
      }
      
      return data;
    }
  } catch (error) {
    console.error('Report deviation error:', error);
    throw error;
  }
}

/**
 * QR Code functions
 */
export async function scanQRCode(token, qrData) {
  try {
    // Test mode will still use real API for QR scanning, as it's not critical for testing
    const response = await fetch(`${API_URL}/machines/qrcode/${qrData}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Invalid QR code');
    }
    
    return data.machine;
  } catch (error) {
    console.error('Scan QR code error:', error);
    throw error;
  }
}
