// frontend/web_app/src/pages/RCMPage.js - FIXED VERSION
import React, { useState, useEffect, useContext } from 'react';
import { Typography, Card, Tabs, Empty, Button, Spin, Alert, Select, Space, message } from 'antd';
import { UploadOutlined, BarChartOutlined, ReloadOutlined } from '@ant-design/icons';
import RCMTable from '../components/RCM/RCMTable';
import ImportExcelRCM from '../components/RCM/ImportExcelRCM';
import { fetchMachines } from '../services/machineService';
import { fetchRCMAnalysis } from '../services/rcmService';
import { AuthContext } from '../context/AuthContext';

const { Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const RCMPage = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [rcmData, setRcmData] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("analysis");
  
  // First load machines when component mounts
  useEffect(() => {
  // Immediately Invoked Function Expression (IIFE) to allow async/await in useEffect
    (async () => {
      console.log("Component mounted - starting to load machines");
      try {
        setLoading(true);
        const machinesData = await fetchMachines();
        console.log("Machines loaded on mount:", machinesData);
        
        if (Array.isArray(machinesData) && machinesData.length > 0) {
          setMachines(machinesData);
          setSelectedMachine(machinesData[0].id);
        } else {
          console.log("No machines found in database");
          message.info("No machines found. Please add machines to view RCM analysis.");
        }
      } catch (err) {
        console.error("Error loading machines on mount:", err);
        message.error("Failed to load machines: " + (err.message || "Unknown error"));
      } finally {
        setLoading(false);
      }
    })();
  }, []); 
  
  // Then load RCM data when both a machine is selected AND we're on the analysis tab
  useEffect(() => {
    if (selectedMachine && activeTab === "analysis") {
      console.log(`Selected machine changed to ${selectedMachine} and tab is ${activeTab} - loading RCM data`);
      loadRCMData(selectedMachine);
    }
  }, [selectedMachine, activeTab]);
  
  const loadMachines = async () => {
    console.log("Loading machines...");
    try {
      setLoading(true);
      setError(null);
      
      const machinesData = await fetchMachines();
      console.log("Machines loaded:", machinesData);
      
      if (Array.isArray(machinesData) && machinesData.length > 0) {
        setMachines(machinesData);
        // Set the first machine as selected by default
        const firstMachineId = machinesData[0]?.id;
        console.log(`Setting first machine as selected: ${firstMachineId}`);
        setSelectedMachine(firstMachineId);
      } else {
        console.warn("No machines found or empty array returned");
        setMachines([]);
        setSelectedMachine(null);
      }
    } catch (err) {
      console.error("Error loading machines:", err);
      setError("Failed to load equipment list: " + (err.message || "Unknown error"));
      setMachines([]);
      setSelectedMachine(null);
    } finally {
      setLoading(false);
    }
  };
  
  const loadRCMData = async (machineId) => {
    if (!machineId) {
      console.warn("Cannot load RCM data - no machine ID provided");
      return;
    }
    
    console.log(`Loading RCM data for machine ${machineId}...`);
    try {
      setDataLoading(true);
      setError(null);
      
      const rcmAnalysis = await fetchRCMAnalysis(machineId);
      console.log("RCM data loaded:", rcmAnalysis);
      
      setRcmData(rcmAnalysis || []);
    } catch (err) {
      console.error("Error loading RCM data:", err);
      setError("Failed to load RCM analysis: " + (err.message || "Unknown error"));
      setRcmData([]);
    } finally {
      setDataLoading(false);
    }
  };
  
  const handleMachineChange = (machineId) => {
    console.log(`Machine selection changed to: ${machineId}`);
    setSelectedMachine(machineId);
  };
  
  const handleTabChange = (key) => {
    console.log(`Tab changed to: ${key}`);
    setActiveTab(key);
  };
  
  const handleUploadSuccess = () => {
    // Reload RCM data for the selected machine
    if (selectedMachine) {
      console.log("Upload successful - reloading RCM data");
      loadRCMData(selectedMachine);
      // Also switch back to analysis tab
      setActiveTab("analysis");
    }
  };
  
  const handleRefresh = () => {
    console.log("Refresh triggered");
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
          onClose={() => setError(null)}
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
            notFoundContent={loading ? <Spin size="small" /> : "No equipment found"}
          >
            {machines.map(machine => (
              <Option key={machine.id} value={machine.id}>
                {machine.name} ({machine.technical_id || 'No ID'})
              </Option>
            ))}
          </Select>
        </Space>
      </Card>
      
      <Tabs defaultActiveKey="analysis" activeKey={activeTab} onChange={handleTabChange}>
        <TabPane 
          tab={<span><BarChartOutlined /> RCM Analysis</span>}
          key="analysis"
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <p>Loading equipment data...</p>
            </div>
          ) : machines.length === 0 ? (
            <Empty 
              description="No equipment found in the system" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={handleRefresh}>Refresh Equipment List</Button>
            </Empty>
          ) : dataLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <p>Loading RCM analysis data...</p>
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
            <Empty 
              description="Please select equipment to view RCM analysis, testing" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
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