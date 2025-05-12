// frontend/web_app/src/components/RCM/RCMTable.js
import React, { useState } from 'react';
import { Table, Button, Collapse, Tag, Spin, message, Card, Typography, Space, Empty } from 'antd';
import { DownOutlined, RightOutlined, ToolOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { generateWorkOrders } from '../../services/rcmService';

const { Panel } = Collapse;
const { Title, Text } = Typography;

const RCMTable = ({ rcmData, equipmentId }) => {
  const [generating, setGenerating] = useState(false);
  
  if (!rcmData || !Array.isArray(rcmData) || rcmData.length === 0) {
    return (
      <Empty description="No RCM analysis data available" />
    );
  }
  
  const handleGenerateWorkOrders = async () => {
    try {
      setGenerating(true);
      const result = await generateWorkOrders(equipmentId);
      message.success(`Successfully generated ${result.work_orders?.length || 0} work orders`);
    } catch (error) {
      message.error('Failed to generate work orders: ' + (error.message || 'Unknown error'));
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };
  
  const renderFailureModes = (modes) => {
    if (!modes || modes.length === 0) {
      return <Empty description="No failure modes defined" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
    
    return (
      <Table
        dataSource={modes}
        rowKey={(record) => `mode-${record.id || Math.random().toString(36).substr(2, 9)}`}
        pagination={false}
        size="small"
        columns={[
          {
            title: 'Failure Mode',
            dataIndex: 'name',
            key: 'name',
            width: '20%',
          },
          {
            title: 'Detection Method',
            dataIndex: 'detection_method',
            key: 'detection_method',
            width: '15%',
            render: (text) => text || 'Not specified'
          },
          {
            title: 'Effects',
            dataIndex: 'effects',
            key: 'effects',
            width: '25%',
            render: (effects) => {
              if (!effects || effects.length === 0) {
                return <Tag color="default">No effects defined</Tag>;
              }
              
              return (
                <>
                  {effects.map((effect, index) => (
                    <div key={`effect-${index}`} style={{ marginBottom: '8px' }}>
                      <Tag color={
                        effect.severity === 'Critical' ? 'red' :
                        effect.severity === 'High' ? 'orange' :
                        effect.severity === 'Medium' ? 'yellow' :
                        'green'
                      }>
                        {effect.severity || 'Unknown'}
                      </Tag>
                      {effect.description || 'No description'}
                    </div>
                  ))}
                </>
              );
            },
          },
          {
            title: 'Maintenance Actions',
            dataIndex: 'maintenance_actions',
            key: 'maintenance_actions',
            width: '40%',
            render: (actions) => {
              if (!actions || actions.length === 0) {
                return <Tag color="default">No actions defined</Tag>;
              }
              
              return (
                <>
                  {actions.map((action, index) => (
                    <div key={`action-${index}`} style={{ marginBottom: '8px' }}>
                      <strong>{action.title || 'Unnamed Action'}</strong>
                      {action.maintenance_type && ` (${action.maintenance_type})`}
                      <br />
                      <small>
                        {action.interval_days > 0 && `${action.interval_days} days`}
                        {action.interval_days > 0 && action.interval_hours > 0 && ' or '}
                        {action.interval_hours > 0 && `${action.interval_hours} hours`}
                        {!action.interval_days && !action.interval_hours && 'No interval specified'}
                      </small>
                    </div>
                  ))}
                </>
              );
            },
          },
        ]}
      />
    );
  };
  
  const renderFunctionalFailures = (failures) => {
    if (!failures || failures.length === 0) {
      return <Empty description="No functional failures defined" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
    
    return (
      <Collapse
        bordered={false}
        expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <RightOutlined />}
      >
        {failures.map(failure => (
          <Panel 
            header={<strong>{failure.name || 'Unnamed Failure'}</strong>} 
            key={`failure-${failure.id || Math.random().toString(36).substr(2, 9)}`}
            extra={
              <Space>
                <Text type="secondary">
                  {(failure.failure_modes?.length || 0) > 0 
                    ? `${failure.failure_modes.length} failure modes` 
                    : 'No failure modes'}
                </Text>
              </Space>
            }
          >
            {failure.description && <p>{failure.description}</p>}
            {renderFailureModes(failure.failure_modes)}
          </Panel>
        ))}
      </Collapse>
    );
  };
  
  return (
    <div className="rcm-analysis-container">
      <Card className="rcm-header-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4}>RCM Analysis</Title>
          <Button 
            type="primary" 
            icon={<ToolOutlined />} 
            onClick={handleGenerateWorkOrders}
            loading={generating}
          >
            Generate Work Orders
          </Button>
        </div>
        <Text type="secondary">
          This analysis helps identify potential failure modes and determine appropriate maintenance strategies.
        </Text>
      </Card>
      
      {rcmData.map((unit) => (
        <Card 
          key={`unit-${unit.id || Math.random().toString(36).substr(2, 9)}`}
          title={
            <Space>
              <span>{unit.name || 'Unnamed Unit'}</span>
              {unit.technical_id && <Tag>{unit.technical_id}</Tag>}
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          {unit.description && <p>{unit.description}</p>}
          
          {unit.functions && unit.functions.length > 0 ? (
            <Collapse
              bordered={true}
              expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <RightOutlined />}
            >
              {unit.functions.map(functionItem => (
                <Panel 
                  header={<strong>{functionItem.name || 'Unnamed Function'}</strong>} 
                  key={`function-${functionItem.id || Math.random().toString(36).substr(2, 9)}`}
                  extra={
                    <Space>
                      <Text type="secondary">
                        {(functionItem.functional_failures?.length || 0) > 0 
                          ? `${functionItem.functional_failures.length} functional failures` 
                          : 'No functional failures'}
                      </Text>
                    </Space>
                  }
                >
                  {functionItem.description && <p>{functionItem.description}</p>}
                  {renderFunctionalFailures(functionItem.functional_failures)}
                </Panel>
              ))}
            </Collapse>
          ) : (
            <Empty 
              description="No functions defined for this unit" 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
            />
          )}
        </Card>
      ))}
    </div>
  );
};

export default RCMTable;