// frontend/web_app/src/components/ImportExcelTP.js TP= teknisk plasstruktur
import React, { useState } from 'react';
import { Upload, Button, Form, Radio, message, Select } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { uploadComponentStructure } from '../../services/machineService';


// Modified ImportExcelTP component that can import entire machine park
const ImportExcelTP = ({ machines, onUploadSuccess }) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [importMode, setImportMode] = useState('park');
  
  const handleModeChange = (e) => {
    setImportMode(e.target.value);
  };
  
  const handleUpload = async () => {
    try {
      // For equipment-specific import, validate equipment selection
      if (importMode === 'equipment') {
        const values = await form.validateFields();
        if (!values.equipment_id) {
          message.error('Please select equipment');
          return;
        }
      }
      
      // For park-wide import, no equipment selection needed
      if (!fileList[0]) {
        message.error('Please select an Excel file to upload');
        return;
      }
      
      const formData = new FormData();
      formData.append('file', fileList[0]);
      
      // Only append equipment_id if in equipment-specific mode
      if (importMode === 'equipment') {
        const values = await form.validateFields();
        formData.append('equipment_id', values.equipment_id);
      }
      
      // Add import mode to the request
      formData.append('import_mode', importMode);
      
      setUploading(true);
      
      // Call the API (we'll modify this endpoint in the backend)
      const result = await uploadComponentStructure(formData);
      
      // Show success message with import statistics
      let successMessage = '';
      if (importMode === 'park') {
        successMessage = `Successfully imported entire machine park! Added ${result.imported.machines_added || 0} machines, ${result.imported.subsystems_added || 0} subsystems, and ${result.imported.components_added || 0} components.`;
      } else {
        successMessage = `File uploaded successfully! Imported ${result.imported.components_added || 0} components.`;
      }
      
      message.success(successMessage);
      
        // Reset form and file list
        form.resetFields();
        setFileList([]);
        
        // Notify parent component
        if (onUploadSuccess) {
          onUploadSuccess();
        }
        
      } catch (error) {
        console.error('Upload error:', error);
        console.error('Response data:', error.response?.data);
        message.error(`Upload failed: ${error.response?.data?.message || error.message}`);
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
    <div className="component-upload-container">
      <h3>Import Technical Structure</h3>
      
      <Form form={form} layout="vertical">
        <Form.Item label="Import Mode">
          <Radio.Group value={importMode} onChange={handleModeChange}>
            <Radio.Button value="park">Entire Machine Park</Radio.Button>
            <Radio.Button value="equipment">Specific Equipment</Radio.Button>
          </Radio.Group>
        </Form.Item>
        
        {importMode === 'equipment' && (
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
        )}
        
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
          Arbeidsstasjonsnummer, Benevnelse, Teknisk navn, and Beskrivelse.
          {importMode === 'park' ? (
            <span> When importing an entire machine park, the system will automatically create equipment, subsystems, and components based on the work station numbers.</span>
          ) : (
            <span> The structure will be determined based on the work station numbers.</span>
          )}
        </p>
      </div>
    </div>
  );
};

export default ImportExcelTP;