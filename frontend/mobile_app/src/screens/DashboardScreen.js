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
  /*
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