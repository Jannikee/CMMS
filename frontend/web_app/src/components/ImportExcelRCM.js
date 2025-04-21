// frontend/web_app/src/components/ImportExcelRCM.js
import React, { useState } from 'react';
import { Upload, Button, Form, Select, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { uploadRCMExcel } from '../services/api';

const ImportExcelRCM = ({ machines, onUploadSuccess }) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  
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
      
      const result = await uploadRCMExcel(formData);
      
      message.success(`File uploaded successfully! Imported: ${result.imported.functions} functions, ${result.imported.failures} failures, ${result.imported.modes} failure modes`);
      
      // Reset form and file list
      form.resetFields();
      setFileList([]);
      
      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
    } catch (error) {
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
  
  return (
    <div className="rcm-upload-container">
      <h3>Import RCM Analysis from Excel</h3>
      
      <Form form={form} layout="vertical">
        <Form.Item
          name="equipment_id"
          label="Select Equipment"
          rules={[{ required: true, message: 'Please select equipment' }]}
        >
          <Select placeholder="Select equipment">
            {machines.map(machine => (
              <Select.Option key={machine.id} value={machine.id}>
                {machine.name}
              </Select.Option>
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
    </div>
  );
};

export default ImportExcelRCM;
