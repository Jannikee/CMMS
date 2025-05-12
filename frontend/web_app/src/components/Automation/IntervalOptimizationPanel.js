// frontend/web_app/src/services/optimizationService.js
// src/services/optimizationService.js
import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Switch, Tooltip, Modal, message, Typography, Spin, Tag, Space, Descriptions, Select } from 'antd';
import { SettingOutlined, HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import ComponentSettingsForm from './ComponentSettingsForm';
import { 
  analyzeComponent, 
  applyOptimization, 
  getAdjustmentHistory 
} from '../../services/optimizationService';
import './Automation.css';

const { Title, Text } = Typography;
const { Option } = Select;

const IntervalOptimizationPanel = ({ machineId }) => {
  const [loading, setLoading] = useState(false);
  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [adjustmentHistory, setAdjustmentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analysisMethod, setAnalysisMethod] = useState('weibull');
  
  useEffect(() => {
    if (machineId) {
      loadComponents();
    }
  }, [machineId]);
  
  const loadComponents = async () => {
    try {
      setLoading(true);
      // Use your existing API service to load components
      const response = await fetch(`/api/machines/${machineId}/components`);
      const data = await response.json();
      setComponents(data.components || []);
    } catch (error) {
      console.error('Error loading components:', error);
      message.error('Failed to load components');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAnalyzeComponent = async (componentId) => {
    try {
      setLoading(true);
      setSelectedComponent(componentId);
      setOptimization(null);
      
      const result = await analyzeComponent(
        componentId, 
        analysisMethod === 'kaplan_meier'
      );
      
      setOptimization(result);
      
      if (!result.recommendation.needs_adjustment) {
        message.info('No interval adjustments needed for this component');
      }
    } catch (error) {
      console.error('Error analyzing component:', error);
      message.error('Failed to analyze component');
    } finally {
      setLoading(false);
    }
  };
  
  const handleApplyOptimization = async (analysisId) => {
    try {
      setLoading(true);
      
      const result = await applyOptimization(analysisId);
      
      if (result.success) {
        message.success('Maintenance intervals updated successfully');
        
        // Refresh the optimization data
        if (optimization) {
          const updatedOptimization = {...optimization};
          updatedOptimization.recommendation.applied = true;
          setOptimization(updatedOptimization);
        }
        
        // Refresh adjustment history if visible
        if (showHistory && selectedComponent) {
          loadAdjustmentHistory(selectedComponent);
        }
      }
    } catch (error) {
      console.error('Error applying optimization:', error);
      message.error('Failed to update maintenance intervals');
    } finally {
      setLoading(false);
    }
  };
  
  const loadAdjustmentHistory = async (componentId) => {
    try {
      setLoading(true);
      
      const result = await getAdjustmentHistory(componentId);
      setAdjustmentHistory(result.adjustments || []);
      setShowHistory(true);
      
    } catch (error) {
      console.error('Error loading adjustment history:', error);
      message.error('Failed to load adjustment history');
      setShowHistory(false);
    } finally {
      setLoading(false);
    }
  };
  
  const handleShowHistory = () => {
    if (selectedComponent) {
      if (showHistory) {
        setShowHistory(false);
      } else {
        loadAdjustmentHistory(selectedComponent);
      }
    } else {
      message.warning('Please select a component first');
    }
  };
  
  const handleShowSettings = () => {
    if (selectedComponent) {
      setShowSettings(true);
    } else {
      message.warning('Please select a component first');
    }
  };
  
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
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small" 
          onClick={() => handleAnalyzeComponent(record.id)}
        >
          Analyze
        </Button>
      ),
    },
  ];
  
  const intervalColumns = [
    {
      title: 'Action',
      dataIndex: 'action_title',
      key: 'action_title',
    },
    {
      title: 'Current Interval',
      key: 'current_interval',
      render: (_, record) => (
        <span>
          {record.current_interval} {record.interval_type}
        </span>
      ),
    },
    {
      title: 'Recommended Interval',
      key: 'recommended_interval',
      render: (_, record) => (
        <span>
          {record.recommended_interval} {record.interval_type}
          {record.needs_adjustment && (
            <Tag 
              color={record.recommended_interval > record.current_interval ? 'green' : 'orange'}
              style={{ marginLeft: 8 }}
            >
              {record.recommended_interval > record.current_interval ? 'Increase' : 'Decrease'}
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: 'Change Needed',
      key: 'needs_adjustment',
      render: (_, record) => (
        <span>
          {record.needs_adjustment ? (
            <Tag color="red">Yes</Tag>
          ) : (
            <Tag color="green">No</Tag>
          )}
        </span>
      ),
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      render: confidence => `${Math.round(confidence * 100)}%`,
    },
  ];
  
  const historyColumns = [
    {
      title: 'Date',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: timestamp => new Date(timestamp).toLocaleString(),
    },
    {
      title: 'Maintenance Action',
      dataIndex: 'maintenance_title',
      key: 'maintenance_title',
    },
    {
      title: 'Old Interval',
      key: 'old_interval',
      render: (_, record) => (
        <span>
          {record.old_interval_hours ? `${record.old_interval_hours} hours` : ''}
          {record.old_interval_days ? `${record.old_interval_days} days` : ''}
        </span>
      ),
    },
    {
      title: 'New Interval',
      key: 'new_interval',
      render: (_, record) => (
        <span>
          {record.new_interval_hours ? `${record.new_interval_hours} hours` : ''}
          {record.new_interval_days ? `${record.new_interval_days} days` : ''}
        </span>
      ),
    },
    {
      title: 'Changed By',
      dataIndex: 'user',
      key: 'user',
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
  ];
  
  return (
    <div className="interval-optimization-panel">
      <Card title="Maintenance Interval Optimization" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <Select 
            value={analysisMethod}
            onChange={setAnalysisMethod}
            style={{ width: 200 }}
          >
            <Option value="weibull">Weibull Analysis</Option>
            <Option value="kaplan_meier">Kaplan-Meier Analysis</Option>
          </Select>
          
          {selectedComponent && (
            <>
              <Button 
                icon={<HistoryOutlined />} 
                onClick={handleShowHistory}
                type={showHistory ? 'primary' : 'default'}
              >
                Adjustment History
              </Button>
              
              <Button 
                icon={<SettingOutlined />} 
                onClick={handleShowSettings}
              >
                Settings
              </Button>
            </>
          )}
        </Space>
        
        <Table
          dataSource={components}
          columns={componentColumns}
          rowKey="id"
          size="small"
          loading={loading}
          pagination={{ pageSize: 5 }}
        />
      </Card>
      
      {optimization && (
        <Card 
          title={`Optimization Analysis - ${optimization.component_name}`}
          extra={
            <Space>
              <Text>Confidence: {Math.round(optimization.recommendation.confidence * 100)}%</Text>
              <Button 
                type="primary"
                onClick={() => handleApplyOptimization(optimization.analysis_id)}
                disabled={!optimization.recommendation.needs_adjustment || optimization.recommendation.applied}
              >
                Apply Recommended Changes
              </Button>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Descriptions title="Analysis Details" bordered size="small" column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
            <Descriptions.Item label="Analysis Method">
              {optimization.analysis_method === 'kaplan_meier' ? 'Kaplan-Meier Survival Analysis' : 'Weibull Analysis'}
            </Descriptions.Item>
            <Descriptions.Item label="Failures Analyzed">
              {optimization.recommendation.analysis_data.failure_count}
            </Descriptions.Item>
            <Descriptions.Item label="Maintenance Events">
              {optimization.recommendation.analysis_data.maintenance_count}
            </Descriptions.Item>
            <Descriptions.Item label="Operating Hours">
              {optimization.recommendation.analysis_data.operating_hours}
            </Descriptions.Item>
            {optimization.analysis_method === 'weibull' && optimization.recommendation.analysis_data.weibull_shape && (
              <>
                <Descriptions.Item label="Weibull Shape">
                  {optimization.recommendation.analysis_data.weibull_shape.toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="Weibull Scale">
                  {optimization.recommendation.analysis_data.weibull_scale.toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="R-Squared">
                  {optimization.recommendation.analysis_data.weibull_r_squared.toFixed(3)}
                </Descriptions.Item>
              </>
            )}
            {optimization.analysis_method === 'kaplan_meier' && optimization.recommendation.analysis_data.median_survival && (
              <Descriptions.Item label="Median Survival Time">
                {optimization.recommendation.analysis_data.median_survival.toFixed(2)} hours
              </Descriptions.Item>
            )}
          </Descriptions>
          
          <div style={{ marginTop: 16 }}>
            <Title level={5}>Interval Recommendations</Title>
            {optimization.recommendation.needs_adjustment ? (
              <div style={{ marginBottom: 8 }}>
                <Tag color="red" icon={<CheckCircleOutlined />}>Adjustment Required</Tag>
                <Text style={{ marginLeft: 8 }}>{optimization.recommendation.reason}</Text>
              </div>
            ) : (
              <div style={{ marginBottom: 8 }}>
                <Tag color="green" icon={<CloseCircleOutlined />}>No Adjustment Required</Tag>
                <Text style={{ marginLeft: 8 }}>{optimization.recommendation.reason || "Current maintenance intervals are appropriate"}</Text>
              </div>
            )}
            
            <Table
              dataSource={optimization.recommendation.recommended_intervals}
              columns={intervalColumns}
              rowKey="action_id"
              size="small"
              pagination={false}
            />
          </div>
        </Card>
      )}
      
      {showHistory && (
        <Card title="Interval Adjustment History">
          <Table
            dataSource={adjustmentHistory}
            columns={historyColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 5 }}
          />
        </Card>
      )}
      
      <Modal
        title="Component Settings"
        visible={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={null}
        width={700}
      >
        <ComponentSettingsForm 
          componentId={selectedComponent} 
          onClose={() => setShowSettings(false)} 
        />
      </Modal>
    </div>
  );
};

export default IntervalOptimizationPanel;