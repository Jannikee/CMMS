import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Descriptions, 
  Button, 
  Table, 
  Spin, 
  Empty, 
  Typography, 
  Space,
  message 
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { fetchSubsystemById } from '../../services/machineService';

const { Title, Text } = Typography;

const SubsystemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subsystem, setSubsystem] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadSubsystem = async () => {
      try {
        setLoading(true);
        console.log(`Fetching subsystem ${id}...`);
        const data = await fetchSubsystemById(id);
        console.log("Subsystem data:", data);
        setSubsystem(data.subsystem);
      } catch (error) {
        console.error(`Error fetching subsystem ${id}:`, error);
        message.error('Failed to load subsystem details');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      loadSubsystem();
    }
  }, [id]);
  
  // Handle back button click
  const handleBack = () => {
    navigate(`/machines/${subsystem?.machine_id || ''}`);
  };
  
  // Component columns for table
  const componentColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Technical ID',
      dataIndex: 'technical_id',
      key: 'technical_id',
    },
    {
      title: 'Function',
      dataIndex: 'function',
      key: 'function',
      ellipsis: true,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/machines/component/${record.id}`)}
        >
          View Details
        </Button>
      ),
    },
  ];
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Spin size="large" />
      </div>
    );
  }
  
  if (!subsystem) {
    return (
      <Empty
        description="Subsystem not found"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button type="primary" onClick={() => navigate('/machines')}>
          Back to Equipment
        </Button>
      </Empty>
    );
  }
  
  return (
    <div className="subsystem-detail-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <Title level={3}>{subsystem.name}</Title>
            <Text type="secondary">Technical ID: {subsystem.technical_id}</Text>
          </div>
          
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
            >
              Back
            </Button>
            
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => navigate(`/machines/subsystem/${subsystem.id}/add-component`)}
            >
              Add Component
            </Button>
            
            <Button 
              icon={<EditOutlined />} 
              onClick={() => navigate(`/machines/subsystem/${subsystem.id}/edit`)}
            >
              Edit
            </Button>
          </Space>
        </div>
        
        <Descriptions title="Subsystem Details" bordered column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
          <Descriptions.Item label="Name">{subsystem.name}</Descriptions.Item>
          <Descriptions.Item label="Technical ID">{subsystem.technical_id}</Descriptions.Item>
          <Descriptions.Item label="Machine">{subsystem.machine_name}</Descriptions.Item>
          <Descriptions.Item label="Description" span={3}>
            {subsystem.description || 'No description provided'}
          </Descriptions.Item>
        </Descriptions>
        
        <Title level={4} style={{ marginTop: '24px' }}>Components</Title>
        
        {subsystem.components && subsystem.components.length > 0 ? (
          <Table 
            dataSource={subsystem.components} 
            columns={componentColumns} 
            rowKey="id" 
            pagination={false}
          />
        ) : (
          <Empty 
            description="No components found for this subsystem" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => navigate(`/machines/subsystem/${subsystem.id}/add-component`)}
            >
              Add Component
            </Button>
          </Empty>
        )}
      </Card>
    </div>
  );
};

export default SubsystemDetail;