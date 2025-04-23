import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Input, 
  Select, 
  Typography, 
  Spin, 
  message, 
  Modal
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  CheckOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';
import { fetchWorkOrders, updateWorkOrderStatus } from '../services/workOrderService';
import { fetchMachines } from '../services/machineService';
import WorkOrderForm from '../components/WorkOrders/WorkOrderForm';
import WorkOrderDetail from '../components/WorkOrders/WorkOrderDetail';
import './WorkOrdersPage.css';

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

const WorkOrdersPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    type: '',
    machine_id: ''
  });
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [statusUpdateId, setStatusUpdateId] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');

  // Load work orders and machines on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [workOrdersData, machinesData] = await Promise.all([
          fetchWorkOrders(),
          fetchMachines()
        ]);
        
        setWorkOrders(workOrdersData);
        setFilteredData(workOrdersData);
        setMachines(machinesData);
      } catch (error) {
        message.error('Failed to load data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter and search work orders
  useEffect(() => {
    let result = [...workOrders];
    
    // Apply filters
    if (filters.status) {
      result = result.filter(item => item.status === filters.status);
    }
    
    if (filters.priority) {
      result = result.filter(item => item.priority === filters.priority);
    }
    
    if (filters.type) {
      result = result.filter(item => item.type === filters.type);
    }
    
    if (filters.machine_id) {
      result = result.filter(item => item.machine_id === filters.machine_id);
    }
    
    // Apply search
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(
        item => 
          item.title.toLowerCase().includes(searchLower) || 
          item.description.toLowerCase().includes(searchLower) ||
          item.machine.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredData(result);
  }, [workOrders, filters, searchText]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters({
      ...filters,
      [key]: value
    });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      type: '',
      machine_id: ''
    });
    setSearchText('');
  };

  // Handle search
  const handleSearch = (value) => {
    setSearchText(value);
  };

  // Navigate to create work order form
  const handleCreateWorkOrder = () => {
    navigate('/work-orders/create');
  };

  // Navigate to work order detail view
  const handleViewWorkOrder = (id) => {
    navigate(`/work-orders/${id}`);
  };

  // Navigate to edit work order
  const handleEditWorkOrder = (id) => {
    navigate(`/work-orders/${id}/edit`);
  };

  // Open status update modal
  const showStatusUpdateModal = (id, currentStatus) => {
    setStatusUpdateId(id);
    setNewStatus(currentStatus);
    setStatusNotes('');
    setStatusModalVisible(true);
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    try {
      setLoading(true);
      await updateWorkOrderStatus(statusUpdateId, newStatus, statusNotes);
      
      // Update local state
      const updatedWorkOrders = workOrders.map(wo => {
        if (wo.id === statusUpdateId) {
          return { ...wo, status: newStatus };
        }
        return wo;
      });
      
      setWorkOrders(updatedWorkOrders);
      message.success('Work order status updated');
      setStatusModalVisible(false);
    } catch (error) {
      message.error('Failed to update work order status');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Table columns configuration
  const columns = [
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
      render: (text, record) => (
        <a onClick={() => handleViewWorkOrder(record.id)}>{text}</a>
      ),
    },
    {
      title: 'Machine',
      dataIndex: 'machine',
      key: 'machine',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <span style={{ textTransform: 'capitalize' }}>{type}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'blue';
        if (status === 'completed') color = 'green';
        if (status === 'in_progress') color = 'orange';
        
        return (
          <Tag color={color} className="status-tag">
            {status.replace('_', ' ')}
          </Tag>
        );
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => {
        let color = 'blue';
        if (priority === 'low') color = 'green';
        if (priority === 'high') color = 'orange';
        if (priority === 'critical') color = 'red';
        
        return (
          <Tag color={color} className="priority-tag">
            {priority}
          </Tag>
        );
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {(user.role === 'admin' || user.role === 'supervisor' || 
            (record.status !== 'completed' && record.assigned_to === user.username)) && (
            <Button 
              type="primary" 
              size="small" 
              icon={<CheckOutlined />}
              onClick={() => showStatusUpdateModal(record.id, record.status)}
            >
              Update
            </Button>
          )}
          
          {(user.role === 'admin' || user.role === 'supervisor') && (
            <Button 
              type="default" 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEditWorkOrder(record.id)}
            >
              Edit
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="work-orders-container">
      <Routes>
        <Route path="/" element={
          <>
            <div className="page-header">
              <Title level={2}>Work Orders</Title>
              
              {(user.role === 'admin' || user.role === 'supervisor') && (
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={handleCreateWorkOrder}
                >
                  Create Work Order
                </Button>
              )}
            </div>
            
            <div className="filters-container">
              <div className="search-container">
                <Search 
                  placeholder="Search work orders..." 
                  allowClear
                  enterButton={<SearchOutlined />}
                  onSearch={handleSearch}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 300 }}
                />
              </div>
              
              <div className="filters">
                <Select
                  placeholder="Status"
                  allowClear
                  value={filters.status}
                  onChange={(value) => handleFilterChange('status', value)}
                  style={{ width: 120 }}
                >
                  <Option value="open">Open</Option>
                  <Option value="in_progress">In Progress</Option>
                  <Option value="completed">Completed</Option>
                </Select>
                
                <Select
                  placeholder="Priority"
                  allowClear
                  value={filters.priority}
                  onChange={(value) => handleFilterChange('priority', value)}
                  style={{ width: 120 }}
                >
                  <Option value="low">Low</Option>
                  <Option value="normal">Normal</Option>
                  <Option value="high">High</Option>
                  <Option value="critical">Critical</Option>
                </Select>
                
                <Select
                  placeholder="Type"
                  allowClear
                  value={filters.type}
                  onChange={(value) => handleFilterChange('type', value)}
                  style={{ width: 140 }}
                >
                  <Option value="preventive">Preventive</Option>
                  <Option value="predictive">Predictive</Option>
                  <Option value="corrective">Corrective</Option>
                </Select>
                
                <Select
                  placeholder="Machine"
                  allowClear
                  value={filters.machine_id}
                  onChange={(value) => handleFilterChange('machine_id', value)}
                  style={{ width: 180 }}
                >
                  {machines.map(machine => (
                    <Option key={machine.id} value={machine.id}>{machine.name}</Option>
                  ))}
                </Select>
                
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={handleResetFilters}
                  title="Reset filters"
                >
                  Reset
                </Button>
              </div>
            </div>
            
            {loading ? (
              <div className="loading-container">
                <Spin size="large" />
              </div>
            ) : (
              <Table 
                columns={columns} 
                dataSource={filteredData.map(item => ({ ...item, key: item.id }))} 
                pagination={{ pageSize: 10 }}
                rowClassName={(record) => {
                  const dueDate = new Date(record.due_date);
                  const today = new Date();
                  const tomorrow = new Date();
                  tomorrow.setDate(today.getDate() + 1);
                  
                  if (record.status !== 'completed') {
                    if (dueDate < today) {
                      return 'overdue-row';
                    } else if (dueDate < tomorrow) {
                      return 'due-today-row';
                    }
                  }
                  return '';
                }}
              />
            )}
            
            <Modal
              title="Update Work Order Status"
              visible={statusModalVisible}
              onOk={handleStatusUpdate}
              onCancel={() => setStatusModalVisible(false)}
              confirmLoading={loading}
            >
              <div className="status-update-form">
                <div className="form-item">
                  <label>New Status:</label>
                  <Select 
                    value={newStatus} 
                    onChange={setNewStatus}
                    style={{ width: '100%' }}
                  >
                    <Option value="open">Open</Option>
                    <Option value="in_progress">In Progress</Option>
                    <Option value="completed">Completed</Option>
                  </Select>
                </div>
                
                <div className="form-item">
                  <label>Notes:</label>
                  <Input.TextArea 
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    rows={4}
                    placeholder="Add any notes about this status update"
                  />
                </div>
              </div>
            </Modal>
          </>
        } />
        
        <Route path="/create" element={<WorkOrderForm machines={machines} />} />
        <Route path="/:id" element={<WorkOrderDetail />} />
        <Route path="/:id/edit" element={<WorkOrderForm machines={machines} isEditing />} />
      </Routes>
    </div>
  );
};

export default WorkOrdersPage;