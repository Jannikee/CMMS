// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import QRScannerScreen from './src/screens/QRScreen';
import RuntimeScreen from './src/screens/RuntimeScreen';
import WorkOrderDetailScreen from './src/screens/WorkOrderDetailsScreen';
import MachineSelectionScreen from './src/screens/MachineSelectionScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
      } catch (e) {
        console.log('Failed to get token from storage');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  // If still loading, could show a splash screen
  if (isLoading) {
    return null; // Or a splash screen component
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {userToken == null ? (
          // No token found, user isn't signed in
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
        ) : (
          // User is signed in
          <>
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen} 
              options={{ 
                title: 'Vedlikeholdssystem',
                headerStyle: {
                  backgroundColor: '#5D6271',
                },
                headerTintColor: '#fff',
                headerShown: false, // Hide header as we have custom one in Dashboard
              }}
            />
            <Stack.Screen 
              name="MachineSelection" 
              component={MachineSelectionScreen} 
              options={{ 
                title: 'Select Machine',
                headerStyle: {
                  backgroundColor: '#5D6271',
                },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen 
              name="QRScanner" 
              component={QRScannerScreen} 
              options={{ 
                title: 'Scan QR Code',
                headerStyle: {
                  backgroundColor: '#5D6271',
                },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen 
              name="Runtime" 
              component={RuntimeScreen} 
              options={{ 
                title: 'Update runtime',
                headerStyle: {
                  backgroundColor: '#5D6271',
                },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen 
              name="WorkOrderDetail" 
              component={WorkOrderDetailScreen} 
              options={{ 
                title: 'Work Order Details',
                headerStyle: {
                  backgroundColor: '#5D6271',
                },
                headerTintColor: '#fff',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}