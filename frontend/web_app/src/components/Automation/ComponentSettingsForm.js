import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Switch, Slider, Select, InputNumber, message, Spin } from 'antd';
import './Automation.css';
import axios from 'axios';
import { getComponentSettings, updateComponentSettings } from '../../services/optimizationService';

const { Option } = Select;

const ComponentSettingsForm = ({ componentId, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [componentName, setComponentName] = useState('');
  
  useEffect(() => {
    if (componentId) {
      loadSettings();
    }
  }, [componentId]);
  
  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Get component details (keep this part as is since it's a different API)
      const componentResponse = await axios.get(`/api/machines/components/${componentId}`);
      if (componentResponse.data.component) {
        setComponentName(componentResponse.data.component.name);
      }
      
      // Get settings using the service
      const settings = await getComponentSettings(componentId);
      
      form.setFieldsValue({
        analysis_method: settings.analysis_method,
        auto_adjust_enabled: settings.auto_adjust_enabled,
        require_approval: settings.require_approval,
        reliability_target: settings.reliability_target * 100, // Convert to percentage
        min_confidence: settings.min_confidence * 100, // Convert to percentage
        max_increase_percent: settings.max_increase_percent,
        max_decrease_percent: settings.max_decrease_percent,
        min_interval_hours: settings.min_interval_hours,
        max_interval_hours: settings.max_interval_hours,
        min_interval_days: settings.min_interval_days,
        max_interval_days: settings.max_interval_days
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      message.error('Failed to load component settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      // Convert percentage values back to ratios
      const formattedValues = {
        ...values,
        reliability_target: values.reliability_target / 100,
        min_confidence: values.min_confidence / 100
      };
      
      await updateComponentSettings(componentId, formattedValues);
      
      message.success('Settings saved successfully');
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !componentName) {
    return <Spin size="large" />;
  }
  
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        analysis_method: 'weibull',
        auto_adjust_enabled: false,
        require_approval: true,
        reliability_target: 90,
        min_confidence: 70,
        max_increase_percent: 25,
        max_decrease_percent: 30
      }}
    >
      <h3>Settings for {componentName}</h3>
      
      <Form.Item
        name="analysis_method"
        label="Analysis Method"
      >
        <Select>
          <Option value="weibull">Weibull Analysis</Option>
          <Option value="kaplan_meier">Kaplan-Meier Survival Analysis</Option>
        </Select>
      </Form.Item>
      
      <Form.Item
        name="auto_adjust_enabled"
        label="Enable Automatic Adjustments"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      
      <Form.Item
        name="require_approval"
        label="Require Approval for Automatic Adjustments"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      
      <Form.Item
        name="reliability_target"
        label="Target Reliability (%)"
      >
        <Slider
          min={50}
          max={99}
          step={1}
          tipFormatter={value => `${value}%`}
        />
      </Form.Item>
      
      <Form.Item
        name="min_confidence"
        label="Minimum Confidence for Auto-Approval (%)"
      >
        <Slider
          min={50}
          max={95}
          step={1}
          tipFormatter={value => `${value}%`}
        />
      </Form.Item>
      
      <Form.Item
        name="max_increase_percent"
        label="Maximum Interval Increase (%)"
      >
        <InputNumber min={1} max={100} />
      </Form.Item>
      
      <Form.Item
        name="max_decrease_percent"
        label="Maximum Interval Decrease (%)"
      >
        <InputNumber min={1} max={100} />
      </Form.Item>
      
      <h4>Interval Limits</h4>
      
      <Form.Item
        name="min_interval_hours"
        label="Minimum Interval (hours)"
      >
        <InputNumber min={1} />
      </Form.Item>
      
      <Form.Item
        name="max_interval_hours"
        label="Maximum Interval (hours)"
      >
        <InputNumber min={1} />
      </Form.Item>
      
      <Form.Item
        name="min_interval_days"
        label="Minimum Interval (days)"
      >
        <InputNumber min={1} />
      </Form.Item>
      
      <Form.Item
        name="max_interval_days"
        label="Maximum Interval (days)"
      >
        <InputNumber min={1} />
      </Form.Item>
      
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Save Settings
        </Button>
        <Button 
          onClick={onClose} 
          style={{ marginLeft: 8 }}
        >
          Cancel
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ComponentSettingsForm;