import React from 'react';
import { Layout, Menu, Button, Dropdown, Space, Avatar } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  UserOutlined, 
  LogoutOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import './Header.css';

const { Header: AntHeader } = Layout;

const Header = ({ collapsed, setCollapsed, userName, onLogout }) => {
  const location = useLocation();
  
  // Get page title based on current path
  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/work-orders')) return 'Work Orders';
    if (path.startsWith('/machines')) return 'Equipment';
    if (path.startsWith('/maintenance')) return 'Maintenance';
    if (path.startsWith('/rcm')) return 'RCM Analysis';
    if (path.startsWith('/reports')) return 'Reports';
    
    return 'CMMS System';
  };
  
  // User dropdown menu items
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: onLogout,
    },
  ];
  
  return (
    <AntHeader className="app-header">
      <div className="header-left">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          className="trigger-button"
        />
        <h1 className="page-title">{getPageTitle()}</h1>
      </div>
      
      <div className="header-right">
        <Dropdown
          menu={{ items: userMenuItems }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Space className="user-dropdown">
            <Avatar icon={<UserOutlined />} />
            <span className="username">{userName}</span>
          </Space>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;