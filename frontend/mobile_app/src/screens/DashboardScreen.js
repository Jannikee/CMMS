import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Platform, Dimensions } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DailyMaintenanceScreen from './DailyMaintenanceScreen';
import PeriodicMaintenanceScreen from './PeriodicMaintenanceScreen';
import FailureReportingScreen from './FailureReportingScreen';

const Tab = createMaterialTopTabNavigator();
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function DashboardScreen({ navigation }) {
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [testMode, setTestMode] = useState(false);
  
  useEffect(() => {
    // Subscribe to navigation focus events to reload data when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadSelectedMachine();
      checkTestMode();
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

  const checkTestMode = async () => {
    try {
      const testModeStr = await AsyncStorage.getItem('testMode');
      setTestMode(testModeStr === 'true');
    } catch (error) {
      console.error('Error checking test mode:', error);
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
            <View style={styles.machineNameRow}>
              <Text style={styles.machineName}>{selectedMachine.name}</Text>
              {testMode && (
                <View style={styles.testModeBadge}>
                  <Text style={styles.testModeText}>Test Mode</Text>
                </View>
              )}
            </View>
            <View style={styles.machineDetailsRow}>
              <Text style={styles.machineDetails}>
                ID: {selectedMachine.technical_id} • Hours: {selectedMachine.hour_counter}
              </Text>
              <Text style={styles.lastUpdateText}>Last updated: {formatLastUpdate()}</Text>
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('MachineSelection')}
            >
              <MaterialIcons name="swap-horiz" size={14} color="#5D6271" />
              <Text style={styles.actionText}>Change Machine</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Runtime', { machine: selectedMachine })}
            >
              <MaterialIcons name="update" size={14} color="#5D6271" />
              <Text style={styles.actionText}>Update Hours</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.noMachineContainer}>
          <Text style={styles.noMachineText}>No machine selected</Text>
          <View style={styles.noMachineButtonsContainer}>
            <TouchableOpacity 
              style={styles.selectButton}
              onPress={() => navigation.navigate('MachineSelection')}
            >
              <MaterialIcons name="list" size={14} color="white" />
              <Text style={styles.buttonText}>Select Machine</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={() => navigation.navigate('QRScanner')}
            >
              <MaterialIcons name="qr-code-scanner" size={14} color="white" />
              <Text style={styles.buttonText}>Scan QR Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
      <View style={styles.container}>
        <DashboardHeader />
        
        {selectedMachine ? (
          <Tab.Navigator
            initialRouteName="DailyMaintenance"
            screenOptions={{
              tabBarActiveTintColor: '#5D6271',
              tabBarInactiveTintColor: '#AAADB7',
              tabBarIndicatorStyle: { backgroundColor: '#5D6271' },
              tabBarLabelStyle: { fontSize: 10, fontWeight: '500', marginTop: 0, padding: 0 },
              tabBarIconStyle: { marginBottom: 0 },
              tabBarStyle: { height: 40 }, // Make tabs smaller
            }}
          >
            <Tab.Screen 
              name="DailyMaintenance" 
              component={DailyMaintenanceScreen} 
              options={{ 
                tabBarLabel: 'Daily',
                tabBarIcon: ({ color }) => (
                  <MaterialIcons name="today" size={16} color={color} />
                ),
              }}
            />
            <Tab.Screen 
              name="PeriodicMaintenance" 
              component={PeriodicMaintenanceScreen} 
              options={{ 
                tabBarLabel: 'Periodic',
                tabBarIcon: ({ color }) => (
                  <MaterialIcons name="calendar-today" size={16} color={color} />
                ),
              }}
            />
            <Tab.Screen 
              name="Reporting" 
              component={FailureReportingScreen} 
              options={{ 
                tabBarLabel: 'Report Failure',
                tabBarIcon: ({ color }) => (
                  <MaterialIcons name="report-problem" size={16} color={color} />
                ),
              }}
            />
          </Tab.Navigator>
        ) : (
          <View style={styles.noMachineContent}>
            <MaterialIcons name="engineering" size={80} color="#CCCCCC" />
            <Text style={styles.noMachineTitle}>No Machine Selected</Text>
            <Text style={styles.noMachineDescription}>
              Please select a machine to view maintenance tasks and report issues.
            </Text>
            
            {testMode && (
              <View style={styles.testModeInfoContainer}>
                <MaterialIcons name="info" size={14} color="#5D6271" />
                <Text style={styles.testModeInfo}>
                  Test Mode is active. You can select machines without scanning QR codes.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerContainer: {
    backgroundColor: 'white',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  machineInfoContainer: {
    flexDirection: 'column',
  },
  machineNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  machineDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  machineName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  machineDetails: {
    fontSize: 12,
    color: '#666',
  },
  lastUpdateText: {
    fontSize: 10,
    color: '#888',
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 4,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 10,
    color: '#5D6271',
  },
  noMachineContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  noMachineText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  noMachineButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5D6271',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5D6271',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  buttonText: {
    marginLeft: 4,
    fontSize: 10,
    color: 'white',
  },
  noMachineContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noMachineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5D6271',
    marginTop: 12,
    marginBottom: 8,
  },
  noMachineDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  testModeBadge: {
    backgroundColor: '#5D6271',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  testModeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  testModeInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F7FF',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  testModeInfo: {
    marginLeft: 4,
    fontSize: 12,
    color: '#0066CC',
  },
});