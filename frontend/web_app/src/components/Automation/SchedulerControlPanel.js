import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Spin, Tag, Space, Row, Col, Alert, message, Radio, Statistic, Divider, Descriptions } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, ClockCircleOutlined, ToolOutlined, BarChartOutlined } from '@ant-design/icons';
import { 
  getSchedulerStatus, 
  startScheduler, 
  stopScheduler, 
  setAnalysisMethod,
  runScheduledOptimizations,
  generateUpdatedWorkOrders 
} from '../../services/optimizationService';
import './Automation.css';

const { Title, Text } = Typography;

const SchedulerControlPanel = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [analysisMethod, setAnalysisMethodState] = useState('weibull');
  const [lastRunStatus, setLastRunStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [operationResult, setOperationResult] = useState(null);
  
  useEffect(() => {
    fetchSchedulerStatus();
  }, []);
  
  const fetchSchedulerStatus = async () => {
    try {
      setLoading(true);
      const status = await getSchedulerStatus();
      
      setIsRunning(status.is_running);
      setAnalysisMethodState(status.analysis_method);
      setLastRunStatus(status.last_run);
    } catch (error) {
      console.error('Error getting scheduler status:', error);
      message.error('Failed to get scheduler status');
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleScheduler = async () => {
    try {
      setLoading(true);
      
      if (isRunning) {
        await stopScheduler();
        message.success('Maintenance Optimization Scheduler stopped');
      } else {
        await startScheduler();
        message.success('Maintenance Optimization Scheduler started');
      }
      
      setIsRunning(!isRunning);
    } catch (error) {
      console.error(`Error ${isRunning ? 'stopping' : 'starting'} scheduler:`, error);
      message.error(`Failed to ${isRunning ? 'stop' : 'start'} scheduler`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSetAnalysisMethod = async (e) => {
    const method = e.target.value;
    try {
      setLoading(true);
      
      await setAnalysisMethod(method);
      setAnalysisMethodState(method);
      
      message.success(`Analysis method changed to ${method === 'weibull' ? 'Weibull Analysis' : 'Kaplan-Meier Survival Analysis'}`);
    } catch (error) {
      console.error('Error setting analysis method:', error);
      message.error('Failed to change analysis method');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRunScheduledOptimization = async () => {
    try {
      setLoading(true);
      setOperationResult(null);
      
      const result = await runScheduledOptimizations();
      setOperationResult(result);
      
      message.success(`Scheduled optimizations completed. Analyzed ${result.components_analyzed} components.`);
    } catch (error) {
      console.error('Error running scheduled optimizations:', error);
      message.error('Failed to run scheduled optimizations');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGenerateWorkOrders = async () => {
    try {
      setLoading(true);
      setOperationResult(null);
      
      const result = await generateUpdatedWorkOrders();
      setOperationResult(result);
      
      message.success(`Work order generation completed. Created ${result.work_orders_generated} work orders.`);
    } catch (error) {
      console.error('Error generating work orders:', error);
      message.error('Failed to generate work orders');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="scheduler-control-panel">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Title level={4}>Maintenance Interval Optimization Scheduler</Title>
            <div style={{ marginBottom: 16 }}>
              <Text>
                The maintenance interval optimization scheduler automatically analyzes component performance and 
                adjusts maintenance intervals based on statistical analysis. It runs once per day for optimization 
                analysis and work order generation.
              </Text>
            </div>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card>
                  <Statistic
                    title="Scheduler Status"
                    value={isRunning ? "Running" : "Stopped"}
                    valueStyle={{ color: isRunning ? '#52c41a' : '#f5222d' }}
                    prefix={isRunning ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                  />
                  <Button 
                    type={isRunning ? "danger" : "primary"}
                    onClick={handleToggleScheduler}
                    style={{ marginTop: 16 }}
                    loading={loading}
                    icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  >
                    {isRunning ? "Stop Scheduler" : "Start Scheduler"}
                  </Button>
                </Card>
              </Col>
              
              <Col xs={24} md={8}>
                <Card>
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5}>Analysis Method</Title>
                    <Radio.Group 
                      value={analysisMethod} 
                      onChange={handleSetAnalysisMethod}
                      disabled={loading}
                    >
                      <Space direction="vertical">
                        <Radio value="weibull">Weibull Analysis</Radio>
                        <Radio value="kaplan_meier">Kaplan-Meier Analysis</Radio>
                      </Space>
                    </Radio.Group>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} md={8}>
                <Card>
                  <Title level={5}>Manual Operations</Title>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button 
                      type="primary" 
                      icon={<BarChartOutlined />} 
                      onClick={handleRunScheduledOptimization}
                      loading={loading}
                      block
                    >
                      Run Optimization Analysis
                    </Button>
                    <Button 
                      icon={<ToolOutlined />} 
                      onClick={handleGenerateWorkOrders}
                      loading={loading}
                      block
                    >
                      Generate Work Orders
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
            
            {lastRunStatus && (
              <div style={{ marginTop: 16 }}>
                <Divider>Last Scheduler Run</Divider>
                <Descriptions bordered size="small" column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
                  <Descriptions.Item label="Date">
                    {new Date(lastRunStatus.timestamp).toLocaleString()}
                  </Descriptions.Item>
                  <Descriptions.Item label="Components Analyzed">
                    {lastRunStatus.components_analyzed}
                  </Descriptions.Item>
                  <Descriptions.Item label="Optimizations Needed">
                    {lastRunStatus.optimizations_needed}
                  </Descriptions.Item>
                  <Descriptions.Item label="Optimizations Applied">
                    {lastRunStatus.optimizations_applied}
                  </Descriptions.Item>
                </Descriptions>
              </div>
            )}
            
            {operationResult && (
              <div style={{ marginTop: 16 }}>
                <Divider>Operation Result</Divider>
                {operationResult.work_orders_generated !== undefined ? (
                  <Descriptions bordered size="small" column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
                    <Descriptions.Item label="Operation">
                      Work Order Generation
                    </Descriptions.Item>
                    <Descriptions.Item label="Timestamp">
                      {new Date(operationResult.timestamp).toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Work Orders Generated">
                      {operationResult.work_orders_generated}
                    </Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Descriptions bordered size="small" column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
                    <Descriptions.Item label="Operation">
                      Optimization Analysis
                    </Descriptions.Item>
                    <Descriptions.Item label="Timestamp">
                      {new Date(operationResult.timestamp).toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Components Analyzed">
                      {operationResult.components_analyzed}
                    </Descriptions.Item>
                    <Descriptions.Item label="Optimizations Needed">
                      {operationResult.optimizations_needed}
                    </Descriptions.Item>
                    <Descriptions.Item label="Optimizations Applied">
                      {operationResult.optimizations_applied}
                    </Descriptions.Item>
                    <Descriptions.Item label="Errors">
                      {operationResult.errors || 0}
                    </Descriptions.Item>
                  </Descriptions>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SchedulerControlPanel;