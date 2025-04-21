
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
