/* trying test mode
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DailyMaintenanceScreen from './DailyMaintenanceScreen';
import PeriodicMaintenanceScreen from './PeriodicMaintenanceScreen';
import FailureReportingScreen from './FailureReportingScreen';

const Tab = createMaterialTopTabNavigator();

export default function DashboardScreen({ navigation }) {
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  
  useEffect(() => {
    // Subscribe to navigation focus events to reload data when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadSelectedMachine();
    });
    
    return unsubscribe;
  }, [navigation]);
  
  const loadSelectedMachine = async () => {
    try {
      const machineData = await AsyncStorage.getItem('selectedMachine');
      if (machineData) {
        setSelectedMachine(JSON.parse(machineData));
        
        // Check last hours update time
        const lastUpdateData = await AsyncStorage.getItem(`lastHoursUpdate_${JSON.parse(machineData).id}`);
        if (lastUpdateData) {
          setLastUpdateTime(new Date(JSON.parse(lastUpdateData).date));
        }
      }
    } catch (error) {
      console.error('Error loading selected machine:', error);
    }
  };
  
  const formatLastUpdate = () => {
    if (!lastUpdateTime) return 'Not updated';
    
    const now = new Date();
    const diffMs = now - lastUpdateTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      // If updated today, show the time
      return `Today at ${lastUpdateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffHours < 48) {
      // If updated yesterday
      return 'Yesterday';
    } else {
      // Otherwise show the date
      return lastUpdateTime.toLocaleDateString();
    }
  };
  
  // Custom header component that shows machine info
  const DashboardHeader = () => (
    <View style={styles.headerContainer}>
      {selectedMachine ? (
        <>
          <View style={styles.machineInfoContainer}>
            <Text style={styles.machineLabel}>Selected Machine:</Text>
            <Text style={styles.machineName}>{selectedMachine.name}</Text>
            <Text style={styles.machineId}>ID: {selectedMachine.technical_id}</Text>
            
            <View style={styles.hoursContainer}>
              {selectedMachine.hour_counter && (
                <Text style={styles.hoursText}>Current Hours: {selectedMachine.hour_counter}</Text>
              )}
              
              <Text style={styles.lastUpdateText}>Last updated: {formatLastUpdate()}</Text>
            </View>
          </View>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('QRScanner')}
            >
              <MaterialIcons name="qr-code-scanner" size={24} color="#5D6271" />
              <Text style={styles.actionText}>Change Machine</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Runtime', { machine: selectedMachine })}
            >
              <MaterialIcons name="update" size={24} color="#5D6271" />
              <Text style={styles.actionText}>Update Hours</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.noMachineContainer}>
          <Text style={styles.noMachineText}>No machine selected</Text>
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => navigation.navigate('QRScanner')}
          >
            <MaterialIcons name="qr-code-scanner" size={20} color="white" />
            <Text style={styles.scanButtonText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <DashboardHeader />
      
      <Tab.Navigator
        initialRouteName="DailyMaintenance"
        screenOptions={{
          tabBarActiveTintColor: '#5D6271',
          tabBarInactiveTintColor: '#AAADB7',
          tabBarIndicatorStyle: { backgroundColor: '#5D6271' },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        }}
      >
        <Tab.Screen 
          name="DailyMaintenance" 
          component={DailyMaintenanceScreen} 
          options={{ 
            tabBarLabel: 'Daily',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="today" size={20} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="PeriodicMaintenance" 
          component={PeriodicMaintenanceScreen} 
          options={{ 
            tabBarLabel: 'Periodic',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="calendar-today" size={20} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Reporting" 
          component={FailureReportingScreen} 
          options={{ 
            tabBarLabel: 'Report Failure',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="report-problem" size={20} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  machineInfoContainer: {
    marginBottom: 12,
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
  hoursContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hoursText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5D6271',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#5D6271',
  },
  noMachineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noMachineText: {
    fontSize: 16,
    color: '#666',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5D6271',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  scanButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: 'white',
  },
});
*/                                                             
/*Testing if the new code works
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import WorkOrderItem from '../components/WorkOrderItems.js';
import { fetchWorkOrders } from '../services/api';
import { Checkbox } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

const Tab = createMaterialTopTabNavigator();

// Tab screens
function DailyMaintenanceScreen() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch daily work orders from your API
    const loadWorkOrders = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const orders = await fetchWorkOrders(token, 'daily');
        setWorkOrders(orders);
      } catch (error) {
        console.error('Error loading work orders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkOrders();
  }, []);

  return (
    <ScrollView style={styles.container}>
      {workOrders.map((order) => (
        <WorkOrderItem key={order.id} workOrder={order} />
      ))}
      {workOrders.length === 0 && !loading && (
        <Text style={styles.emptyMessage}>Ingen arbeidsordrer for idag</Text>
      )}
    </ScrollView>
  );
}
*/
  /* Testing for fake work orders
export default function DailyMaintenanceScreen() {
  // Mock data - replace with API call to your Flask backend later  
  const workOrders = [
    {
      id: 1,
      title: 'Rengjør tuben over isbitformen',
      type: 'Rengjøring',
      location: 'Isbitmaskin',
      completed: false,
    },
    {
      id: 2,
      title: 'Ta temperaturen på frysern',
      type: 'Måling',
      location: 'Fryseren',
      completed: false,
    },
    {
      id: 3,
      title: 'Rengjør tuben over isbitformen',
      type: 'Rengjøring',
      location: 'Isbitmaskin',
      completed: false,
    },
    {
      id: 4,
      title: 'Rengjør tuben over isbitformen',
      type: 'Rengjøring',
      location: 'Isbitmaskin',
      completed: false,
    },
    {
      id: 5,
      title: 'Rengjør tuben over isbitformen',
      type: 'Rengjøring',
      location: 'Isbitmaskin',
      completed: false,
    },
  ];

  // Function to toggle work order completion
  const toggleComplete = (id) => {
    // In a real app, you would update the state and call API
    console.log(`Toggled work order ${id}`);
  };

    return (
    <ScrollView style={styles.container}>
      {workOrders.map(workOrder => (
        <View key={workOrder.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{workOrder.title}</Text>
            <Ionicons name="information-circle-outline" size={24} color="#5D6271" />
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{workOrder.type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lokasjon</Text>
              <Text style={styles.infoValue}>{workOrder.location}</Text>
            </View>
          </View>
          
          <View style={styles.cardFooter}>
            <Checkbox.Android
              status={workOrder.completed ? 'checked' : 'unchecked'}
              onPress={() => toggleComplete(workOrder.id)}
              color="#5D6271"
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    flex: 1,
    color: '#333',
  },
  cardContent: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
});
  */

