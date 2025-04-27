// services/api.js
// src/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://127.0.0.1:5000/api';

/**
 * User authentication
 */
export async function login(username, password) {
  try {
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

/**
 * Work order functions
 */
export async function fetchWorkOrders(token, type = 'daily', machineId = null) {
  try {
    // Build URL with query parameters
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
 * RCM Functions
 */
export async function fetchRCMFunctions(token, subsystemId) {
  try {
    const response = await fetch(`${API_URL}/rcm/functions?subsystem_id=${subsystemId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch RCM functions');
    }
    
    return data.functions;
  } catch (error) {
    console.error('Fetch RCM functions error:', error);
    throw error;
  }
}

export async function fetchRCMAnalysis(token, machineId) {
  try {
    if (machineId) {
      url += `?equipment_id=${machineId}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch RCM analysis');
    }
    
    return data.rcm_analysis;
  } catch (error) {
    console.error('Fetch RCM analysis error:', error);
    throw error;
  }
}

/**
 * Reporting functions
 */
export async function reportDeviation(token, reportData, images = []) {
  try {
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

/**
 * Work order functions
 */
export async function fetchWorkOrders(token, type = 'daily', machineId = null) {
  try {
    // Build URL with query parameters
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
 * RCM Functions
 */
export async function fetchRCMFunctions(token, subsystemId) {
  try {
    const response = await fetch(`${API_URL}/rcm/functions?subsystem_id=${subsystemId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch RCM functions');
    }
    
    return data.functions;
  } catch (error) {
    console.error('Fetch RCM functions error:', error);
    throw error;
  }
}

export async function fetchRCMAnalysis(token, machineId) {
  try {
    let url = `${API_URL}/rcm/analysis`;
   
/* testing new code
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://127.0.0.1:5000/api'; // Change this to your server address

export async function login(username, password) {
  try {
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

export async function fetchWorkOrders(token, type = 'daily') {
  try {
    // We'll assume you have an endpoint that can filter by type
    const response = await fetch(`${API_URL}/work-orders?type=${type}`, {
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

export async function completeWorkOrder(token, workOrderId, notes = "") {
  try {
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
*/ 