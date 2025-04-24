// src/pages/RCMPage.js
import React, { useState, useEffect } from 'react';
import { Typography, Card, Tabs, Empty, Button, Spin } from 'antd';
import { UploadOutlined, BarChartOutlined } from '@ant-design/icons';
import RCMTable from '../components/RCM/RCMTable';
import ImportExcelRCM from '../components/RCM/ImportExcelRCM';

const { Title } = Typography;
const { TabPane } = Tabs;

const RCMPage = () => {
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);

  // This would normally fetch machines from the API
  useEffect(() => {
    // Placeholder for API call
    setMachines([]);
    setLoading(false);
  }, []);

  return (
    <div className="rcm-container">
      <div className="page-header">
        <Title level={2}>RCM Analysis</Title>
        <Button type="primary" icon={<UploadOutlined />}>
          Import RCM Data
        </Button>
      </div>
      
      <Tabs defaultActiveKey="analysis">
        <TabPane 
          tab={<span><BarChartOutlined /> RCM Analysis</span>}
          key="analysis"
        >
          {loading ? (
            <div className="loading-container">
              <Spin size="large" />
            </div>
          ) : (
            <Card>
              {selectedMachine ? (
                <RCMTable equipmentId={selectedMachine} />
              ) : (
                <Empty description="Select a machine to view RCM analysis" />
              )}
            </Card>
          )}
        </TabPane>
        <TabPane 
          tab={<span><UploadOutlined /> Import Data</span>}
          key="import"
        >
          <Card>
            <ImportExcelRCM machines={machines} onUploadSuccess={() => {}} />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default RCMPage;