/* Testing if the new code works
function PeriodicMaintenanceScreen() {
  // Similar to DailyMaintenanceScreen but for periodic work orders
  return (
    <ScrollView style={styles.container}>
      <Text>Periodisk Vedlikehold</Text>
    </ScrollView>
  );
}

function ReportingScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text>Rapporterin</Text>
    </ScrollView>
  );
}

export default function DashboardScreen() {
  return (
    <Tab.Navigator
      initialRouteName="DailyMaintenance"
      screenOptions={{
        tabBarActiveTintColor: '#5D6271',
        tabBarInactiveTintColor: '#AAADB7',
        tabBarIndicatorStyle: { backgroundColor: '#5D6271' },
      }}
    >
      <Tab.Screen 
        name="DailyMaintenance" 
        component={DailyMaintenanceScreen} 
        options={{ 
          tabBarLabel: ({ color }) => (
            <View style={styles.tabContainer}>
              <Text style={[styles.tabLabel, { color }]}>Daglig</Text>
              <Text style={[styles.tabLabel, { color }]}>Vedlikehold</Text>
            </View>
          )
        }}
      />
      <Tab.Screen 
        name="PeriodicMaintenance" 
        component={PeriodicMaintenanceScreen} 
        options={{ 
          tabBarLabel: ({ color }) => (
            <View style={styles.tabContainer}>
              <Text style={[styles.tabLabel, { color }]}>Periodisk</Text>
              <Text style={[styles.tabLabel, { color }]}>Vedlikehold</Text>
            </View>
          )
        }}
      />
      <Tab.Screen 
        name="Reporting" 
        component={ReportingScreen} 
        options={{ 
          tabBarLabel: 'Rapportering',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  tabContainer: {
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  }
});
*/