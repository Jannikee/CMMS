import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera } from 'expo-camera';
//import { BarCodeScanner } from 'expo-barcode-scanner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

export default function QRScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    
    // Check if machine is already selected
    checkMachineSelection();
  }, []);

  const checkMachineSelection = async () => {
    try {
      const machineData = await AsyncStorage.getItem('selectedMachine');
      if (machineData) {
        const machine = JSON.parse(machineData);
        setSelectedMachine(machine);
      }
    } catch (error) {
      console.error('Error retrieving selected machine:', error);
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    
    try {
      // Validate the QR code content
      // Expecting format: a UUID that represents the machine's QR code
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Call your API to validate and get machine details
      const response = await fetch(`http://127.0.0.1:5000/api/machines/qrcode/${data}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Invalid QR code or machine not found');
      }
      
      const machineData = await response.json();
      
      // Save the selected machine to AsyncStorage
      await AsyncStorage.setItem('selectedMachine', JSON.stringify(machineData.machine));
      
      // Update state
      setSelectedMachine(machineData.machine);
      
      // Show confirmation
      Alert.alert(
        "Machine Selected",
        `You have selected ${machineData.machine.name}`,
        [
          {
            text: "Update Hours",
            onPress: () => navigation.navigate('Runtime', { machine: machineData.machine })
          },
          {
            text: "Continue",
            onPress: () => navigation.navigate('Dashboard')
          }
        ]
      );
    } catch (error) {
      Alert.alert("Error", error.message);
      setScanned(false);
    }
  };
  
  const continueWithSelected = () => {
    if (selectedMachine) {
      navigation.navigate('Dashboard');
    }
  };
  
  const selectNewMachine = () => {
    setScanned(false);
  };
  
  const updateHours = () => {
    if (selectedMachine) {
      navigation.navigate('Runtime', { machine: selectedMachine });
    }
  };

  const enableTestMode = async () => {
    try {
      // Set test mode flag
      await AsyncStorage.setItem('testMode', 'true');
      
      // Navigate to machine selection screen
      navigation.navigate('MachineSelection');
    } catch (error) {
      console.error('Error enabling test mode:', error);
      Alert.alert('Error', 'Failed to enable test mode');
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera access is required to scan QR codes.</Text>
        
        <TouchableOpacity 
          style={styles.testModeButton}
          onPress={enableTestMode}
        >
          <MaterialIcons name="bug-report" size={24} color="white" />
          <Text style={styles.testModeButtonText}>Enable Test Mode</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedMachine ? (
        <View style={styles.selectedContainer}>
          <MaterialIcons name="check-circle" size={64} color="#5D6271" />
          <Text style={styles.title}>Machine Selected</Text>
          <Text style={styles.machineInfo}>{selectedMachine.name}</Text>
          <Text style={styles.machineId}>ID: {selectedMachine.technical_id}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.button}
              onPress={updateHours}
            >
              <Text style={styles.buttonText}>Update Hours</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button}
              onPress={continueWithSelected}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={selectNewMachine}
          >
            <Text style={styles.secondaryButtonText}>Scan Different Machine</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.scannerContainer}>
          <Text style={styles.title}>Scan Machine QR Code</Text>
          <Text style={styles.instruction}>Position the QR code within the frame to select a machine.</Text>
          
          <View style={styles.cameraContainer}>
            <Camera
              style={styles.camera}
              type={Camera.Constants.Type.back}
              onBarCodeScanned={handleBarCodeScanned}
              barCodeScannerSettings={{
                barCodeTypes: ['qr'],
               }}
             //onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
              <View style={styles.overlay}>
                <View style={styles.unfilled} />
                <View style={styles.row}>
                  <View style={styles.unfilled} />
                  <View style={styles.scanArea} />
                  <View style={styles.unfilled} />
                </View>
                <View style={styles.unfilled} />
              </View>
            </Camera>
          </View>
          
          <TouchableOpacity 
            style={styles.testModeButton}
            onPress={enableTestMode}
          >
            <MaterialIcons name="bug-report" size={24} color="white" />
            <Text style={styles.testModeButtonText}>Enable Test Mode</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  selectedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  scannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#5D6271',
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  machineInfo: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
  },
  machineId: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 12,
    marginBottom: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  unfilled: {
    flex: 1,
  },
  row: {
    flex: 3,
    flexDirection: 'row',
  },
  scanArea: {
    flex: 5,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#5D6271',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#5D6271',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#5D6271',
    fontSize: 16,
  },
  errorText: {
    color: 'tomato',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  testModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
  },
  testModeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});/*Trying test mode
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

export default function QRScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    
    // Check if machine is already selected
    checkMachineSelection();
  }, []);

  const checkMachineSelection = async () => {
    try {
      const machineData = await AsyncStorage.getItem('selectedMachine');
      if (machineData) {
        const machine = JSON.parse(machineData);
        setSelectedMachine(machine);
      }
    } catch (error) {
      console.error('Error retrieving selected machine:', error);
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    
    try {
      // Validate the QR code content
      // Expecting format: a UUID that represents the machine's QR code
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Call your API to validate and get machine details
      const response = await fetch(`http://127.0.0.1:5000/api/machines/qrcode/${data}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Invalid QR code or machine not found');
      }
      
      const machineData = await response.json();
      
      // Save the selected machine to AsyncStorage
      await AsyncStorage.setItem('selectedMachine', JSON.stringify(machineData.machine));
      
      // Update state
      setSelectedMachine(machineData.machine);
      
      // Show confirmation
      Alert.alert(
        "Machine Selected",
        `You have selected ${machineData.machine.name}`,
        [
          {
            text: "Update Hours",
            onPress: () => navigation.navigate('UpdateHours', { machine: machineData.machine })
          },
          {
            text: "Continue",
            onPress: () => navigation.navigate('Dashboard')
          }
        ]
      );
    } catch (error) {
      Alert.alert("Error", error.message);
      setScanned(false);
    }
  };
  
  const continueWithSelected = () => {
    if (selectedMachine) {
      navigation.navigate('Dashboard');
    }
  };
  
  const selectNewMachine = () => {
    setScanned(false);
  };
  
  const updateHours = () => {
    if (selectedMachine) {
      navigation.navigate('UpdateHours', { machine: selectedMachine });
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera access is required to scan QR codes.</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.buttonText}>Continue Without Scanning</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedMachine ? (
        <View style={styles.selectedContainer}>
          <MaterialIcons name="check-circle" size={64} color="#5D6271" />
          <Text style={styles.title}>Machine Selected</Text>
          <Text style={styles.machineInfo}>{selectedMachine.name}</Text>
          <Text style={styles.machineId}>ID: {selectedMachine.technical_id}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.button}
              onPress={updateHours}
            >
              <Text style={styles.buttonText}>Update Hours</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button}
              onPress={continueWithSelected}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={selectNewMachine}
          >
            <Text style={styles.secondaryButtonText}>Scan Different Machine</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.scannerContainer}>
          <Text style={styles.title}>Scan Machine QR Code</Text>
          <Text style={styles.instruction}>Position the QR code within the frame to select a machine.</Text>
          
          <View style={styles.cameraContainer}>
            <Camera
              style={styles.camera}
              type={Camera.Constants.Type.back}
              barCodeScannerSettings={{
                barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
              }}
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
              <View style={styles.overlay}>
                <View style={styles.unfilled} />
                <View style={styles.row}>
                  <View style={styles.unfilled} />
                  <View style={styles.scanArea} />
                  <View style={styles.unfilled} />
                </View>
                <View style={styles.unfilled} />
              </View>
            </Camera>
          </View>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.secondaryButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  selectedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  scannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#5D6271',
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  machineInfo: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
  },
  machineId: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 12,
    marginBottom: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  unfilled: {
    flex: 1,
  },
  row: {
    flex: 3,
    flexDirection: 'row',
  },
  scanArea: {
    flex: 5,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#5D6271',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#5D6271',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#5D6271',
    fontSize: 16,
  },
  errorText: {
    color: 'tomato',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});
*/