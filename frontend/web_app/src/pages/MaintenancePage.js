// src/pages/MaintenancePage.js
import React from 'react';
import { Typography, Card, Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

const MaintenancePage = () => {
  return (
    <div className="maintenance-container">
      <div className="page-header">
        <Title level={2}>Maintenance</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          Add Maintenance Log
        </Button>
      </div>
      
      <Card>
        <Empty 
          description="Maintenance logs will be displayed here" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary">Add First Log</Button>
        </Empty>
      </Card>
    </div>
  );
};

export default MaintenancePage;