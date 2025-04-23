import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Alert } from 'antd';
import { createSubsystem } from '../../services/machineService';
import './SubsystemForm.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SubsystemForm = ({ machineId, machineTechnicalId, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [generatedId, setGeneratedId] = useState('');
  const [error, setError] = useState(null);

  // Generate a technical ID based on machine ID and next available number
  const generateTechnicalId = () => {
    // In a real implementation, this might call an API to get the next available ID
    // For now, we'll just suggest a format
    const suggestedId = `${machineTechnicalId}.01`;
    setGeneratedId(suggestedId);
    form.setFieldsValue({ technical_id: suggestedId });
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      setError(null);
      
      await createSubsystem(machineId, values);
      message.success('Subsystem added successfully');
      
      // Reset form
      form.resetFields();
      setGeneratedId('');
      
      // Notify parent component
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setError(error.message || 'Failed to add subsystem');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="subsystem-form-container">
      {error && (
        <Alert 
          message="Error" 
          description={error} 
          type="error" 
          showIcon 
          closable 
          className="error-alert"
          onClose={() => setError(null)}
        />
      )}
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="name"
          label="Subsystem Name"
          rules={[
            { required: true, message: 'Please enter a name for the subsystem' }
          ]}
        >
          <Input placeholder="Enter subsystem name" />
        </Form.Item>
        
        <Form.Item
          name="technical_id"
          label={
            <span>
              Technical ID
              <Button 
                type="link" 
                onClick={generateTechnicalId} 
                size="small"
                style={{ marginLeft: 8 }}
              >
                Generate ID
              </Button>
            </span>
          }
          rules={[
            { 
              required: true, 
              message: 'Please enter a technical ID' 
            },
            {
              pattern: new RegExp(`^${machineTechnicalId}\\.\\d+$`),
              message: `ID must be in format "${machineTechnicalId}.XX" where XX is a number`
            }
          ]}
          extra={
            <Text type="secondary">
              Technical ID must be in format "{machineTechnicalId}.XX" where XX is a number
            </Text>
          }
        >
          <Input placeholder={`e.g., ${machineTechnicalId}.01`} />
        </Form.Item>
        
        <Form.Item
          name="description"
          label="Description"
        >
          <TextArea 
            rows={4} 
            placeholder="Enter a description of this subsystem" 
          />
        </Form.Item>
        
        <Form.Item className="form-actions">
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={submitting}
          >
            Add Subsystem
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SubsystemForm;