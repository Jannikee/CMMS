// frontend/web_app/src/components/RCM/ImportExcelRCM.js
import React, { useState, useEffect } from 'react';
import { Upload, Button, Form, Select, message, Spin } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ImportExcelRCM = ({ onUploadSuccess }) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch machines on component mount
  useEffect(() => {
    fetchMachines();
  }, []);
  
  const fetchMachines = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/machines`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const machinesData = response.data.machines || [];
      setMachines(machinesData);
      console.log("Machines loaded for RCM import:", machinesData);
    } catch (error) {
      console.error("Error fetching machines for RCM import:", error);
      message.error('Failed to load equipment list');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpload = async () => {
    try {
      const values = await form.validateFields();
      const formData = new FormData();
      
      if (!fileList[0]) {
        message.error('Please select an Excel file to upload');
        return;
      }
      
      formData.append('file', fileList[0]);
      formData.append('equipment_id', values.equipment_id);
      
      setUploading(true);
      
      // Direct fetch for better error handling
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/rcm/upload-excel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Content-Type is handled automatically for FormData
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      const result = await response.json();
      
      message.success(`File uploaded successfully! Imported: ${result.imported.functions || 0} functions, ${result.imported.failures || 0} failures, ${result.imported.modes || 0} failure modes`);
      
      // Reset form and file list
      form.resetFields();
      setFileList([]);
      
      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
    } catch (error) {
      console.error("Upload error:", error);
      message.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };
  
  const uploadProps = {
    beforeUpload: file => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                       file.type === 'application/vnd.ms-excel';
      
      if (!isExcel) {
        message.error('You can only upload Excel files!');
        return Upload.LIST_IGNORE;
      }
      
      setFileList([file]);
      return false;  // Prevent automatic upload
    },
    fileList,
    onRemove: () => {
      setFileList([]);
    },
  };
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '30px' }}>
        <Spin size="large" />
        <p>Loading equipment list...</p>
      </div>
    );
  }
  
  return (
    <div className="rcm-upload-container">
      <h3>Import RCM Analysis from Excel</h3>
      
      <Form form={form} layout="vertical">
        <Form.Item
          name="equipment_id"
          label="Select Equipment"
          rules={[{ required: true, message: 'Please select equipment' }]}
        >
          <Select placeholder="Select equipment" loading={loading}>
            {machines.map(machine => (
              <Option key={machine.id} value={machine.id}>
                {machine.name} ({machine.technical_id || 'No ID'})
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        <Upload {...uploadProps} maxCount={1}>
          <Button icon={<UploadOutlined />}>Select Excel File</Button>
        </Upload>
        
        <Button
          type="primary"
          onClick={handleUpload}
          disabled={fileList.length === 0}
          loading={uploading}
          style={{ marginTop: 16 }}
        >
          {uploading ? 'Uploading' : 'Start Upload'}
        </Button>
      </Form>
      
      <div className="upload-note" style={{ marginTop: 16 }}>
        <p>
          <strong>Note:</strong> The Excel file should contain columns for:
          Funksjon, Funksjonsfeil, Sviktmode, Effekt, and optionally
          Konsekvens, Tiltak, Intervall_dager, Intervall_timer.
        </p>
      </div>
      
      {machines.length === 0 && !loading && (
        <div style={{ marginTop: 16, color: '#ff4d4f' }}>
          <p>No equipment found in the system. Please add equipment before importing RCM data.</p>
        </div>
      )}
    </div>
  );
};

export default ImportExcelRCM;