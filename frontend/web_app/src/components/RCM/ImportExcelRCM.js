// frontend/web_app/src/components/RCM/ImportExcelRCM.js - Updated for Norwegian RCM format
import React, { useState, useEffect } from 'react';
import { Upload, Button, Form, Select, message, Alert, Spin, Radio, Space } from 'antd';
import { UploadOutlined, InfoCircleOutlined, FileExcelOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchMachines } from '../../services/machineService';
import { uploadRCMExcel } from '../../services/rcmService';

const { Option } = Select;

const ImportExcelRCM = ({ onUploadSuccess }) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetMode, setSheetMode] = useState('auto');
  
  // Fetch machines on component mount
  useEffect(() => {
    loadMachines();
  }, []);
  
  const loadMachines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the machineService to fetch machines
      const machinesData = await fetchMachines();
      console.log("Machines loaded for RCM import:", machinesData);
      
      if (Array.isArray(machinesData) && machinesData.length > 0) {
        setMachines(machinesData);
        // Pre-select the first machine
        form.setFieldsValue({ equipment_id: machinesData[0].id });
      } else {
        setError("No equipment found in the system");
        console.warn("No machines found or empty array returned");
      }
    } catch (err) {
      console.error("Error fetching machines for RCM import:", err);
      setError("Failed to load equipment list: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpload = async () => {
    try {
      const values = await form.validateFields();
      
      if (!fileList[0]) {
        message.error('Please select an Excel file to upload');
        return;
      }
      
      const formData = new FormData();
      formData.append('file', fileList[0]);
      formData.append('equipment_id', values.equipment_id);
      
      // Add the sheet search mode to help the backend find the right sheet
      formData.append('sheet_mode', sheetMode);
      
      setUploading(true);
      message.loading('Uploading file and searching for RCM data...');
      
      // Use the rcmService to upload the Excel file
      const result = await uploadRCMExcel(formData);
      
      message.success(`File uploaded successfully! Found data in sheet: "${result.sheet_name || 'Default'}". Imported ${result.imported.functions || 0} functions, ${result.imported.failures || 0} failures, ${result.imported.modes || 0} failure modes`);
      
      // Reset form and file list
      form.resetFields();
      setFileList([]);
      
      // Pre-select the equipment again
      if (machines.length > 0) {
        form.setFieldsValue({ equipment_id: machines[0].id });
      }
      
      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
    } catch (err) {
      console.error("Upload error:", err);
      message.error(`Upload failed: ${err.message || "Unknown error"}`);
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
  
  const handleRefresh = async () => {
    message.info("Refreshing equipment list...");
    await loadMachines();
  };
  
  const handleSheetModeChange = e => {
    setSheetMode(e.target.value);
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
      
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" onClick={handleRefresh}>
              Retry
            </Button>
          }
        />
      )}
      
      <Form form={form} layout="vertical">
        <Form.Item
          name="equipment_id"
          label="Select Equipment"
          rules={[{ required: true, message: 'Please select equipment' }]}
          tooltip="Choose the equipment for which this RCM analysis applies"
        >
          <Select 
            placeholder="Select equipment" 
            disabled={machines.length === 0 || loading}
            loading={loading}
          >
            {machines.map(machine => (
              <Option key={machine.id} value={machine.id}>
                {machine.name} ({machine.technical_id || 'No ID'})
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item
          label="Excel Sheet Selection"
          tooltip="Choose how to find the RCM data sheet in your Excel file"
        >
          <Radio.Group onChange={handleSheetModeChange} value={sheetMode}>
            <Space direction="vertical">
              <Radio value="auto">
                <Space>
                  <SearchOutlined />
                  <span>Auto-detect sheet containing 'RCM' or 'Analyse'</span>
                </Space>
              </Radio>
              <Radio value="first">
                <Space>
                  <FileExcelOutlined />
                  <span>Use first sheet</span>
                </Space>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>
        
        <Upload {...uploadProps} maxCount={1}>
          <Button 
            icon={<UploadOutlined />}
            disabled={machines.length === 0}
          >
            Select Excel File
          </Button>
        </Upload>
        
        <Button
          type="primary"
          onClick={handleUpload}
          disabled={fileList.length === 0 || machines.length === 0}
          loading={uploading}
          style={{ marginTop: 16 }}
        >
          {uploading ? 'Uploading' : 'Start Upload'}
        </Button>
        
        {machines.length === 0 && !loading && (
          <Button 
            type="primary" 
            style={{ marginLeft: 8, marginTop: 16 }} 
            onClick={handleRefresh}
          >
            Refresh Equipment List
          </Button>
        )}
      </Form>
      
      <div className="upload-note" style={{ marginTop: 16 }}>
        <Alert
          message="File Format Requirements"
          description={
            <div>
              <p>The Excel file should follow the format from your example with headers on second row:</p>
              <ul>
                <li><strong>Column 1 (Enhet)</strong> - Unit name</li>
                <li><strong>Column 2 (Funksjon)</strong> - Function description (Required)</li>
                <li><strong>Column 3 (Funksjonsfeil)</strong> - Functional Failure (Required)</li>
                <li><strong>Column 4 (Sviktmode)</strong> - Failure Mode (Required)</li>
                <li><strong>Column 5 (Effekt)</strong> - Effect or Consequence (Required)</li>
                <li><strong>Column 7 (Tiltak og intervall)</strong> - Actions and intervals</li>
                <li><strong>Column 8 (Svikthåndteringsstrategi)</strong> - Maintenance Strategy</li>
              </ul>
              <p>
                <InfoCircleOutlined /> <strong>Important:</strong> The system is updated to handle files with column headers 
                on the second row (like in your example). If you have column numbers instead of text headers (1, 2, 3, 4, 5, 7, 8),
                the system will still work correctly.
              </p>
              <p>
                <InfoCircleOutlined /> <strong>Sheet detection:</strong> In Auto mode, the system will search for a sheet with a name containing "RCM" or "Analyse". 
                If no such sheet is found, it will use the first sheet.
              </p>
            </div>
          }
          type="info"
          showIcon
        />
      </div>
    </div>
  );
};

export default ImportExcelRCM;