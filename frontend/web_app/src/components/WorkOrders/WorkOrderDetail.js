import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Descriptions, 
  Button, 
  Tag, 
  Spin, 
  message, 
  Typography,
  Divider,
  Space,
  Popconfirm,
  Modal,
  Input
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  CheckOutlined, 
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { AuthContext } from '../../context/AuthContext';
import { fetchWorkOrderById, updateWorkOrderStatus } from '../../services/workOrderService';
import { addMaintenanceLog } from '../../services/maintenanceService';
import './WorkOrderDetail.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const WorkOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch work order details
  useEffect(() => {
    const loadWorkOrder = async () => {
      try {
        setLoading(true);
        const data = await fetchWorkOrderById(id);
        setWorkOrder(data);
      } catch (error) {
        message.error('Failed to load work order details');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    loadWorkOrder();
  }, [id]);

  // Navigate back to work orders list
  const handleBack = () => {
    navigate('/work-orders');
  };

  // Navigate to edit page
  const handleEdit = () => {
    navigate(`/work-orders/${id}/edit`);
  };

  // Show completion modal
  const showCompletionModal = () => {
    setCompletionModalVisible(true);
    setMaintenanceNotes('');
  };

  // Handle work order completion
  const handleCompleteWorkOrder = async () => {
    try {
      setSubmitting(true);
      
      // First update work order status
      await updateWorkOrderStatus(id, 'completed', maintenanceNotes);
      
      // Then create maintenance log
      await addMaintenanceLog({
        machine_id: workOrder.machine_id,
        subsystem_id: workOrder.subsystem_id,
        component_id: workOrder.component_id,
        description: `Completed work order: ${workOrder.title}\n\n${maintenanceNotes}`,
        work_order_id: id,
        maintenance_type: workOrder.type,
        maintenance_category: workOrder.category,
        has_deviation: false
      });
      
      // Update local state
      setWorkOrder({
        ...workOrder,
        status: 'completed'
      });
      
      message.success('Work order marked as completed');
      setCompletionModalVisible(false);
    } catch (error) {
      message.error('Failed to complete work order');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Render status tag
  const renderStatusTag = (status) => {
    let color = 'blue';
    if (status === 'completed') color = 'green';
    if (status === 'in_progress') color = 'orange';
    
    return (
      <Tag color={color} className="status-tag">
        {status.replace('_', ' ')}
      </Tag>
    );
  };

  // Render priority tag
  const renderPriorityTag = (priority) => {
    let color = 'blue';
    if (priority === 'low') color = 'green';
    if (priority === 'high') color = 'orange';
    if (priority === 'critical') color = 'red';
    
    return (
      <Tag color={color} className="priority-tag">
        {priority}
      </Tag>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="not-found">
        <Title level={3}>Work Order Not Found</Title>
        <Button type="primary" onClick={handleBack}>Back to Work Orders</Button>
      </div>
    );
  }

  return (
    <div className="work-order-detail-container">
      <Card className="detail-card">
        <div className="detail-header">
          <div>
            <Title level={2}>Work Order #{workOrder.id}</Title>
            <div className="status-row">
              <Text>Status: {renderStatusTag(workOrder.status)}</Text>
              <Text>Priority: {renderPriorityTag(workOrder.priority)}</Text>
              <Text>Type: <Tag>{workOrder.type}</Tag></Text>
            </div>
          </div>
          
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
            >
              Back
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
            
            {workOrder.status !== 'completed' && (
              <Button 
                type="primary" 
                icon={<CheckOutlined />} 
                onClick={showCompletionModal}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Complete
              </Button>
            )}
          </Space>
        </div>
        
        <Divider />
        
        <Title level={4}>{workOrder.title}</Title>
        <Text className="description-text">{workOrder.description}</Text>
        
        <Divider />
        
        <Descriptions title="Work Order Details" bordered column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
          <Descriptions.Item label="Machine">{workOrder.machine}</Descriptions.Item>
          <Descriptions.Item label="Subsystem">{workOrder.subsystem || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Component">{workOrder.component || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Category">{workOrder.category}</Descriptions.Item>
          <Descriptions.Item label="Assigned To">{workOrder.assigned_to || 'Not assigned'}</Descriptions.Item>
          <Descriptions.Item label="Due Date">{new Date(workOrder.due_date).toLocaleDateString()}</Descriptions.Item>
          <Descriptions.Item label="Created At">{new Date(workOrder.created_at).toLocaleDateString()}</Descriptions.Item>
          <Descriptions.Item label="Tool Requirements" span={3}>
            {workOrder.tool_requirements || 'None specified'}
          </Descriptions.Item>
          <Descriptions.Item label="Reason" span={3}>
            {workOrder.reason || 'None specified'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      
      <Modal
        title="Complete Work Order"
        visible={completionModalVisible}
        onCancel={() => setCompletionModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setCompletionModalVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitting} 
            onClick={handleCompleteWorkOrder}
          >
            Complete
          </Button>,
        ]}
      >
        <p>You are about to mark this work order as completed. Please provide any relevant notes about the work performed:</p>
        <TextArea
          rows={6}
          value={maintenanceNotes}
          onChange={(e) => setMaintenanceNotes(e.target.value)}
          placeholder="Describe the maintenance activities performed..."
        />
        <div className="modal-note">
          <Text type="secondary">
            <ExclamationCircleOutlined /> A maintenance log will be automatically created based on this information.
          </Text>
        </div>
      </Modal>
    </div>
  );
};

export default WorkOrderDetail;