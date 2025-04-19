import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import WorkOrderItem from '../components/WorkOrderItems.js';
import { fetchWorkOrders } from '../services/api';

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