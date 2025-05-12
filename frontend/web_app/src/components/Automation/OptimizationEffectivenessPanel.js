
import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Typography, Spin, Tag, Space, Statistic, Row, Col, Select, Divider, Progress, Alert } from 'antd';
import { ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, LineChartOutlined } from '@ant-design/icons';
import { validateOptimizationEffectiveness } from '../../services/optimizationService';
import './Automation.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const OptimizationEffectivenessPanel = () => {
  const [loading, setLoading] = useState(false);
  const [effectivenessData, setEffectivenessData] = useState(null);
  const [days, setDays] = useState(90);
  
  useEffect(() => {
    loadEffectivenessData();
  }, [days]);
  
  const loadEffectivenessData = async () => {
    try {
      setLoading(true);
      
      const result = await validateOptimizationEffectiveness(days);
      setEffectivenessData(result);
      
    } catch (error) {
      console.error('Error loading effectiveness data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = () => {
    loadEffectivenessData();
  };
  
  const handleDaysChange = (value) => {
    setDays(value);
  };
  
  const renderPercentageChange = (value, positive = true) => {
    const color = positive ? 
      (value >= 0 ? 'green' : 'red') : 
      (value >= 0 ? 'red' : 'green');
    
    const icon = positive ?
      (value >= 0 ? <CheckCircleOutlined /> : <CloseCircleOutlined />) :
      (value >= 0 ? <CloseCircleOutlined /> : <CheckCircleOutlined />);
      
    return (
      <Tag color={color} icon={icon}>
        {value >= 0 ? '+' : ''}{value.toFixed(1)}%
      </Tag>
    );
  };
  
  const columns = [
    {
      title: 'Component',
      dataIndex: 'component_name',
      key: 'component_name',
    },
    {
      title: 'Applied Date',
      dataIndex: 'applied_timestamp',
      key: 'applied_timestamp',
      render: timestamp => new Date(timestamp).toLocaleDateString(),
    },
    {
      title: 'Failures Before',
      key: 'failures_before',
      render: (_, record) => (
        <span>
          {record.failures_before} ({record.failures_per_day_before.toFixed(3)}/day)
        </span>
      ),
    },
    {
      title: 'Failures After',
      key: 'failures_after',
      render: (_, record) => (
        <span>
          {record.failures_after} ({record.failures_per_day_after.toFixed(3)}/day)
        </span>
      ),
    },
    {
      title: 'Failure Reduction',
      dataIndex: 'failure_reduction_percent',
      key: 'failure_reduction_percent',
      render: value => renderPercentageChange(value, true),
      sorter: (a, b) => a.failure_reduction_percent - b.failure_reduction_percent,
    },
    {
      title: 'Maintenance Before',
      key: 'maintenance_before',
      render: (_, record) => (
        <span>
          {record.maintenance_before} ({record.maintenance_per_day_before.toFixed(3)}/day)
        </span>
      ),
    },
    {
      title: 'Maintenance After',
      key: 'maintenance_after',
      render: (_, record) => (
        <span>
          {record.maintenance_after} ({record.maintenance_per_day_after.toFixed(3)}/day)
        </span>
      ),
    },
    {
      title: 'Maintenance Reduction',
      dataIndex: 'maintenance_reduction_percent',
      key: 'maintenance_reduction_percent',
      render: value => renderPercentageChange(value, true),
      sorter: (a, b) => a.maintenance_reduction_percent - b.maintenance_reduction_percent,
    },
    {
      title: 'Effective',
      dataIndex: 'was_effective',
      key: 'was_effective',
      render: effective => (
        effective ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>Yes</Tag>
        ) : (
          <Tag color="red" icon={<CloseCircleOutlined />}>No</Tag>
        )
      ),
      filters: [
        { text: 'Effective', value: true },
        { text: 'Not Effective', value: false },
      ],
      onFilter: (value, record) => record.was_effective === value,
    },
  ];
  
  return (
    <div className="optimization-effectiveness-panel">
      <Card 
        title={
          <Space>
            <LineChartOutlined /> 
            <span>Optimization Effectiveness Analysis</span>
          </Space>
        }
        extra={
          <Space>
            <Select 
              value={days} 
              onChange={handleDaysChange}
              style={{ width: 120 }}
            >
              <Option value={30}>Last 30 days</Option>
              <Option value={90}>Last 90 days</Option>
              <Option value={180}>Last 180 days</Option>
              <Option value={365}>Last 365 days</Option>
            </Select>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <Paragraph>
          This panel analyzes the effectiveness of previous interval optimizations by comparing 
          failure rates and maintenance frequencies before and after the adjustments were applied.
        </Paragraph>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <Spin size="large" />
          </div>
        ) : effectivenessData ? (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Optimizations Evaluated"
                    value={effectivenessData.optimizations_evaluated}
                    suffix={`of ${effectivenessData.optimizations_evaluated + (effectivenessData.errors || 0)}`}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Effective Optimizations"
                    value={effectivenessData.effective_optimizations}
                    suffix={`(${(effectivenessData.effectiveness_rate * 100).toFixed(1)}%)`}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <div style={{ textAlign: 'center' }}>
                    <Progress 
                      type="dashboard" 
                      percent={Math.round(effectivenessData.effectiveness_rate * 100)} 
                      status={
                        effectivenessData.effectiveness_rate >= 0.7 ? "success" :
                        effectivenessData.effectiveness_rate >= 0.5 ? "normal" : "exception"
                      }
                    />
                    <div style={{ marginTop: 8 }}>Effectiveness Rate</div>
                  </div>
                </Card>
              </Col>
            </Row>
            
            {effectivenessData.results && effectivenessData.results.length > 0 ? (
              <Table 
                dataSource={effectivenessData.results.filter(r => !r.error)} 
                columns={columns}
                rowKey="optimization_id"
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Alert
                message="No Results"
                description="No optimization effectiveness data is available for the selected period. Try selecting a longer time period or wait until more optimizations have been applied."
                type="info"
                showIcon
              />
            )}
            
            {effectivenessData.results && effectivenessData.results.some(r => r.error) && (
              <div style={{ marginTop: 16 }}>
                <Divider>Errors</Divider>
                <Alert
                  message={`${effectivenessData.results.filter(r => r.error).length} optimizations could not be evaluated`}
                  description="Some optimizations could not be evaluated due to errors in data retrieval or analysis."
                  type="warning"
                  showIcon
                />
              </div>
            )}
          </>
        ) : (
          <Alert
            message="No Data Available"
            description="No optimization effectiveness data is available. Try selecting a different time period or ensure that optimizations have been applied."
            type="info"
            showIcon
          />
        )}
      </Card>
    </div>
  );
};

export default OptimizationEffectivenessPanel;