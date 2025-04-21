// frontend/web_app/src/components/ComponentHierarchyTree.js
import React, { useState, useEffect } from 'react';
import { Tree, Typography, Spin, Empty } from 'antd';
import { getComponentHierarchy } from '../services/api';

const { Title, Text } = Typography;

const ComponentHierarchyTree = ({ equipmentId }) => {
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState([]);
  
  useEffect(() => {
    if (!equipmentId) return;
    
    const loadHierarchy = async () => {
      try {
        setLoading(true);
        const data = await getComponentHierarchy(equipmentId);
        
        // Transform hierarchy data to format expected by Ant Design Tree
        const transformedData = transformHierarchyToTreeData(data.hierarchy);
        setTreeData(transformedData);
      } catch (error) {
        console.error('Error loading component hierarchy:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadHierarchy();
  }, [equipmentId]);
  
  const transformHierarchyToTreeData = (hierarchy) => {
    if (!hierarchy) return [];
    
    // Transform root node
    const rootNode = {
      key: `machine-${hierarchy.id}`,
      title: (
        <span>
          <strong>{hierarchy.station_number}</strong> - {hierarchy.name}
          {hierarchy.technical_name && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              ({hierarchy.technical_name})
            </Text>
          )}
        </span>
      ),
      children: []
    };
    
    // Transform children recursively
    if (hierarchy.children && hierarchy.children.length > 0) {
      rootNode.children = hierarchy.children.map(child => transformNodeToTreeNode(child));
    }
    
    return [rootNode];
  };
  
  const transformNodeToTreeNode = (node) => {
    const treeNode = {
      key: `component-${node.id}`,
      title: (
        <span>
          <strong>{node.station_number}</strong> - {node.name}
          {node.technical_name && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              ({node.technical_name})
            </Text>
          )}
        </span>
      )
    };
    
    if (node.children && node.children.length > 0) {
      treeNode.children = node.children.map(child => transformNodeToTreeNode(child));
    }
    
    return treeNode;
  };
  
  return (
    <div className="component-hierarchy-container">
      <Title level={4}>Component Structure</Title>
      
      {loading ? (
        <div className="loading-container">
          <Spin />
        </div>
      ) : treeData.length > 0 ? (
        <Tree
          showLine
          defaultExpandAll
          treeData={treeData}
        />
      ) : (
        <Empty description="No component structure available" />
      )}
    </div>
  );
};

export default ComponentHierarchyTree;