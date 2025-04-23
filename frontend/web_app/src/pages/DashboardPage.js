import React, { useState, useEffect, useContext } from 'react';
import { Row, Col, Card, Statistic, Table, Spin, Empty, Alert, Typography, Select } from 'antd';
import { 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  ToolOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';
import { fetchDashboardSummary } from '../services/reportService';
import { fetchRecentWorkOrders } from '../services/workOrderService';
import { fetchRecentMaintenanceLogs } from '../services/maintenanceService';
import './DashboardPage.css';

const { Title } = Typography;
const { Option } = Select;

const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [recentWorkOrders, setRecentWorkOrders] = useState([]);
  const [recentMaintenance, setRecentMaintenance] = useState([]);
  const [timeRange, setTimeRange] = useState('30');  // Default to 30 days

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch summary data
        const summary = await fetchDashboardSummary(timeRange);
        setSummaryData(summary);
        
        // Fetch recent work orders
        const workOrders = await fetchRecentWorkOrders(5);  // Limit to 5 most recent
        setRecentWorkOrders(workOrders);
        
        // Fetch recent maintenance logs
        const maintenanceLogs = await fetchRecentMaintenanceLogs(5);
        setRecentMaintenance(maintenanceLogs);
        
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [timeRange]);
  
  // Handle time range change
  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
  };
  
  // Work order columns for table
  const workOrderColumns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Machine',
      dataIndex: 'machine',
      key: 'machine',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <span className={`status-tag status-${status}`}>
          {status}
        </span>
      ),
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
      title: 'Machine',
      dataIndex: 'machine_name',
      key: 'machine_name',
    },
    {
      title: 'Performed By',
      dataIndex: 'performed_by_name',
      key: 'performed_by_name',
    },
    {
      title: 'Type',
      dataIndex: 'maintenance_type',
      key: 'maintenance_type',
    },
    {
      title: 'Date',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Deviation',
      dataIndex: 'has_deviation',
      key: 'has_deviation',
      render: (hasDeviation) => hasDeviation ? 'Yes' : 'No',
    },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <Title level={2}>Dashboard</Title>
        <Select 
          defaultValue="30" 
          style={{ width: 120 }} 
          onChange={handleTimeRangeChange}
          disabled={loading}
        >
          <Option value="7">7 Days</Option>
          <Option value="30">30 Days</Option>
          <Option value="90">90 Days</Option>
        </Select>
      </div>
      
      {summaryData && (
        <Row gutter={[16, 16]} className="stats-row">
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="Open Work Orders"
                value={summaryData.work_orders.open}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="In Progress"
                value={summaryData.work_orders.in_progress}
                prefix={<ToolOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="Completed"
                value={summaryData.work_orders.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="Failures Reported"
                value={summaryData.failures.total}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
        </Row>
      )}
      
      <Row gutter={[16, 16]} className="charts-row">
        <Col xs={24} lg={12}>
          <Card 
            title="Average Uptime" 
            className="chart-card"
            extra={<BarChartOutlined />}
          >
            {summaryData ? (
              <div className="uptime-display">
                <Statistic
                  value={summaryData.uptime.average_percentage}
                  suffix="%"
                  precision={2}
                  valueStyle={{ color: summaryData.uptime.average_percentage > 90 ? '#52c41a' : '#fa8c16' }}
                />
                <p>Period: {new Date(summaryData.period.start_date).toLocaleDateString()} - {new Date(summaryData.period.end_date).toLocaleDateString()}</p>
              </div>
            ) : (
              <Empty description="No uptime data available" />
            )}
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card 
            title="Work Order Distribution" 
            className="chart-card"
            extra={<BarChartOutlined />}
          >
            {summaryData && (
              <div className="work-order-distribution">
                <div className="distribution-item">
                  <span className="label">Total Work Orders:</span>
                  <span className="value">{summaryData.work_orders.total}</span>
                </div>
                <div className="distribution-bar">
                  <div 
                    className="bar-segment open"
                    style={{ width: `${(summaryData.work_orders.open / summaryData.work_orders.total) * 100}%` }}
                    title={`Open: ${summaryData.work_orders.open}`}
                  ></div>
                  <div 
                    className="bar-segment in-progress"
                    style={{ width: `${(summaryData.work_orders.in_progress / summaryData.work_orders.total) * 100}%` }}
                    title={`In Progress: ${summaryData.work_orders.in_progress}`}
                  ></div>
                  <div 
                    className="bar-segment completed"
                    style={{ width: `${(summaryData.work_orders.completed / summaryData.work_orders.total) * 100}%` }}
                    title={`Completed: ${summaryData.work_orders.completed}`}
                  ></div>
                </div>
                <div className="distribution-legend">
                  <div className="legend-item">
                    <span className="color-box open"></span>
                    <span>Open</span>
                  </div>
                  <div className="legend-item">
                    <span className="color-box in-progress"></span>
                    <span>In Progress</span>
                  </div>
                  <div className="legend-item">
                    <span className="color-box completed"></span>
                    <span>Completed</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} className="tables-row">
        <Col xs={24} lg={12}>
          <Card title="Recent Work Orders" className="table-card">
            {recentWorkOrders.length > 0 ? (
              <Table 
                dataSource={recentWorkOrders} 
                columns={workOrderColumns} 
                pagination={false}
                rowKey="id"
                size="small"
              />
            ) : (
              <Empty description="No recent work orders" />
            )}
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="Recent Maintenance Activities" className="table-card">
            {recentMaintenance.length > 0 ? (
              <Table 
                dataSource={recentMaintenance} 
                columns={maintenanceColumns} 
                pagination={false}
                rowKey="id"
                size="small"
              />
            ) : (
              <Empty description="No recent maintenance logs" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;