import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Button, 
  Card, 
  Spin, 
  message, 
  Typography,
  Space,
  Divider 
} from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined, 
  CalendarOutlined,
  ToolOutlined,
  UserOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';
import { createWorkOrder, fetchWorkOrderById, updateWorkOrder } from '../../services/workOrderService';
import { fetchSubsystems, fetchComponents } from '../../services/machineService';
import { fetchUsers } from '../../services/authService';
import './WorkOrderForm.css';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const WorkOrderForm = ({ machines = [], isEditing = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [subsystems, setSubsystems] = useState([]);
  const [components, setComponents] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedSubsystem, setSelectedSubsystem] = useState(null);

  // Fetch work order details if editing
  useEffect(() => {
    const loadWorkOrder = async () => {
      try {
        setLoading(true);
        const workOrder = await fetchWorkOrderById(id);
        
        // Load subsystems for this machine
        if (workOrder.machine_id) {
          const subsystemsData = await fetchSubsystems(workOrder.machine_id);
          setSubsystems(subsystemsData);
          setSelectedMachine(workOrder.machine_id);
        }
        
        // Load components if subsystem is selected
        if (workOrder.subsystem_id) {
          const componentsData = await fetchComponents(workOrder.subsystem_id);
          setComponents(componentsData);
          setSelectedSubsystem(workOrder.subsystem_id);
        }
        
        // Format the data for the form
        form.setFieldsValue({
          ...workOrder,
          due_date: moment(workOrder.due_date),
        });
      } catch (error) {
        message.error('Failed to load work order details');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    const loadUsers = async () => {
      try {
        // Replace with actual API call when available
        const usersData = await fetchUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };
    
    loadUsers();
    
    if (isEditing && id) {
      loadWorkOrder();
    }
  }, [id, isEditing, form]);

  // Handle machine selection
  const handleMachineChange = async (machineId) => {
    setSelectedMachine(machineId);
    form.setFieldsValue({ subsystem_id: undefined, component_id: undefined });
    setSelectedSubsystem(null);
    setComponents([]);
    
    if (machineId) {
      try {
        const subsystemsData = await fetchSubsystems(machineId);
        setSubsystems(subsystemsData);
      } catch (error) {
        message.error('Failed to load subsystems');
        console.error(error);
      }
    } else {
      setSubsystems([]);
    }
  };

  // Handle subsystem selection
  const handleSubsystemChange = async (subsystemId) => {
    setSelectedSubsystem(subsystemId);
    form.setFieldsValue({ component_id: undefined });
    
    if (subsystemId) {
      try {
        const componentsData = await fetchComponents(subsystemId);
        setComponents(componentsData);
      } catch (error) {
        message.error('Failed to load components');
        console.error(error);
      }
    } else {
      setComponents([]);
    }
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      // Format the date
      const formattedValues = {
        ...values,
        due_date: values.due_date.toISOString(),
      };
      
      if (isEditing) {
        await updateWorkOrder(id, formattedValues);
        message.success('Work order updated successfully');
      } else {
        await createWorkOrder(formattedValues);
        message.success('Work order created successfully');
      }
      
      // Navigate back to work orders list
      navigate('/work-orders');
    } catch (error) {
      message.error(isEditing ? 'Failed to update work order' : 'Failed to create work order');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancellation
  const handleCancel = () => {
    navigate('/work-orders');
  };

  return (
    <div className="work-order-form-container">
      <Card className="form-card">
        <div className="form-header">
          <Title level={2}>{isEditing ? 'Edit Work Order' : 'Create Work Order'}</Title>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleCancel}
          >
            Back to List
          </Button>
        </div>
        
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              status: 'open',
              priority: 'normal',
              type: 'preventive',
              category: 'regular_maintenance',
            }}
          >
            <Divider orientation="left">Basic Information</Divider>
            
            <Form.Item
              name="title"
              label="Title"
              rules={[{ required: true, message: 'Please enter a title' }]}
            >
              <Input placeholder="Enter work order title" />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: 'Please enter a description' }]}
            >
              <TextArea rows={4} placeholder="Detailed description of the work order" />
            </Form.Item>
            
            <div className="form-row">
              <Form.Item
                name="due_date"
                label="Due Date"
                rules={[{ required: true, message: 'Please select a due date' }]}
                className="form-col"
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  format="YYYY-MM-DD"
                  placeholder="Select due date"
                  suffixIcon={<CalendarOutlined />}
                />
              </Form.Item>
              
              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true, message: 'Please select a priority' }]}
                className="form-col"
              >
                <Select placeholder="Select priority">
                  <Option value="low">Low</Option>
                  <Option value="normal">Normal</Option>
                  <Option value="high">High</Option>
                  <Option value="critical">Critical</Option>
                </Select>
              </Form.Item>
            </div>
            
            <div className="form-row">
              <Form.Item
                name="type"
                label="Type"
                rules={[{ required: true, message: 'Please select a type' }]}
                className="form-col"
              >
                <Select placeholder="Select type">
                  <Option value="preventive">Preventive</Option>
                  <Option value="predictive">Predictive</Option>
                  <Option value="corrective">Corrective</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please select a category' }]}
                className="form-col"
              >
                <Select placeholder="Select category">
                  <Option value="regular_maintenance">Regular Maintenance</Option>
                  <Option value="inspection">Inspection</Option>
                  <Option value="repair">Repair</Option>
                  <Option value="cleaning">Cleaning</Option>
                  <Option value="lubrication">Lubrication</Option>
                  <Option value="calibration">Calibration</Option>
                  <Option value="replacement">Replacement</Option>
                </Select>
              </Form.Item>
            </div>
            
            <Divider orientation="left">Equipment Information</Divider>
            
            <Form.Item
              name="machine_id"
              label="Machine"
              rules={[{ required: true, message: 'Please select a machine' }]}
            >
              <Select 
                placeholder="Select machine" 
                onChange={handleMachineChange}
                loading={loading}
              >
                {machines.map(machine => (
                  <Option key={machine.id} value={machine.id}>{machine.name}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <div className="form-row">
              <Form.Item
                name="subsystem_id"
                label="Subsystem"
                className="form-col"
              >
                <Select 
                  placeholder="Select subsystem (optional)" 
                  onChange={handleSubsystemChange}
                  disabled={!selectedMachine}
                  allowClear
                >
                  {subsystems.map(subsystem => (
                    <Option key={subsystem.id} value={subsystem.id}>{subsystem.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                name="component_id"
                label="Component"
                className="form-col"
              >
                <Select 
                  placeholder="Select component (optional)" 
                  disabled={!selectedSubsystem}
                  allowClear
                >
                  {components.map(component => (
                    <Option key={component.id} value={component.id}>{component.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
            
            <Divider orientation="left">Additional Information</Divider>
            
            <Form.Item
              name="assigned_to"
              label="Assign To"
            >
              <Select 
                placeholder="Select user (optional)" 
                allowClear
              >
                {users.map(user => (
                  <Option key={user.id} value={user.id}>{user.username}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              name="tool_requirements"
              label="Tool Requirements"
            >
              <TextArea rows={3} placeholder="List of tools required for this work order" />
            </Form.Item>
            
            <Form.Item
              name="reason"
              label="Reason"
            >
              <TextArea rows={3} placeholder="Reason for creating this work order" />
            </Form.Item>
            
            {isEditing && (
              <Form.Item
                name="status"
                label="Status"
              >
                <Select placeholder="Select status">
                  <Option value="open">Open</Option>
                  <Option value="in_progress">In Progress</Option>
                  <Option value="completed">Completed</Option>
                </Select>
              </Form.Item>
            )}
            
            <div className="form-actions">
              <Button 
                type="default" 
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting}
                icon={<SaveOutlined />}
              >
                {isEditing ? 'Update Work Order' : 'Create Work Order'}
              </Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
};

export default WorkOrderForm;