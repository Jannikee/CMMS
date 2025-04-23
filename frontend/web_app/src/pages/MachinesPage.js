import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Typography, 
  Spin, 
  message, 
  Tabs, 
  List, 
  Avatar, 
  Space, 
  Input,
  Modal
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  ToolOutlined,
  QrcodeOutlined,
  BarChartOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';
import { fetchMachines } from '../services/machineService';
import MachineDetail from '../components/Machines/MachineDetail';
import MachineForm from '../components/Machines/MachineForm';
import ComponentHierarchyTree from '../components/Machines/ComponentHierarchyTree';
import ImportExcelTP from '../components/Machines/ImportExcelTP';
import './MachinesPage.css';

const { Title } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;

const MachinesPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const [filteredMachines, setFilteredMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [importModalVisible, setImportModalVisible] = useState(false);

  // Load machines on component mount
  useEffect(() => {
    const loadMachines = async () => {
      try {
        setLoading(true);
        const data = await fetchMachines();
        setMachines(data);
        setFilteredMachines(data);
      } catch (error) {
        message.error('Failed to load equipment data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    loadMachines();
  }, []);

  // Filter machines based on search text
  useEffect(() => {
    if (searchText) {
      const filtered = machines.filter(machine => 
        machine.name.toLowerCase().includes(searchText.toLowerCase()) ||
        machine.technical_id.toLowerCase().includes(searchText.toLowerCase()) ||
        machine.location.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredMachines(filtered);
    } else {
      setFilteredMachines(machines);
    }
  }, [machines, searchText]);

  // Handle machine selection
  const handleMachineClick = (machineId) => {
    navigate(`/machines/${machineId}`);
  };

  // Navigate to create machine form
  const handleCreateMachine = () => {
    navigate('/machines/create');
  };

  // Show import modal
  const showImportModal = () => {
    setImportModalVisible(true);
  };

  // Handle successful import
  const handleImportSuccess = async () => {
    setImportModalVisible(false);
    try {
      setLoading(true);
      const data = await fetchMachines();
      setMachines(data);
      setFilteredMachines(data);
      message.success('Component structure imported successfully');
    } catch (error) {
      message.error('Failed to refresh equipment data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Main machines list view
  const MachinesListView = () => (
    <>
      <div className="page-header">
        <Title level={2}>Equipment</Title>
        
        <Space>
          {(user.role === 'admin' || user.role === 'supervisor') && (
            <>
              <Button 
                icon={<QrcodeOutlined />} 
                onClick={showImportModal}
              >
                Import Structure
              </Button>
              
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleCreateMachine}
              >
                Add Equipment
              </Button>
            </>
          )}
        </Space>
      </div>
      
      <div className="search-container">
        <Search 
          placeholder="Search by name, ID, or location..." 
          allowClear
          enterButton={<SearchOutlined />}
          onSearch={value => setSearchText(value)}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 400 }}
        />
      </div>
      
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
        </div>
      ) : (
        <Tabs defaultActiveKey="card" className="machine-tabs">
          <TabPane tab="Card View" key="card">
            <div className="card-grid">
              {filteredMachines.map(machine => (
                <Card 
                  key={machine.id} 
                  className="machine-card"
                  hoverable
                  onClick={() => handleMachineClick(machine.id)}
                  cover={
                    <div className="machine-card-cover">
                      <SettingOutlined className="machine-icon" />
                    </div>
                  }
                >
                  <Card.Meta
                    title={machine.name}
                    description={
                      <div className="machine-card-info">
                        <p><strong>ID:</strong> {machine.technical_id}</p>
                        <p><strong>Location:</strong> {machine.location}</p>
                        <p><strong>Subsystems:</strong> {machine.subsystem_count || 0}</p>
                        {machine.hour_counter > 0 && (
                          <p><strong>Hours:</strong> {machine.hour_counter}</p>
                        )}
                      </div>
                    }
                  />
                </Card>
              ))}
            </div>
            
            {filteredMachines.length === 0 && (
              <div className="empty-state">
                <Title level={4}>No equipment found</Title>
                <p>Try adjusting your search or add new equipment.</p>
                
                {(user.role === 'admin' || user.role === 'supervisor') && (
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={handleCreateMachine}
                  >
                    Add Equipment
                  </Button>
                )}
              </div>
            )}
          </TabPane>
          
          <TabPane tab="List View" key="list">
            <List
              className="machine-list"
              itemLayout="horizontal"
              dataSource={filteredMachines}
              renderItem={machine => (
                <List.Item
                  actions={[
                    <Button 
                      key="view" 
                      type="link"
                      onClick={() => handleMachineClick(machine.id)}
                    >
                      View
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<ToolOutlined />} />}
                    title={<a onClick={() => handleMachineClick(machine.id)}>{machine.name}</a>}
                    description={
                      <div>
                        <p><strong>ID:</strong> {machine.technical_id} | <strong>Location:</strong> {machine.location}</p>
                        <p><strong>Subsystems:</strong> {machine.subsystem_count || 0} | {machine.hour_counter > 0 && <span><strong>Hours:</strong> {machine.hour_counter}</span>}</p>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
            
            {filteredMachines.length === 0 && (
              <div className="empty-state">
                <Title level={4}>No equipment found</Title>
                <p>Try adjusting your search or add new equipment.</p>
                
                {(user.role === 'admin' || user.role === 'supervisor') && (
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={handleCreateMachine}
                  >
                    Add Equipment
                  </Button>
                )}
              </div>
            )}
          </TabPane>
          
          <TabPane tab="Hierarchy View" key="hierarchy">
            <ComponentHierarchyTree />
          </TabPane>
        </Tabs>
      )}
      
      <Modal
        title="Import Technical Structure"
        visible={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={null}
        width={700}
      >
        <ImportExcelTP 
          machines={machines} 
          onUploadSuccess={handleImportSuccess} 
        />
      </Modal>
    </>
  );

  return (
    <div className="machines-container">
      <Routes>
        <Route path="/" element={<MachinesListView />} />
        <Route path="/create" element={<MachineForm />} />
        <Route path="/:id" element={<MachineDetail />} />
        <Route path="/:id/edit" element={<MachineForm isEditing />} />
      </Routes>
    </div>
  );
};

export default MachinesPage;