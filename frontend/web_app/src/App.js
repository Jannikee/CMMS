
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Spin, message } from 'antd';
import { AuthContext } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import MachinesPage from './pages/MachinesPage';
import MaintenancePage from './pages/MaintenancePage';
import RCMPage from './pages/RCMPage';
import ReportsPage from './pages/ReportsPage';
import NotFoundPage from './pages/NotFoundPage';

// Components
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';

// Services
import { checkAuthStatus } from './services/AuthService';

import './App.css';

const { Content } = Layout;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // Check if user is logged in on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const userData = await checkAuthStatus();
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Handle login
  const handleLogin = (userData) => {
    setUser(userData);
    message.success('Welcome to CMMS System');
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    message.success('You have been logged out');
  };

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return (
        <div className="loading-container">
          <Spin size="large" tip="Loading..." />
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  // If app is still initializing, show loading spinner
  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="Loading application..." />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, onLogin: handleLogin, onLogout: handleLogout }}>
      <Router>
        <Layout style={{ minHeight: '100vh' }}>
          {user && (
            <Sidebar 
              collapsed={collapsed} 
              userRole={user.role} 
            />
          )}
          <Layout className="site-layout">
            {user && (
              <Header 
                collapsed={collapsed} 
                setCollapsed={setCollapsed} 
                userName={user.username} 
                onLogout={handleLogout} 
              />
            )}
            <Content className="site-content">
              <Routes>
                <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
                
                <Route path="/" element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/work-orders/*" element={
                  <ProtectedRoute>
                    <WorkOrdersPage />
                  </ProtectedRoute>
                } />
                 <Route path="/machines/*" element={
                  <ProtectedRoute>
                    <MachinesPage />
                  </ProtectedRoute>
                } />

                <Route path="/maintenance/*" element={
                  <ProtectedRoute>
                    <MaintenancePage />
                  </ProtectedRoute>
                } />
                
                <Route path="/rcm/*" element={
                  <ProtectedRoute>
                    <RCMPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/reports/*" element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
/*
                <Route path="/machines/*" element={
                  <ProtectedRoute>
                    <MachinesPage />
                  </ProtectedRoute>
                } />
                
*/