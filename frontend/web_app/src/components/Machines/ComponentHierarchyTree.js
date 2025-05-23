// frontend/web_app/src/components/Machines/ComponentHierarchyTree.js
import React, { useState, useEffect } from 'react';
import { Tree, Spin, Empty, Typography, Button, message } from 'antd';
import { DownOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { fetchMachines, getComponentHierarchy } from '../../services/machineService';

const { Title } = Typography;

const ComponentHierarchyTree = ({ onSelect, onAddClick }) => {
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState([]);
  
  useEffect(() => {
    loadMachines();
  }, []);
  
  const loadMachines = async () => {
    try {
      setLoading(true);
      console.log("Fetching machines...");
      
      const machinesData = await fetchMachines();
      console.log("Machines data received:", machinesData);
      
      if (!machinesData || machinesData.length === 0) {
        console.log("No machines found or empty array returned");
        setTreeData([]);
        setLoading(false);
        return;
      }
      
      // Transform to tree structure
      const machineNodes = machinesData.map(machine => ({
        key: `machine-${machine.id}`,
        title: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>{machine.name} ({machine.technical_id || 'No ID'})</span>
            {onAddClick && (
              <Button 
                type="text" 
                icon={<PlusOutlined />} 
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddClick('machine', machine.id, machine);
                }}
              />
            )}
          </div>
        ),
        children: [],
        isLeaf: false,
        data: { ...machine, type: 'machine' }
      }));
      
      console.log("Machine nodes created:", machineNodes);
      setTreeData(machineNodes);
    } catch (error) {
      console.error('Error loading machines:', error);
      message.error('Failed to load equipment hierarchy');
    } finally {
      setLoading(false);
    }
  };
  
  const onLoadData = async ({ key, children }) => {
    console.log(`Loading data for node with key: ${key}, existing children count: ${children.length}`);
    
    if (children.length > 0) {
      console.log("Node already has children, not loading again");
      return Promise.resolve();
    }
    
    if (key.startsWith('machine-')) {
      const machineId = parseInt(key.replace('machine-', ''));
      console.log(`Loading hierarchy for machine ID: ${machineId}`);
      
      try {
        const result = await getComponentHierarchy(machineId);
        console.log("Hierarchy data received:", result);
        
        if (!result || !result.hierarchy || !result.hierarchy.subsystems) {
          console.log("No hierarchy data received or missing 'subsystems' property");
          return Promise.resolve();
        }
        
        // Process subsystems and their components
        const subsystems = result.hierarchy.subsystems || [];
        console.log(`Found ${subsystems.length} subsystems`);
        
        const subsystemNodes = subsystems.map(subsystem => {
          // Process components for this subsystem
          const componentNodes = (subsystem.components || []).map(component => ({
            key: `component-${component.id}`,
            title: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>{component.name} ({component.technical_id || 'No ID'})</span>
                {onAddClick && (
                  <Button 
                    type="text" 
                    icon={<PlusOutlined />} 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddClick('component', component.id, component);
                    }}
                  />
                )}
              </div>
            ),
            isLeaf: true,
            data: { ...component, type: 'component' }
          }));
          
          return {
            key: `subsystem-${subsystem.id}`,
            title: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>{subsystem.name} ({subsystem.technical_id || 'No ID'})</span>
                {onAddClick && (
                  <Button 
                    type="text" 
                    icon={<PlusOutlined />} 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddClick('subsystem', subsystem.id, subsystem);
                    }}
                  />
                )}
              </div>
            ),
            children: componentNodes,
            data: { ...subsystem, type: 'subsystem' }
          };
        });
        
        console.log("Created subsystem nodes:", subsystemNodes);
        
        // Update the tree data
        setTreeData(prevTreeData => {
          console.log("Updating tree data with new subsystems");
          const newTreeData = [...prevTreeData];
          const machineNode = newTreeData.find(node => node.key === key);
          if (machineNode) {
            console.log(`Found machine node with key ${key}, updating children`);
            machineNode.children = subsystemNodes;
          } else {
            console.warn(`Could not find machine node with key ${key} in tree data`);
          }
          return newTreeData;
        });
      } catch (error) {
        console.error(`Error loading hierarchy for machine ${machineId}:`, error);
        message.error('Failed to load subsystems and components');
      }
    }
    
    return Promise.resolve();
  };
  
  const handleSelect = (selectedKeys, info) => {
    if (selectedKeys.length > 0 && onSelect && info.node.data) {
      onSelect(info.node.data);
    }
  };
  
  const handleRefresh = () => {
    loadMachines();
    message.info('Refreshing equipment hierarchy');
  };
  
  return (
    <div className="hierarchy-tree-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4}>Equipment Hierarchy</Title>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={handleRefresh}
          title="Refresh hierarchy"
        >
          Refresh
        </Button>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      ) : treeData.length > 0 ? (
        <Tree
          showLine
          switcherIcon={<DownOutlined />}
          loadData={onLoadData}
          onSelect={handleSelect}
          treeData={treeData}
        />
      ) : (
        <Empty description="No equipment found" />
      )}
    </div>
  );
};

export default ComponentHierarchyTree;