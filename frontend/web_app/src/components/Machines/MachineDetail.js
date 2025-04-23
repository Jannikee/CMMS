import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Descriptions, 
  Button, 
  Tabs, 
  Table, 
  Spin, 
  message, 
  Typography,
  Space,
  Divider,
  Badge,
  Modal,
  Input
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  QrcodeOutlined, 
  ToolOutlined,
  PlusOutlined,
  BarChartOutlined,
  LineChartOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { AuthContext } from '../../context/AuthContext';
import { fetchMachineById } from '../../services/machineService';
import { fetchWorkOrders } from '../../services/workOrderService';
import { fetchMaintenanceLogs } from '../../services/maintenanceService';
import { fetchFailureRates, fetchUptimeStats, fetchMTBFMTTR } from '../../services/reportService';
import SubsystemForm from './SubsystemForm';
import './MachineDetail.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const MachineDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [machine, setMachine] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [failureStats, setFailureStats] = useState(null);
  const [uptimeStats, setUptimeStats] = useState(null);
  const [mtbfStats, setMtbfStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [subsystemModalVisible, setSubsystemModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  // Load machine details and related data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get machine details
        const machineData = await fetchMachineById(id);
        setMachine(machineData);
        
        // Get related work orders
        const workOrdersData = await fetchWorkOrders({ machine_id: id });
        setWorkOrders(workOrdersData);
        
        // Get maintenance logs
        const maintenanceData = await fetchMaintenanceLogs({ machine_id: id });
        setMaintenanceLogs(maintenanceData);
        
      } catch (error) {
        message.error('Failed to load machine details');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id]);

  // Load statistics data when needed
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        setStatsLoading(true);
        
        // Get failure statistics
        const failureData = await fetchFailureRates({ machine_id: id });
        setFailureStats(failureData);
        
        // Get uptime statistics
        const uptimeData = await fetchUptimeStats({ machine_id: id });
        setUptimeStats(uptimeData);
        
        // Get MTBF/MTTR statistics
        const mtbfData = await fetchMTBFMTTR({ machine_id: id });
        setMtbfStats(mtbfData);
        
      } catch (error) {
        console.error('Failed to load statistics:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    
    if (machine) {
      loadStatistics();
    }
  }, [id, machine]);

  // Navigate back to machines list
  const handleBack = () => {
    navigate('/machines');
  };

  // Navigate to edit page
  const handleEdit = () => {
    navigate(`/machines/${id}/edit`);
  };

  // Show QR code modal
  const showQrCode = () => {
    setQrModalVisible(true);
  };

  // Show add subsystem modal
  const showAddSubsystem = () => {
    setSubsystemModalVisible(true);
  };

  // Handle adding new subsystem
  const handleSubsystemAdded = async () => {
    try {
      // Refresh machine data
      const machineData = await fetchMachineById(id);
      setMachine(machineData);
      setSubsystemModalVisible(false);
      message.success('Subsystem added successfully');
    } catch (error) {
      message.error('Failed to refresh machine data');
      console.error(error);
    }
  };

  // Handle subsystem selection
  const handleSubsystemClick = (subsystemId) => {
    // Navigate to subsystem detail
    // Note: You'll need to implement this route
    navigate(`/machines/subsystem/${subsystemId}`);
  };

  // Subsystem columns for table
  const subsystemColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => handleSubsystemClick(record.id)}>{text}</a>
      ),
    },
    {
      title: 'Technical ID',
      dataIndex: 'technical_id',
      key: 'technical_id',
    },
    {
      title: 'Components',
      dataIndex: 'component_count',
      key: 'component_count',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            onClick={() => handleSubsystemClick(record.id)}
          >
            View Details
          </Button>
        </Space>
      ),
    },
  ];

  // Work order columns for table
  const workOrderColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/work-orders/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'processing';
        if (status === 'completed') color = 'success';
        if (status === 'in_progress') color = 'warning';
        
        return (
          <Badge status={color} text={status.replace('_', ' ')} />
        );
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  // Maintenance log columns for table
  const maintenanceColumns = [
    {
      title: 'Date',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Type',
      dataIndex: 'maintenance_type',
      key: 'maintenance_type',
    },
    {
      title: 'Performed By',
      dataIndex: 'performed_by_name',
      key: 'performed_by_name',
    },
    {
      title: 'Deviation',
      dataIndex: 'has_deviation',
      key: 'has_deviation',
      render: (hasDeviation) => {
        return hasDeviation ? 
          <Badge status="error" text="Yes" /> : 
          <Badge status="success" text="No" />;
      },
    },
    {
      title: 'Hours',
      dataIndex: 'hour_counter',
      key: 'hour_counter',
      render: (hours) => hours || 'N/A',
    },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="not-found">
        <Title level={3}>Equipment Not Found</Title>
        <Button type="primary" onClick={handleBack}>Back to Equipment</Button>
      </div>
    );
  }

  return (
    <div className="machine-detail-container">
      <Card className="detail-card">
        <div className="detail-header">
          <div>
            <Title level={2}>{machine.name}</Title>
            <Text className="technical-id">ID: {machine.technical_id}</Text>
          </div>
          
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
            >
              Back
            </Button>
            
            <Button 
              icon={<QrcodeOutlined />} 
              onClick={showQrCode}
            >
              QR Code
            </Button>
            
            {(user.role === 'admin' || user.role === 'supervisor') && (
              <Button 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={handleEdit}
              >
                Edit
              </Button>
            )}
          </Space>
        </div>
        
        <Divider />
        
        <Descriptions title="Equipment Details" bordered column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
          <Descriptions.Item label="Location">{machine.location}</Descriptions.Item>
          <Descriptions.Item label="Hour Counter">{machine.hour_counter || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Installation Date">
            {machine.installation_date ? new Date(machine.installation_date).toLocaleDateString() : 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Last Maintenance">
            {machine.last_maintenance ? new Date(machine.last_maintenance).toLocaleDateString() : 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={3}>
            {machine.description || 'No description available'}
          </Descriptions.Item>
        </Descriptions>
        
        <Divider />
        
        <Tabs defaultActiveKey="subsystems">
          <TabPane
            tab={
              <span>
                <ToolOutlined />
                Subsystems
              </span>
            }
            key="subsystems"
          >
            <div className="tab-header">
              <Title level={4}>Subsystems</Title>
              
              {(user.role === 'admin' || user.role === 'supervisor') && (
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={showAddSubsystem}
                >
                  Add Subsystem
                </Button>
              )}
            </div>
            
            {machine.subsystems.length > 0 ? (
              <Table 
                dataSource={machine.subsystems} 
                columns={subsystemColumns} 
                rowKey="id"
                pagination={false}
              />
            ) : (
              <div className="empty-state">
                <Text>No subsystems defined for this equipment</Text>
                {(user.role === 'admin' || user.role === 'supervisor') && (
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={showAddSubsystem}
                    style={{ marginTop: 16 }}
                  >
                    Add Subsystem
                  </Button>
                )}
              </div>
            )}
          </TabPane>
          
          <TabPane
            tab={
              <span>
                <ClockCircleOutlined />
                Work Orders
              </span>
            }
            key="workorders"
          >
            <div className="tab-header">
              <Title level={4}>Work Orders</Title>
              
              {(user.role === 'admin' || user.role === 'supervisor') && (
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => navigate('/work-orders/create', { state: { machine_id: id } })}
                >
                  Create Work Order
                </Button>
              )}
            </div>
            
            {workOrders.length > 0 ? (
              <Table 
                dataSource={workOrders} 
                columns={workOrderColumns} 
                rowKey="id"
                pagination={{ pageSize: 5 }}
              />
            ) : (
              <div className="empty-state">
                <Text>No work orders found for this equipment</Text>
              </div>
            )}
          </TabPane>
          
          <TabPane
            tab={
              <span>
                <LineChartOutlined />
                Maintenance History
              </span>
            }
            key="maintenance"
          >
            <Title level={4}>Maintenance History</Title>
            
            {maintenanceLogs.length > 0 ? (
              <Table 
                dataSource={maintenanceLogs} 
                columns={maintenanceColumns} 
                rowKey="id"
                pagination={{ pageSize: 5 }}
              />
            ) : (
              <div className="empty-state">
                <Text>No maintenance logs found for this equipment</Text>
              </div>
            )}
          </TabPane>
          
          <TabPane
            tab={
              <span>
                <BarChartOutlined />
                Statistics
              </span>
            }
            key="statistics"
          >
            <Title level={4}>Equipment Statistics</Title>
            
            {statsLoading ? (
              <div className="loading-container">
                <Spin />
              </div>
            ) : (
              <div className="statistics-container">
                <div className="stats-row">
                  <Card title="Failure Statistics" className="stat-card">
                    {failureStats && failureStats.length > 0 ? (
                      <Descriptions column={1} bordered>
                        <Descriptions.Item label="Total Failures">{failureStats[0].failure_count}</Descriptions.Item>
                        <Descriptions.Item label="Operating Hours">{failureStats[0].operation_hours}</Descriptions.Item>
                        <Descriptions.Item label="Failure Rate (per 1000h)">{failureStats[0].failure_rate_per_1000h}</Descriptions.Item>
                      </Descriptions>
                    ) : (
                      <Text>No failure data available</Text>
                    )}
                  </Card>
                  
                  <Card title="Uptime Statistics" className="stat-card">
                    {uptimeStats && uptimeStats.length > 0 ? (
                      <Descriptions column={1} bordered>
                        <Descriptions.Item label="Uptime Percentage">{uptimeStats[0].uptime_percentage}%</Descriptions.Item>
                        <Descriptions.Item label="Uptime Hours">{uptimeStats[0].uptime_hours}</Descriptions.Item>
                        <Descriptions.Item label="Downtime Hours">{uptimeStats[0].downtime_hours}</Descriptions.Item>
                      </Descriptions>
                    ) : (
                      <Text>No uptime data available</Text>
                    )}
                  </Card>
                  
                  <Card title="MTBF & MTTR" className="stat-card">
                    {mtbfStats && mtbfStats.length > 0 ? (
                      <Descriptions column={1} bordered>
                        <Descriptions.Item label="Mean Time Between Failures">{mtbfStats[0].mtbf_hours} hours</Descriptions.Item>
                        <Descriptions.Item label="Mean Time To Repair">{mtbfStats[0].mttr_hours} hours</Descriptions.Item>
                        <Descriptions.Item label="Failure Count">{mtbfStats[0].failure_count}</Descriptions.Item>
                      </Descriptions>
                    ) : (
                      <Text>No MTBF/MTTR data available</Text>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </TabPane>
        </Tabs>
      </Card>
      
      <Modal
        title="Equipment QR Code"
        visible={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={null}
      >
        <div className="qr-container">
          {/* Display QR code image here - you'll need to get this from the API */}
          <img 
            src={`/api/machines/${id}/qrcode`} 
            alt="Equipment QR Code" 
            className="qr-image" 
          />
          <p>Scan this QR code to access this equipment record in the mobile app.</p>
        </div>
      </Modal>
      
      <Modal
        title="Add Subsystem"
        visible={subsystemModalVisible}
        onCancel={() => setSubsystemModalVisible(false)}
        footer={null}
        width={600}
      >
        <SubsystemForm 
          machineId={id} 
          machineTechnicalId={machine.technical_id}
          onSuccess={handleSubsystemAdded} 
        />
      </Modal>
    </div>
  );
};

export default MachineDetail;