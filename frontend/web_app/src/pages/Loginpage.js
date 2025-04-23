import React, { useContext, useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';
import { loginUser } from '../services/AuthService';
import './LoginPage.css';

const { Title } = Typography;

const LoginPage = () => {
  const { onLogin } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (values) => {
    setLoading(true);
    setError(null);
    
    try {
      const userData = await loginUser(values.username, values.password);
      if (userData) {
        onLogin(userData);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <Title level={2}>CMMS Login</Title>
          <Title level={4} type="secondary">Maintenance Management System</Title>
        </div>
        
        {error && (
          <Alert 
            message="Login Error" 
            description={error}
            type="error" 
            showIcon 
            closable 
            className="login-error"
            onClose={() => setError(null)}
          />
        )}
        
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={handleSubmit}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input 
              prefix={<UserOutlined className="site-form-item-icon" />} 
              placeholder="Username" 
              disabled={loading}
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="Password"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              className="login-button"
              loading={loading}
              block
            >
              {loading ? 'Logging in...' : 'Log in'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;