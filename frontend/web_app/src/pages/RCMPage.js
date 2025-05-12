// frontend/web_app/src/pages/RCMPage.js
import React, { useState, useEffect, useContext } from 'react';
import { Typography, Card, Tabs, Empty, Button, Spin, Alert, Select, Space } from 'antd';
import { UploadOutlined, BarChartOutlined, ReloadOutlined } from '@ant-design/icons';
import RCMTable from '../components/RCM/RCMTable';
import ImportExcelRCM from '../components/RCM/ImportExcelRCM';
import { fetchMachines } from '../services/machineService';
import { fetchRCMAnalysis, generateWorkOrders } from '../services/rcmService';
import { AuthContext } from '../context/AuthContext';

const { Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const RCMPage = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [rcmData, setRcmData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("analysis");
  
  // Load machines when the component mounts
  useEffect(() => {
    loadMachines();
  }, []);
  
  // Load RCM data when a machine is selected
  useEffect(() => {
    if (selectedMachine && activeTab === "analysis") {
      loadRCMData(selectedMachine);
    }
  }, [selectedMachine, activeTab]);
  
  const loadMachines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const machinesData = await fetchMachines();
      console.log("Machines loaded:", machinesData);
      
      if (Array.isArray(machinesData) && machinesData.length > 0) {
        setMachines(machinesData);
        // Set the first machine as selected by default
        setSelectedMachine(machinesData[0].id);
      } else {
        console.warn("No machines found or empty array returned");
      }
    } catch (err) {
      console.error("Error loading machines:", err);
      setError("Failed to load equipment list: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };
  
  const loadRCMData = async (machineId) => {
    if (!machineId) return;
    
    try {
      setDataLoading(true);
      setError(null);
      
      const rcmAnalysis = await fetchRCMAnalysis(machineId);
      console.log("RCM data loaded:", rcmAnalysis);
      
      setRcmData(rcmAnalysis);
    } catch (err) {
      console.error("Error loading RCM data:", err);
      setError("Failed to load RCM analysis: " + (err.message || "Unknown error"));
      setRcmData(null);
    } finally {
      setDataLoading(false);
    }
  };
  
  const handleMachineChange = (machineId) => {
    setSelectedMachine(machineId);
  };
  
  const handleTabChange = (key) => {
    setActiveTab(key);
  };
  
  const handleGenerateWorkOrders = async () => {
    if (!selectedMachine) return;
    
    try {
      setDataLoading(true);
      const result = await generateWorkOrders(selectedMachine);
      console.log("Work orders generated:", result);
      
      // Show success message
      Alert.success(`Successfully generated ${result.work_orders?.length || 0} work orders from RCM analysis`);
    } catch (err) {
      console.error("Error generating work orders:", err);
      Alert.error("Failed to generate work orders: " + (err.message || "Unknown error"));
    } finally {
      setDataLoading(false);
    }
  };
  
  const handleUploadSuccess = () => {
    // Reload RCM data for the selected machine
    if (selectedMachine) {
      loadRCMData(selectedMachine);
    }
  };
  
  const handleRefresh = () => {
    loadMachines();
  };

  return (
    <div className="rcm-container">
      <div className="page-header">
        <Title level={2}>RCM Analysis</Title>
        <Space>
          {(user.role === 'admin' || user.role === 'supervisor') && (
            <Button 
              type="primary" 
              icon={<UploadOutlined />}
              onClick={() => setActiveTab("import")}
            >
              Import RCM Data
            </Button>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Space>
      </div>
      
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          closable
        />
      )}
      
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <span>Select Equipment:</span>
          <Select
            placeholder="Select equipment"
            style={{ width: 300 }}
            value={selectedMachine}
            onChange={handleMachineChange}
            loading={loading}
            disabled={machines.length === 0}
          >
            {machines.map(machine => (
              <Option key={machine.id} value={machine.id}>
                {machine.name} ({machine.technical_id || 'No ID'})
              </Option>
            ))}
          </Select>
          
          {selectedMachine && activeTab === "analysis" && (
            <Button
              type="primary"
              onClick={handleGenerateWorkOrders}
              loading={dataLoading}
              disabled={!rcmData || rcmData.length === 0}
            >
              Generate Work Orders
            </Button>
          )}
        </Space>
      </Card>
      
      <Tabs defaultActiveKey="analysis" activeKey={activeTab} onChange={handleTabChange}>
        <TabPane 
          tab={<span><BarChartOutlined /> RCM Analysis</span>}
          key="analysis"
        >
          {loading ? (
            <div className="loading-container">
              <Spin size="large" />
            </div>
          ) : machines.length === 0 ? (
            <Empty 
              description="No equipment found in the system" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={handleRefresh}>Refresh</Button>
            </Empty>
          ) : dataLoading ? (
            <div className="loading-container">
              <Spin size="large" />
              <p>Loading RCM analysis...</p>
            </div>
          ) : selectedMachine ? (
            rcmData && rcmData.length > 0 ? (
              <RCMTable rcmData={rcmData} equipmentId={selectedMachine} />
            ) : (
              <Empty 
                description="No RCM analysis found for this equipment" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button 
                  type="primary"
                  onClick={() => setActiveTab("import")}
                >
                  Import RCM Data
                </Button>
              </Empty>
            )
          ) : (
            <Empty description="Select a machine to view RCM analysis" />
          )}
        </TabPane>
        
        <TabPane 
          tab={<span><UploadOutlined /> Import Data</span>}
          key="import"
        >
          <Card>
            <ImportExcelRCM 
              machines={machines} 
              onUploadSuccess={handleUploadSuccess} 
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default RCMPage;