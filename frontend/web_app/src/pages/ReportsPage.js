import React, { useState, useEffect } from 'react';
import { Typography, Card, Tabs, Select, DatePicker, Button, Space, Empty } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, BarChartOutlined } from '@ant-design/icons';
import ExportControls from '../components/Reports/ExportControls';

const { Title } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ReportsPage = () => {
  const [machines, setMachines] = useState([]);
  
  // This would normally fetch machines from the API
  useEffect(() => {
    // Placeholder for API call
    setMachines([]);
  }, []);

  return (
    <div className="reports-container">
      <div className="page-header">
        <Title level={2}>Reports & Analytics</Title>
      </div>
      
      <Tabs defaultActiveKey="dashboard">
        <TabPane 
          tab={<span><BarChartOutlined /> Dashboard</span>}
          key="dashboard"
        >
          <Card className="report-filter-card">
            <Space direction="horizontal">
              <Select placeholder="Select Machine" style={{ width: 200 }} allowClear>
                {machines.map(machine => (
                  <Option key={machine?.id} value={machine?.id}>{machine?.name}</Option>
                ))}
              </Select>
              <RangePicker />
              <Button type="primary">Apply</Button>
            </Space>
          </Card>
          
          <div className="report-content">
            <Empty description="Select filters to generate reports" />
          </div>
        </TabPane>
        
        <TabPane 
          tab={<span><FileExcelOutlined /> Export Data</span>}
          key="export"
        >
          <Card>
            <ExportControls machines={machines} />
          </Card>
        </TabPane>
        
        <TabPane 
          tab={<span><FilePdfOutlined /> PDF Reports</span>}
          key="pdf"
        >
          <Card>
            <Empty description="PDF report generation will be implemented here" />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ReportsPage;