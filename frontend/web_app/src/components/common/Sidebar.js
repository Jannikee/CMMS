import React from 'react';
import { Layout, Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  OrderedListOutlined,
  ToolOutlined,
  SettingOutlined,
  FileTextOutlined,
  BarChartOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import './Sidebar.css';

const { Sider } = Layout;

const Sidebar = ({ collapsed, userRole }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Define menu items available to all users
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">Dashboard</Link>,
    },
    {
      key: '/work-orders',
      icon: <OrderedListOutlined />,
      label: <Link to="/work-orders">Work Orders</Link>,
    },
    {
      key: '/machines',
      icon: <ToolOutlined />,
      label: <Link to="/machines">Equipment</Link>,
    },
    {
      key: '/maintenance',
      icon: <ScheduleOutlined />,
      label: <Link to="/maintenance">Maintenance</Link>,
    },
  ];

  // Add admin/supervisor only menu items
  if (userRole === 'admin' || userRole === 'supervisor') {
    menuItems.push(
      {
        key: '/rcm',
        icon: <SettingOutlined />,
        label: <Link to="/rcm">RCM Analysis</Link>,
      },
      {
        key: '/reports',
        icon: <BarChartOutlined />,
        label: <Link to="/reports">Reports</Link>,
      }
    );
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      className="app-sidebar"
      width={220}
      breakpoint="lg"
    >
      <div className="logo">
        {collapsed ? <span>CMMS</span> : <span>CMMS System</span>}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[currentPath.split('/')[1] ? `/${currentPath.split('/')[1]}` : '/']}
        items={menuItems}
      />
    </Sider>
  );
};

export default Sidebar;