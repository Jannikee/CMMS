import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  ActivityIndicator,
  Switch
} from 'react-native';
import { Camera } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UpdateHoursScreen({ route, navigation }) {
  const { machine } = route.params;
  const [hours, setHours] = useState('');
  const [useCamera, setUseCamera] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const cameraRef = useRef(null);

  // Check if we already updated hours today
  React.useEffect(() => {
    checkLastUpdate();
    
    // Request camera permission if using camera
    if (useCamera) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }
  }, [useCamera]);

  const checkLastUpdate = async () => {
    try {
      const lastUpdateData = await AsyncStorage.getItem(`lastHoursUpdate_${machine.id}`);
      if (lastUpdateData) {
        const update = JSON.parse(lastUpdateData);
        setLastUpdate(update);
        
        // Check if updated today already
        const today = new Date().toDateString();
        const updateDate = new Date(update.date).toDateString();
        
        if (today === updateDate) {
          Alert.alert(
            "Hours Already Updated Today",
            `You've already updated this machine's hours to ${update.hours} today. Do you want to update again?`,
            [
              {
                text: "Cancel",
                onPress: () => navigation.goBack(),
                style: "cancel"
              },
              { text: "Update Again", onPress: () => {} }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error checking last update:', error);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
        });
        setCapturedImage(photo);
        
        // Here you would normally do OCR to extract the hour counter value
        // For now we'll simulate it with a delay and a random value
        Alert.alert(
          "Processing Image",
          "Processing the image to extract hour counter value...",
          [{ text: "OK" }]
        );
        
        setTimeout(() => {
          // Simulate extracting a value close to the machine's current hour counter
          const baseHours = machine.hour_counter || 100;
          const extractedHours = Math.floor(baseHours + Math.random() * 10).toString();
          setHours(extractedHours);
          
          Alert.alert(
            "Hours Detected",
            `Detected ${extractedHours} hours. You can edit this value if needed.`,
            [{ text: "OK" }]
          );
        }, 2000);
        
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert("Error", "Failed to capture image");
      }
    }
  };

  const submitHours = async () => {
    if (!hours) {
      Alert.alert("Error", "Please enter the hour counter value");
      return;
    }
    
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Call API to update machine hours
      const response = await fetch(`http://127.0.0.1:5000/api/machines/${machine.id}/hours`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hour_counter: parseFloat(hours)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update hours');
      }
      
      // Save last update information
      const updateInfo = {
        date: new Date().toISOString(),
        hours: parseFloat(hours)
      };
      
      await AsyncStorage.setItem(`lastHoursUpdate_${machine.id}`, JSON.stringify(updateInfo));
      
      Alert.alert(
        "Hours Updated",
        `${machine.name} hour counter updated to ${hours}`,
        [
          {
            text: "OK",
            onPress: () => navigation.navigate('Dashboard')
          }
        ]
      );
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Update Hour Counter</Text>
      <Text style={styles.machineInfo}>{machine.name}</Text>
      <Text style={styles.machineId}>ID: {machine.technical_id}</Text>
      
      {lastUpdate && (
        <View style={styles.lastUpdateContainer}>
          <Text style={styles.lastUpdateText}>
            Last updated: {new Date(lastUpdate.date).toLocaleString()} ({lastUpdate.hours} hours)
          </Text>
        </View>
      )}
      
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Use Camera to Scan Hour Counter</Text>
        <Switch
          value={useCamera}
          onValueChange={setUseCamera}
          trackColor={{ false: "#767577", true: "#5D6271" }}
          thumbColor={useCamera ? "#ffffff" : "#f4f3f4"}
        />
      </View>
      
      {useCamera ? (
        <View style={styles.cameraContainer}>
          {hasPermission === false && (
            <Text style={styles.errorText}>No access to camera</Text>
          )}
          
          {hasPermission === true && !capturedImage && (
            <>
              <Camera
                ref={cameraRef}
                style={styles.camera}
                type={Camera.Constants.Type.back}
              >
                <View style={styles.cameraOverlay}>
                  <Text style={styles.cameraInstructions}>
                    Position the hour counter display within the frame
                  </Text>
                </View>
              </Camera>
              
              <TouchableOpacity 
                style={styles.captureButton}
                onPress={takePicture}
              >
                <MaterialIcons name="camera" size={32} color="white" />
              </TouchableOpacity>
            </>
          )}
          
          {capturedImage && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: capturedImage.uri }} style={styles.preview} />
              <TouchableOpacity 
                style={styles.retakeButton}
                onPress={() => setCapturedImage(null)}
              >
                <Text style={styles.buttonText}>Retake</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.manualEntryContainer}>
          <Text style={styles.label}>Current Hour Counter Reading</Text>
          <TextInput
            style={styles.input}
            value={hours}
            onChangeText={setHours}
            placeholder="Enter hour counter value"
            keyboardType="numeric"
          />
          
          {machine.hour_counter && (
            <Text style={styles.previousReading}>
              Previous reading: {machine.hour_counter} hours
            </Text>
          )}
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={submitHours}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Update Hours</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#5D6271',
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
  lastUpdateContainer: {
    backgroundColor: '#E6F7FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  lastUpdateText: {
    fontSize: 14,
    color: '#0066CC',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  cameraInstructions: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  captureButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#5D6271',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  retakeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#5D6271',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  manualEntryContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    width: '100%',
  },
  previousReading: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: '#5D6271',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#5D6271',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButtonText: {
    color: '#5D6271',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: 'tomato',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});