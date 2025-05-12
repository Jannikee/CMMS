import React, { useState, useEffect } from 'react';
import { Tabs, Typography, Select, Space, Card } from 'antd';
import { ToolOutlined, SettingOutlined, LineChartOutlined } from '@ant-design/icons';
import IntervalOptimizationPanel from '../components/Automation/IntervalOptimizationPanel';
import OptimizationEffectivenessPanel from '../components/Automation/OptimizationEffectivenessPanel';
import SchedulerControlPanel from '../components/Automation/SchedulerControlPanel';
import axios from 'axios';

const { Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const IntervalOptimizationPage = () => {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  
  useEffect(() => {
    const loadMachines = async () => {
      try {
        const response = await axios.get('/api/machines');
        setMachines(response.data.machines || []);
        
        if (response.data.machines && response.data.machines.length > 0) {
          setSelectedMachine(response.data.machines[0].id);
        }
      } catch (error) {
        console.error('Error loading machines:', error);
      }
    };
    
    loadMachines();
  }, []);
  
  return (
    <div className="interval-optimization-page">
      <div className="page-header">
        <Title level={2}>Maintenance Interval Optimization</Title>
      </div>
      
      <Card>
        <Tabs defaultActiveKey="optimization">
          <TabPane 
            tab={
              <span>
                <ToolOutlined />
                Interval Optimization
              </span>
            } 
            key="optimization"
          >
            <div className="machine-selector" style={{ marginBottom: 16 }}>
              <Space>
                <span>Select Machine:</span>
                <Select
                  style={{ width: 300 }}
                  value={selectedMachine}
                  onChange={setSelectedMachine}
                  disabled={machines.length === 0}
                >
                  {machines.map(machine => (
                    <Option key={machine.id} value={machine.id}>
                      {machine.name} ({machine.technical_id})
                    </Option>
                  ))}
                </Select>
              </Space>
            </div>
            
            <IntervalOptimizationPanel machineId={selectedMachine} />
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <LineChartOutlined />
                Effectiveness Analysis
              </span>
            } 
            key="effectiveness"
          >
            <OptimizationEffectivenessPanel />
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <SettingOutlined />
                Scheduler Control
              </span>
            } 
            key="scheduler"
          >
            <SchedulerControlPanel />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default IntervalOptimizationPage;