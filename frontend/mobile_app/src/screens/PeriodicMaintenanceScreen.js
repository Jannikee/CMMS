import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Checkbox, ProgressBar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWorkOrders, completeWorkOrder } from '../services/api';

export default function PeriodicMaintenanceScreen({ navigation }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [completingOrder, setCompletingOrder] = useState(false);

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
      
      // Fetch periodic/time-based work orders for the selected machine
      const ordersData = await fetchWorkOrders(token, 'periodic', selectedMachine.id);
      
      // Calculate progress for each work order based on time intervals
      const ordersWithProgress = ordersData.map(order => {
        let progress = 0;
        let timeRemaining = '';
        
        // If we have some interval data
        if (order.interval_hours && selectedMachine.hour_counter) {
          // Example: If interval is 100 hours, and last done at 1000 hours, and current is 1050,
          // then we're 50% through the interval (50/100)
          const lastDoneHours = order.last_completed_at ? order.last_completed_at : 
                               (selectedMachine.hour_counter - (order.interval_hours * 0.2)); // Assume 20% done if no history
          
          const hoursPassed = selectedMachine.hour_counter - lastDoneHours;
          progress = Math.min(1, Math.max(0, hoursPassed / order.interval_hours));
          
          const hoursRemaining = order.interval_hours - hoursPassed;
          timeRemaining = hoursRemaining > 0 ? 
            `${Math.round(hoursRemaining)} hours remaining` : 
            'Due now';
        } else if (order.due_date) {
          // Calculate progress based on due date
          const now = new Date();
          const dueDate = new Date(order.due_date);
          const createdDate = new Date(order.created_at);
          
          const totalDuration = dueDate - createdDate;
          const elapsed = now - createdDate;
          
          progress = Math.min(1, Math.max(0, elapsed / totalDuration));
          
          // Calculate time remaining
          const msRemaining = dueDate - now;
          const daysRemaining = Math.round(msRemaining / (1000 * 60 * 60 * 24));
          
          timeRemaining = daysRemaining > 0 ? 
            `${daysRemaining} days remaining` : 
            'Due now';
        }
        
        return {
          ...order,
          progress,
          timeRemaining
        };
      });
      
      setWorkOrders(ordersWithProgress);
    } catch (error) {
      console.error('Error loading work orders:', error);
      Alert.alert('Error', 'Failed to load maintenance tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleInfoPress = (workOrder) => {
    setSelectedWorkOrder(workOrder);
    setInfoModalVisible(true);
  };

  const handleCheckboxToggle = async (workOrder) => {
    // Show confirmation dialog
    Alert.alert(
      "Complete Maintenance Task",
      "Have you completed this maintenance task?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Complete",
          onPress: () => markWorkOrderComplete(workOrder)
        }
      ]
    );
  };
  
  const markWorkOrderComplete = async (workOrder) => {
    try {
      setCompletingOrder(workOrder.id);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Call API to mark work order as complete
      await completeWorkOrder(token, workOrder.id);
      
      // Update local state
      setWorkOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === workOrder.id 
            ? { ...order, status: 'completed', checked: true } 
            : order
        )
      );
      
      Alert.alert("Success", "Maintenance task marked as complete");
    } catch (error) {
      console.error('Error completing work order:', error);
      Alert.alert('Error', 'Failed to complete maintenance task');
    } finally {
      setCompletingOrder(null);
    }
  };

  // Determine progress bar color based on progress value
  const getProgressColor = (progress) => {
    if (progress > 0.75) {
      return '#F44336'; // Red for high urgency
    } else if (progress > 0.5) {
      return '#FF9800'; // Orange for medium urgency
    }
    return '#4CAF50'; // Green for low urgency
  };

  const renderWorkOrderItem = ({ item }) => {
    const isChecked = item.status === 'completed';
    const progressColor = getProgressColor(item.progress);
    
    return (
      <View style={styles.tableRow}>
        <View style={styles.titleColumn}>
          <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.taskType}>{item.type || 'Maintenance'}</Text>
        </View>
        
        <View style={styles.progressColumn}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressFill, { width: `${item.progress * 100}%`, backgroundColor: progressColor }]} />
          </View>
          <Text style={styles.timeRemaining}>{item.timeRemaining}</Text>
        </View>
        
        <View style={styles.actionsColumn}>
          <TouchableOpacity style={styles.infoButton} onPress={() => handleInfoPress(item)}>
            <MaterialIcons name="info-outline" size={18} color="#5D6271" />
          </TouchableOpacity>
          
          {completingOrder === item.id ? (
            <ActivityIndicator size="small" color="#5D6271" />
          ) : (
            <Checkbox.Android
              status={isChecked ? 'checked' : 'unchecked'}
              onPress={() => !isChecked && handleCheckboxToggle(item)}
              color="#5D6271"
              disabled={isChecked}
            />
          )}
        </View>
      </View>
    );
  };

  const NoMachineSelected = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="qr-code-scanner" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Machine Selected</Text>
      <Text style={styles.emptyMessage}>
        Scan a machine QR code to view its maintenance schedule
      </Text>
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={() => navigation.navigate('QRScanner')}
      >
        <Text style={styles.scanButtonText}>Scan QR Code</Text>
      </TouchableOpacity>
    </View>
  );

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="event-available" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Maintenance Tasks</Text>
      <Text style={styles.emptyMessage}>
        No periodic maintenance tasks are scheduled for this machine
      </Text>
    </View>
  );

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={styles.headerTitle}>Task</Text>
      <Text style={styles.headerProgress}>Progress</Text>
      <Text style={styles.headerActions}>Actions</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5D6271" />
          <Text style={styles.loadingText}>Loading maintenance tasks...</Text>
        </View>
      ) : (
        <>
          {selectedMachine ? (
            <>
              <View style={styles.machineInfoContainer}>
                <Text style={styles.machineLabel}>Selected Machine:</Text>
                <Text style={styles.machineName}>{selectedMachine.name}</Text>
                <Text style={styles.machineId}>ID: {selectedMachine.technical_id}</Text>
                {selectedMachine.hour_counter && (
                  <Text style={styles.machineHours}>Hours: {selectedMachine.hour_counter}</Text>
                )}
              </View>
              
              {workOrders.length > 0 && <TableHeader />}
              
              <FlatList
                data={workOrders}
                renderItem={renderWorkOrderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={EmptyList}
              />
            </>
          ) : (
            <NoMachineSelected />
          )}
        </>
      )}
      
      {/* Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Maintenance Details</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedWorkOrder && (
              <ScrollView style={styles.modalContent}>
                <Text style={styles.detailTitle}>{selectedWorkOrder.title}</Text>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Description</Text>
                  <Text style={styles.detailDescription}>
                    {selectedWorkOrder.description || 'No description provided'}
                  </Text>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Details</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>{selectedWorkOrder.type || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category:</Text>
                    <Text style={styles.detailValue}>{selectedWorkOrder.category || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Priority:</Text>
                    <Text style={styles.detailValue}>{selectedWorkOrder.priority || 'Normal'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={styles.detailValue}>{selectedWorkOrder.status || 'Open'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Due Date:</Text>
                    <Text style={styles.detailValue}>
                      {selectedWorkOrder.due_date 
                        ? new Date(selectedWorkOrder.due_date).toLocaleDateString() 
                        : 'N/A'}
                    </Text>
                  </View>
                  
                  {selectedWorkOrder.interval_hours && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Interval:</Text>
                      <Text style={styles.detailValue}>
                        {selectedWorkOrder.interval_hours} operating hours
                      </Text>
                    </View>
                  )}
                  
                  {selectedWorkOrder.last_completed_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Last Completed:</Text>
                      <Text style={styles.detailValue}>
                        At {selectedWorkOrder.last_completed_at} hours
                      </Text>
                    </View>
                  )}
                </View>
                
                {selectedWorkOrder.status !== 'completed' && (
                  <TouchableOpacity 
                    style={styles.completeButton}
                    onPress={() => {
                      setInfoModalVisible(false);
                      handleCheckboxToggle(selectedWorkOrder);
                    }}
                  >
                    <Text style={styles.completeButtonText}>Complete Task</Text>
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
  machineInfoContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  machineLabel: {
    fontSize: 12,
    color: '#666',
  },
  machineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  machineId: {
    fontSize: 12,
    color: '#666',
  },
  machineHours: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EEEEEE',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    flex: 3,
  },
  headerProgress: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    flex: 2,
    textAlign: 'center',
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
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    alignItems: 'center',
  },
  titleColumn: {
    flex: 3,
    paddingRight: 8,
  },
  progressColumn: {
    flex: 2,
    alignItems: 'center',
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
  taskType: {
    fontSize: 12,
    color: '#666',
  },
  progressBarContainer: {
    height: 6,
    width: '90%',
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  timeRemaining: {
    fontSize: 10,
    color: '#666',
  },
  infoButton: {
    padding: 4,
  },
  listContainer: {
    flexGrow: 1,
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
});/* Similar to daily maintence
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Checkbox, ProgressBar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWorkOrders, completeWorkOrder } from '../services/api';

export default function PeriodicMaintenanceScreen({ navigation }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [completingOrder, setCompletingOrder] = useState(false);

  
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
      
      // Fetch periodic/time-based work orders for the selected machine
      const ordersData = await fetchWorkOrders(token, 'periodic', selectedMachine.id);
      
      // Calculate progress for each work order based on time intervals
      const ordersWithProgress = ordersData.map(order => {
        let progress = 0;
        let timeRemaining = '';
        
        // If we have some interval data
        if (order.interval_hours && selectedMachine.hour_counter) {
          // Example: If interval is 100 hours, and last done at 1000 hours, and current is 1050,
          // then we're 50% through the interval (50/100)
          const lastDoneHours = order.last_completed_at ? order.last_completed_at : 
                               (selectedMachine.hour_counter - (order.interval_hours * 0.2)); // Assume 20% done if no history
          
          const hoursPassed = selectedMachine.hour_counter - lastDoneHours;
          progress = Math.min(1, Math.max(0, hoursPassed / order.interval_hours));
          
          const hoursRemaining = order.interval_hours - hoursPassed;
          timeRemaining = hoursRemaining > 0 ? 
            `${Math.round(hoursRemaining)} hours remaining` : 
            'Due now';
        } else if (order.due_date) {
          // Calculate progress based on due date
          const now = new Date();
          const dueDate = new Date(order.due_date);
          const createdDate = new Date(order.created_at);
          
          const totalDuration = dueDate - createdDate;
          const elapsed = now - createdDate;
          
          progress = Math.min(1, Math.max(0, elapsed / totalDuration));
          
          // Calculate time remaining
          const msRemaining = dueDate - now;
          const daysRemaining = Math.round(msRemaining / (1000 * 60 * 60 * 24));
          
          timeRemaining = daysRemaining > 0 ? 
            `${daysRemaining} days remaining` : 
            'Due now';
        }
        
        return {
          ...order,
          progress,
          timeRemaining
        };
      });
      
      setWorkOrders(ordersWithProgress);
    } catch (error) {
      console.error('Error loading work orders:', error);
      Alert.alert('Error', 'Failed to load maintenance tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleInfoPress = (workOrder) => {
    setSelectedWorkOrder(workOrder);
    setInfoModalVisible(true);
  };

  const handleCheckboxToggle = async (workOrder) => {
    // Show confirmation dialog
    Alert.alert(
      "Complete Maintenance Task",
      "Have you completed this maintenance task?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Complete",
          onPress: () => markWorkOrderComplete(workOrder)
        }
      ]
    );
  };
  
  const markWorkOrderComplete = async (workOrder) => {
    try {
      setCompletingOrder(workOrder.id);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Call API to mark work order as complete
      await completeWorkOrder(token, workOrder.id);
      
      // Update local state
      setWorkOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === workOrder.id 
            ? { ...order, status: 'completed', checked: true } 
            : order
        )
      );
      
      Alert.alert("Success", "Maintenance task marked as complete");
    } catch (error) {
      console.error('Error completing work order:', error);
      Alert.alert('Error', 'Failed to complete maintenance task');
    } finally {
      setCompletingOrder(null);
    }
  };

  const renderWorkOrderItem = ({ item }) => {
    // Determine progress bar color based on progress value
    let progressColor = '#4CAF50'; // Green for low urgency
    if (item.progress > 0.75) {
      progressColor = '#F44336'; // Red for high urgency
    } else if (item.progress > 0.5) {
      progressColor = '#FF9800'; // Orange for medium urgency
    }
    
    const isChecked = item.status === 'completed';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <TouchableOpacity onPress={() => handleInfoPress(item)}>
            <MaterialIcons name="info-outline" size={24} color="#5D6271" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.timeRemaining}>{item.timeRemaining}</Text>
            </View>
            <ProgressBar 
              progress={item.progress} 
              color={progressColor}
              style={styles.progressBar} 
            />
          </View>
        </View>
        
        <View style={styles.checkboxContainer}>
          {completingOrder === item.id ? (
            <ActivityIndicator size="small" color="#5D6271" />
          ) : (
            <Checkbox.Android
              status={isChecked ? 'checked' : 'unchecked'}
              onPress={() => !isChecked && handleCheckboxToggle(item)}
              color="#5D6271"
              disabled={isChecked}
            />
          )}
        </View>
      </View>
    );
  };

  const NoMachineSelected = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="qr-code-scanner" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Machine Selected</Text>
      <Text style={styles.emptyMessage}>
        Scan a machine QR code to view its maintenance schedule
      </Text>
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={() => navigation.navigate('QRScanner')}
      >
        <Text style={styles.scanButtonText}>Scan QR Code</Text>
      </TouchableOpacity>
    </View>
  );

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="event-available" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Maintenance Tasks</Text>
      <Text style={styles.emptyMessage}>
        No periodic maintenance tasks are scheduled for this machine
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5D6271" />
          <Text style={styles.loadingText}>Loading maintenance tasks...</Text>
        </View>
      ) : (
        <>
          {selectedMachine ? (
            <>
              {/*<View style={styles.machineInfoContainer}>
                <Text style={styles.machineLabel}>Selected Machine:</Text>
                <Text style={styles.machineName}>{selectedMachine.name}</Text>
                <Text style={styles.machineId}>ID: {selectedMachine.technical_id}</Text>
                {selectedMachine.hour_counter && (
                  <Text style={styles.machineHours}>Hours: {selectedMachine.hour_counter}</Text>
                )}
              </View>
              *}
              <FlatList
                data={workOrders}
                renderItem={renderWorkOrderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={EmptyList}
              />
            </>
          ) : (
            <NoMachineSelected />
          )}
        </>
      )}
      
      {// Details Modal }
      <Modal
        animationType="slide"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Maintenance Details</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedWorkOrder && (
              <ScrollView style={styles.modalContent}>
                <Text style={styles.detailTitle}>{selectedWorkOrder.title}</Text>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Description</Text>
                  <Text style={styles.detailDescription}>
                    {selectedWorkOrder.description || 'No description provided'}
                  </Text>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Details</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>{selectedWorkOrder.type || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category:</Text>
                    <Text style={styles.detailValue}>{selectedWorkOrder.category || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Priority:</Text>
                    <Text style={styles.detailValue}>{selectedWorkOrder.priority || 'Normal'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={styles.detailValue}>{selectedWorkOrder.status || 'Open'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Due Date:</Text>
                    <Text style={styles.detailValue}>
                      {selectedWorkOrder.due_date 
                        ? new Date(selectedWorkOrder.due_date).toLocaleDateString() 
                        : 'N/A'}
                    </Text>
                  </View>
                  
                  {selectedWorkOrder.interval_hours && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Interval:</Text>
                      <Text style={styles.detailValue}>
                        {selectedWorkOrder.interval_hours} operating hours
                      </Text>
                    </View>
                  )}
                  
                  {selectedWorkOrder.last_completed_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Last Completed:</Text>
                      <Text style={styles.detailValue}>
                        At {selectedWorkOrder.last_completed_at} hours
                      </Text>
                    </View>
                  )}
                </View>
                
                {selectedWorkOrder.status !== 'completed' && (
                  <TouchableOpacity 
                    style={styles.completeButton}
                    onPress={() => {
                      setInfoModalVisible(false);
                      handleCheckboxToggle(selectedWorkOrder);
                    }}
                  >
                    <Text style={styles.completeButtonText}>Complete Task</Text>
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
  machineInfoContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  machineLabel: {
    fontSize: 14,
    color: '#666',
  },
  machineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  machineId: {
    fontSize: 14,
    color: '#666',
  },
  machineHours: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Add extra padding at bottom
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  cardContent: {
    marginBottom: 8,
  },
  progressSection: {
    marginTop: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  timeRemaining: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  checkboxContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
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
});
*/