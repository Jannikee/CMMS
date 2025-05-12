import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  DatePicker, 
  InputNumber, 
  Typography, 
  message, 
  Spin, 
  Divider 
} from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { createMachine, fetchMachineById, updateMachine } from '../../services/machineService';
import moment from 'moment';
import './MachineForm.css';

const { Title } = Typography;
const { TextArea } = Input;

const MachineForm = ({ isEditing = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);

  // Fetch machine details if editing
  useEffect(() => {
    const loadMachine = async () => {
      if (isEditing && id) {
        try {
          setLoading(true);
          const machineData = await fetchMachineById(id);
          
          // Format the date fields
          const formattedData = {
            ...machineData,
            installation_date: machineData.installation_date ? moment(machineData.installation_date) : null,
          };
          
          form.setFieldsValue(formattedData);
        } catch (error) {
          message.error('Failed to load machine details');
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadMachine();
  }, [id, isEditing, form]);

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      // Format date fields
      const formattedValues = {
        ...values,
        installation_date: values.installation_date ? values.installation_date.format('YYYY-MM-DD') : null,
      };
      
      if (isEditing) {
        await updateMachine(id, formattedValues);
        message.success('Machine updated successfully');
      } else {
        await createMachine(formattedValues);
        message.success('Machine created successfully');
      }
      
      // Navigate back to machines list
      navigate('/machines');
    } catch (error) {
      message.error(isEditing ? 'Failed to update machine' : 'Failed to create machine');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancellation
  const handleCancel = () => {
    navigate('/machines');
  };

  return (
    <div className="machine-form-container">
      <Card className="form-card">
        <div className="form-header">
          <Title level={2}>{isEditing ? 'Edit Equipment' : 'Add New Equipment'}</Title>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleCancel}
          >
            Back to List
          </Button>
        </div>
        
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Divider orientation="left">Basic Information</Divider>
            
            <Form.Item
              name="name"
              label="Equipment Name"
              rules={[{ required: true, message: 'Please enter equipment name' }]}
            >
              <Input placeholder="Enter equipment name" />
            </Form.Item>
            
            <Form.Item
              name="technical_id"
              label="Technical ID"
              rules={[
                { required: true, message: 'Please enter technical ID' },
                { pattern: /^\d+$/, message: 'Technical ID must be numeric' }
              ]}
            >
              <Input placeholder="e.g., 1077" />
            </Form.Item>
            
            <div className="form-row">
              <Form.Item
                name="location"
                label="Location"
                rules={[{ required: true, message: 'Please specify location' }]}
                className="form-col"
              >
                <Input placeholder="Enter equipment location" />
              </Form.Item>
              
              <Form.Item
                name="hour_counter"
                label="Hour Counter"
                className="form-col"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.1}
                  placeholder="0.0"
                />
              </Form.Item>
              {/* Add new fields */}
              <Form.Item
                name="failure_rate_denominator"
                label="Failure Rate Denominator"
                tooltip="The number of operating hours to use as the denominator for failure rates"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  placeholder="100"
                />
              </Form.Item>

              <Form.Item
                name="expected_annual_usage"
                label="Expected Annual Usage (hours/year)"
                tooltip="Expected number of operating hours per year"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="300"
                />
              </Form.Item>
            </div>
            
            <Form.Item
              name="installation_date"
              label="Installation Date"
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea rows={4} placeholder="Enter equipment description" />
            </Form.Item>
            
            <div className="form-actions">
              <Button 
                type="default" 
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting}
                icon={<SaveOutlined />}
              >
                {isEditing ? 'Update Equipment' : 'Create Equipment'}
              </Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
};

export default MachineForm;