// web_app/src/components/ExportControls.js
import React from 'react';
import { Button, Form, DatePicker, Select } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Option } = Select;

const ExportControls = ({ machines }) => {
  const [form] = Form.useForm();
  
  const handleExport = (type) => {
    const values = form.getFieldsValue();
    const machineId = values.machineId;
    
    let startDate = '';
    let endDate = '';
    
    if (values.dateRange && values.dateRange.length === 2) {
      startDate = values.dateRange[0].format('YYYY-MM-DD');
      endDate = values.dateRange[1].format('YYYY-MM-DD');
    }
    
    // Construct URL with query parameters
    let url = `/api/reports/export/${type}?`;
    if (machineId) url += `machine_id=${machineId}&`;
    if (startDate) url += `start_date=${startDate}&`;
    if (endDate) url += `end_date=${endDate}`;
    
    // Trigger download
    window.location.href = url;
  };
  
  return (
    <div className="export-controls">
      <h3>Export Data</h3>
      <Form form={form} layout="inline">
        <Form.Item name="machineId" label="Machine">
          <Select 
            placeholder="All machines" 
            allowClear 
            style={{ width: 200 }}
          >
            {machines.map(machine => (
              <Option key={machine.id} value={machine.id}>{machine.name}</Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item name="dateRange" label="Date Range">
          <RangePicker />
        </Form.Item>
        
        <Form.Item>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={() => handleExport('work-orders')}
          >
            Export Work Orders
          </Button>
        </Form.Item>
        
        <Form.Item>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={() => handleExport('maintenance-logs')}
          >
            Export Maintenance Logs
          </Button>
        </Form.Item>
        
        <Form.Item>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={() => handleExport('statistics')}
          >
            Export Statistics
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ExportControls;