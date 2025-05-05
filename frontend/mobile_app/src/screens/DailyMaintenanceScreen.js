import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import { Checkbox } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWorkOrders, completeWorkOrder } from '../services/api';

export default function DailyMaintenanceScreen({ navigation }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [completingOrder, setCompletingOrder] = useState(null);

  useEffect(() => {
    loadSelectedMachine();
  }, []);

  useEffect(() => {
    if (selectedMachine) {
      loadWorkOrders();
    }
  }, [selectedMachine]);

  const loadSelectedMachine = async () => {
    try {
      const machineData = await AsyncStorage.getItem('selectedMachine');
      if (machineData) {
        setSelectedMachine(JSON.parse(machineData));
      }
    } catch (error) {
      console.error('Error loading selected machine:', error);
    }
  };

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Fetch daily work orders
      const orders = await fetchWorkOrders(token, 'daily', selectedMachine.id);
      setWorkOrders(orders);
    } catch (error) {
      console.error('Error loading work orders:', error);
      Alert.alert('Error', 'Failed to load maintenance tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderComplete = async (orderId) => {
    try {
      setCompletingOrder(orderId);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await completeWorkOrder(token, orderId);
      
      // Update local state
      setWorkOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'completed' } 
            : order
        )
      );
      
      // Close modal if open
      if (detailModalVisible && selectedOrder && selectedOrder.id === orderId) {
        setDetailModalVisible(false);
      }
      
      Alert.alert('Success', 'Task marked as completed');
    } catch (error) {
      console.error('Error completing work order:', error);
      Alert.alert('Error', 'Failed to complete task');
    } finally {
      setCompletingOrder(null);
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setDetailModalVisible(true);
  };

  const NoMachineSelected = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="qr-code-scanner" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Machine Selected</Text>
      <Text style={styles.emptyMessage}>
        Scan a machine QR code to view its daily maintenance tasks
      </Text>
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={() => navigation.navigate('QRScanner')}
      >
        <Text style={styles.scanButtonText}>Scan QR Code</Text>
      </TouchableOpacity>
    </View>
  );

  const EmptyWorkOrders = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="event-available" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Daily Tasks</Text>
      <Text style={styles.emptyMessage}>
        No daily maintenance tasks are scheduled for this machine today
      </Text>
    </View>
  );

  const renderWorkOrderItem = ({ item }) => {
    const isCompleted = item.status === 'completed';
    
    return (
      <View style={styles.tableRow}>
        <View style={styles.taskColumn}>
          <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.taskDetails}>
            {item.type || 'Standard'} • {item.location || selectedMachine?.location || 'N/A'}
          </Text>
        </View>
        
        <View style={styles.actionsColumn}>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => handleViewDetails(item)}
          >
            <MaterialIcons name="info-outline" size={20} color="#5D6271" />
          </TouchableOpacity>
          
          {completingOrder === item.id ? (
            <ActivityIndicator size="small" color="#5D6271" />
          ) : (
            <Checkbox.Android
              status={isCompleted ? 'checked' : 'unchecked'}
              onPress={() => {
                if (!isCompleted) {
                  Alert.alert(
                    'Complete Task',
                    'Mark this maintenance task as completed?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Complete', onPress: () => handleOrderComplete(item.id) }
                    ]
                  );
                }
              }}
              color="#5D6271"
              disabled={isCompleted}
            />
          )}
        </View>
      </View>
    );
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={styles.headerTask}>Task</Text>
      <Text style={styles.headerActions}>Actions</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5D6271" />
        <Text style={styles.loadingText}>Loading daily maintenance tasks...</Text>
      </View>
    );
  }

  if (!selectedMachine) {
    return <NoMachineSelected />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.machineInfoContainer}>
        <Text style={styles.machineId}>
          Maintenance tasks for {selectedMachine.name}
        </Text>
      </View>
      
      {workOrders.length > 0 && <TableHeader />}
      
      <FlatList
        data={workOrders}
        renderItem={renderWorkOrderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={EmptyWorkOrders}
      />

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Task Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedOrder && (
              <ScrollView style={styles.modalContent}>
                <Text style={styles.detailTitle}>{selectedOrder.title}</Text>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Description</Text>
                  <Text style={styles.detailDescription}>
                    {selectedOrder.description || 'No detailed description provided for this task.'}
                  </Text>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Details</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.type || 'Standard'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.category || 'Daily Maintenance'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.location || selectedMachine.location}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.status || 'Open'}</Text>
                  </View>
                  
                  {selectedOrder.tool_requirements && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tools Required:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.tool_requirements}</Text>
                    </View>
                  )}
                </View>
                
                {selectedOrder.status !== 'completed' && (
                  <TouchableOpacity 
                    style={styles.completeButton}
                    onPress={() => {
                      setDetailModalVisible(false);
                      Alert.alert(
                        'Complete Task',
                        'Mark this maintenance task as completed?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Complete', onPress: () => handleOrderComplete(selectedOrder.id) }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.completeButtonText}>Mark as Completed</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  machineInfoContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  machineId: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EEEEEE',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
  },
  headerTask: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    flex: 4,
  },
  headerActions: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    alignItems: 'center',
  },
  taskColumn: {
    flex: 4,
    paddingRight: 8,
  },
  actionsColumn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  taskDetails: {
    fontSize: 12,
    color: '#666',
  },
  infoButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  scanButton: {
    backgroundColor: '#5D6271',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 16,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5D6271',
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: 120,
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  completeButton: {
    backgroundColor: '#5D6271',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  listContainer: {
    flexGrow: 1,
  },
});