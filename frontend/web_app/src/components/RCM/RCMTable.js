import React, { useState, useEffect } from 'react';
import { Table, Button, Collapse, Tag, Spin, message } from 'antd';
import { DownOutlined, RightOutlined, PlusOutlined, ToolOutlined } from '@ant-design/icons';
import { fetchRCMAnalysis, generateWorkOrders } from '../../services/api';

const { Panel } = Collapse;

const RCMTable = ({ equipmentId }) => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState([]);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchRCMAnalysis(equipmentId);
        setData(result.rcm_analysis || []);
      } catch (error) {
        message.error('Failed to load RCM analysis');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [equipmentId]);
  
  const handleGenerateWorkOrders = async () => {
    try {
      setGenerating(true);
      const result = await generateWorkOrders(equipmentId);
      message.success(`Successfully generated ${result.work_orders.length} work orders`);
    } catch (error) {
      message.error('Failed to generate work orders');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };
  
  const renderFailureModes = (modes) => (
    <Table
      dataSource={modes}
      rowKey="id"
      pagination={false}
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
        },
        {
          title: 'Effects',
          dataIndex: 'effects',
          key: 'effects',
          width: '25%',
          render: (effects) => (
            <>
              {effects.map((effect, index) => (
                <div key={index}>
                  <Tag color={
                    effect.severity === 'Critical' ? 'red' :
                    effect.severity === 'High' ? 'orange' :
                    effect.severity === 'Medium' ? 'yellow' :
                    'green'
                  }>
                    {effect.severity}
                  </Tag>
                  {effect.description}
                </div>
              ))}
            </>
          ),
        },
        {
          title: 'Maintenance Actions',
          dataIndex: 'maintenance_actions',
          key: 'maintenance_actions',
          width: '40%',
          render: (actions) => (
            <>
              {actions.map((action, index) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  <strong>{action.title}</strong> ({action.maintenance_type})
                  <br />
                  <small>
                    Interval: {action.interval_days} days or {action.interval_hours} hours
                  </small>
                </div>
              ))}
            </>
          ),
        },
      ]}
    />
  );
  
  const renderFunctionalFailures = (failures) => (
    <Collapse
      bordered={false}
      expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <RightOutlined />}
    >
      {failures.map(failure => (
        <Panel 
          header={<strong>{failure.name}</strong>} 
          key={failure.id}
          extra={<small>{failure.failure_modes.length} failure modes</small>}
        >
          <p>{failure.description}</p>
          {renderFailureModes(failure.failure_modes)}
        </Panel>
      ))}
    </Collapse>
  );
  
  return (
    <div className="rcm-analysis-container">
      <div className="rcm-header">
        <h2>RCM Analysis</h2>
        <Button 
          type="primary" 
          icon={<ToolOutlined />} 
          onClick={handleGenerateWorkOrders}
          loading={generating}
        >
          Generate Work Orders
        </Button>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
        </div>
      ) : (
        <Collapse
          bordered={true}
          expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <RightOutlined />}
        >
          {data.map(functionItem => (
            <Panel 
              header={<strong>{functionItem.name}</strong>} 
              key={functionItem.id}
              extra={<small>{functionItem.functional_failures.length} functional failures</small>}
            >
              <p>{functionItem.description}</p>
              {renderFunctionalFailures(functionItem.functional_failures)}
            </Panel>
          ))}
        </Collapse>
      )}
    </div>
  );
};


export default RCMTable;