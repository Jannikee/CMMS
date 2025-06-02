// services/api.js
// frontend/mobile_app/src/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.10.116:5000/api';

// User authentication
export async function login(username, password) {
  try {
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

/**
 * Work order functions
 */
export async function fetchWorkOrders(token, type = 'daily', machineId = null) {
  try {
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
 * RCM Functions
 */
export async function fetchRCMFunctions(token, subsystemId) {
  try {
    // First, let's get the subsystem details to understand its structure
    const subsystemResponse = await fetch(`${API_URL}/machines/subsystems/${subsystemId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const subsystemData = await subsystemResponse.json();
    
    if (!subsystemResponse.ok) {
      throw new Error('Failed to fetch subsystem details');
    }
    
    const subsystem = subsystemData.subsystem;
    const machineId = subsystem.machine_id;
    const technicalId = subsystem.technical_id;
    
    // Now get the complete RCM analysis
    const response = await fetch(`${API_URL}/rcm/analysis?equipment_id=${machineId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch RCM analysis');
    }
    
    // Process the RCM data to find relevant functions
    // First, look for any RCM unit that matches or contains our subsystem's technical ID
    const relevantFunctions = [];
    
    if (data.rcm_analysis && Array.isArray(data.rcm_analysis)) {
      // Look for matching units based on technical ID patterns
      data.rcm_analysis.forEach(unit => {
        // Check if this unit corresponds to our subsystem or is related to it
        const isRelevantUnit = 
          // Direct match on technical ID
          (unit.technical_id === technicalId) || 
          // Or unit is part of the same hierarchical path (based on technical ID prefix)
          (technicalId.startsWith(unit.technical_id)) ||
          // Or unit might be a child of this subsystem
          (unit.technical_id && unit.technical_id.startsWith(technicalId));
        
        if (isRelevantUnit && unit.functions && Array.isArray(unit.functions)) {
          unit.functions.forEach(func => {
            // Add the function with its unit context
            relevantFunctions.push({
              ...func,
              unit_id: unit.id,
              unit_name: unit.name
            });
          });
        }
      });
    }
    
    // If we didn't find any relevant functions, return all functions as a fallback
    if (relevantFunctions.length === 0 && data.rcm_analysis) {
      data.rcm_analysis.forEach(unit => {
        if (unit.functions && Array.isArray(unit.functions)) {
          unit.functions.forEach(func => {
            relevantFunctions.push({
              ...func,
              unit_id: unit.id,
              unit_name: unit.name
            });
          });
        }
      });
    }
    
    return relevantFunctions;
  } catch (error) {
    console.error('Fetch RCM functions error:', error);
    throw error;
  }
}

export async function fetchComponents(token, subsystemId) {
  try {
    const response = await fetch(`${API_URL}/machines/subsystems/${subsystemId}/components`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch components');
    }
    
    return data.components;
  } catch (error) {
    console.error('Fetch components error:', error);
    throw error;
  }
}

export async function fetchRCMAnalysis(token, machineId) {
  try {
    let url = `${API_URL}/rcm/analysis`;
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

// Added function to find the right RCM unit for a given technical ID
export async function findRCMUnitForTechnicalId(token, technicalId) {
  try {
    // Get the complete RCM analysis
    const rcmAnalysis = await fetchRCMAnalysis(token);
    
    if (!rcmAnalysis || !Array.isArray(rcmAnalysis)) {
      throw new Error('Invalid RCM analysis data');
    }
    
    // Try to find a unit with matching or related technical ID
    const matchingUnit = rcmAnalysis.find(unit => 
      unit.technical_id === technicalId || 
      (unit.technical_id && technicalId.startsWith(unit.technical_id)) ||
      (unit.technical_id && unit.technical_id.startsWith(technicalId))
    );
    
    if (matchingUnit) {
      return matchingUnit;
    }
    
    // If no direct match found, try to determine the level from technical ID pattern
    const parts = technicalId.split('.');
    
    if (parts.length === 1) {
      // Machine level - try to find a unit for this machine
      return rcmAnalysis.find(unit => unit.equipment_id === parseInt(technicalId));
    } else if (parts.length === 2) {
      // Subsystem level - try to find a unit that could contain this subsystem
      const machineId = parts[0];
      const possibleUnits = rcmAnalysis.filter(unit => 
        unit.equipment_id === parseInt(machineId) || 
        (unit.technical_id && unit.technical_id.startsWith(machineId))
      );
      return possibleUnits[0] || null;
    } 
    
    // If still not found, return the first unit as a fallback
    return rcmAnalysis[0] || null;
  } catch (error) {
    console.error('Error finding RCM unit:', error);
    return null;
  }
}

export async function fetchRecentMaintenanceLogs(token, limit = 5, machineId = null) {
  try {
    let url = `${API_URL}/maintenance?limit=${limit}`;
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
      throw new Error(data.message || 'Failed to fetch maintenance logs');
    }
    
    return data.maintenance_logs;
  } catch (error) {
    console.error('Fetch maintenance logs error:', error);
    throw error;
  }
}

/**
 * Reporting functions
 */
export async function reportDeviation(token, reportData, images = []) {
  try {
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