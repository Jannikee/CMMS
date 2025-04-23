// frontend/web_app/src/components/ComponentHierarchyTree.js
import React, { useState, useEffect } from 'react';
import { Tree, Spin, Empty, Typography, Button } from 'antd';
import { DownOutlined, PlusOutlined } from '@ant-design/icons';
import { fetchMachines, fetchSubsystems, fetchComponents } from '../../services/api';

const { Title } = Typography;

const HierarchyTree = ({ onSelect, onAddClick }) => {
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState([]);
  
  useEffect(() => {
    loadHierarchy();
  }, []);
  
  const loadHierarchy = async () => {
    try {
      setLoading(true);
      const response = await fetchMachines();
      const machines = response.machines || [];
      
      // Transform to tree structure
      const machineNodes = await Promise.all(machines.map(async machine => {
        // Get subsystems for this machine
        const subsystemResponse = await fetchSubsystems(machine.id);
        const subsystems = subsystemResponse.subsystems || [];
        
        // Create subsystem nodes
        const subsystemNodes = await Promise.all(subsystems.map(async subsystem => {
          // Get components for this subsystem
          const componentResponse = await fetchComponents(subsystem.id);
          const components = componentResponse.components || [];
          
          // Create component nodes
          const componentNodes = components.map(component => ({
            key: `component-${component.id}`,
            title: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{component.name} ({component.technical_id})</span>
                <Button 
                  type="text" 
                  icon={<PlusOutlined />} 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddClick && onAddClick('component', component.id, component);
                  }}
                />
              </div>
            ),
            isLeaf: true,
            data: { ...component, type: 'component' }
          }));
          
          return {
            key: `subsystem-${subsystem.id}`,
            title: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{subsystem.name} ({subsystem.technical_id})</span>
                <Button 
                  type="text" 
                  icon={<PlusOutlined />} 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddClick && onAddClick('subsystem', subsystem.id, subsystem);
                  }}
                />
              </div>
            ),
            children: componentNodes,
            data: { ...subsystem, type: 'subsystem' }
          };
        }));
        
        return {
          key: `machine-${machine.id}`,
          title: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{machine.name} ({machine.technical_id})</span>
              <Button 
                type="text" 
                icon={<PlusOutlined />} 
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddClick && onAddClick('machine', machine.id, machine);
                }}
              />
            </div>
          ),
          children: subsystemNodes,
          data: { ...machine, type: 'machine' }
        };
      }));
      
      setTreeData(machineNodes);
    } catch (error) {
      console.error('Error loading hierarchy:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelect = (selectedKeys, info) => {
    if (selectedKeys.length > 0 && onSelect) {
      onSelect(info.node.data);
    }
  };
  
  return (
    <div className="hierarchy-tree-container">
      <Title level={4}>Equipment Hierarchy</Title>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      ) : treeData.length > 0 ? (
        <Tree
          showLine
          switcherIcon={<DownOutlined />}
          defaultExpandedKeys={['machine-1']}
          onSelect={handleSelect}
          treeData={treeData}
        />
      ) : (
        <Empty description="No equipment found" />
      )}
    </div>
  );
};

export default HierarchyTree;