import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWorkOrderDetail, completeWorkOrder } from '../services/api';

export default function WorkOrderDetailScreen({ route, navigation }) {
  const { workOrderId } = route.params;
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadWorkOrderDetails();
  }, []);

  const loadWorkOrderDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const data = await fetchWorkOrderDetail(token, workOrderId);
      setWorkOrder(data);
    } catch (error) {
      console.error('Error loading work order details:', error);
      Alert.alert('Error', 'Failed to load work order details');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWorkOrder = async () => {
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await completeWorkOrder(token, workOrderId);
      
      Alert.alert(
        'Success',
        'Work order has been marked as completed',
        [
          {
            text: 'OK',
            onPress: () => {
              // Update the local state
              setWorkOrder({ ...workOrder, status: 'completed' });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error completing work order:', error);
      Alert.alert('Error', 'Failed to complete work order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5D6271" />
        <Text style={styles.loadingText}>Loading work order details...</Text>
      </View>
    );
  }

  if (!workOrder) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#F44336" />
        <Text style={styles.errorText}>Work order not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{workOrder.title}</Text>
        <View style={styles.statusContainer}>
          <Text 
            style={[
              styles.statusBadge, 
              workOrder.status === 'completed' ? styles.statusCompleted : 
              workOrder.status === 'in_progress' ? styles.statusInProgress : 
              styles.statusOpen
            ]}
          >
            {workOrder.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{workOrder.description}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Machine:</Text>
          <Text style={styles.detailValue}>{workOrder.machine}</Text>
        </View>
        
        {workOrder.subsystem && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subsystem:</Text>
            <Text style={styles.detailValue}>{workOrder.subsystem}</Text>
          </View>
        )}
        
        {workOrder.component && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Component:</Text>
            <Text style={styles.detailValue}>{workOrder.component}</Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailValue}>{workOrder.type}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category:</Text>
          <Text style={styles.detailValue}>{workOrder.category}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Priority:</Text>
          <Text style={styles.detailValue}>{workOrder.priority}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Created:</Text>
          <Text style={styles.detailValue}>{new Date(workOrder.created_at).toLocaleDateString()}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Due Date:</Text>
          <Text style={styles.detailValue}>{new Date(workOrder.due_date).toLocaleDateString()}</Text>
        </View>
        
        {workOrder.assigned_to && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Assigned To:</Text>
            <Text style={styles.detailValue}>{workOrder.assigned_to}</Text>
          </View>
        )}
      </View>
      
      {workOrder.tool_requirements && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tool Requirements</Text>
          <Text style={styles.toolRequirements}>{workOrder.tool_requirements}</Text>
        </View>
      )}
      
      {workOrder.status !== 'completed' && (
        <TouchableOpacity 
          style={styles.completeButton}
          onPress={() => {
            Alert.alert(
              'Complete Work Order',
              'Are you sure you want to mark this work order as completed?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Complete', onPress: handleCompleteWorkOrder }
              ]
            );
          }}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color="white" />
              <Text style={styles.completeButtonText}>Mark as Completed</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#5D6271',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
    overflow: 'hidden',
  },
  statusOpen: {
    backgroundColor: '#E6F7FF',
    color: '#1890FF',
  },
  statusInProgress: {
    backgroundColor: '#FFF7E6',
    color: '#FA8C16',
  },
  statusCompleted: {
    backgroundColor: '#F6FFED',
    color: '#52C41A',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: 100,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  toolRequirements: {
    fontSize: 16,
    color: '#333',
  },
  completeButton: {
    backgroundColor: '#52C41A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 30,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});