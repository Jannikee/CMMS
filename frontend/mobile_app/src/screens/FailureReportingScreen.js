import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchRCMFunctions, fetchSubsystems, reportDeviation } from '../services/api';

export default function FailureReportingScreen({ navigation }) {
  // Machine selection state
  const [selectedMachine, setSelectedMachine] = useState(null);
  
  // Loading states
  const [loadingSubsystems, setLoadingSubsystems] = useState(false);
  const [loadingFunctions, setLoadingFunctions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Data states
  const [subsystems, setSubsystems] = useState([]);
  const [functions, setFunctions] = useState([]);
  const [functionalFailures, setFunctionalFailures] = useState([]);
  const [failureModes, setFailureModes] = useState([]);
  
  // Selection state
  const [selectedSubsystem, setSelectedSubsystem] = useState(null);
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [skipToMode, setSkipToMode] = useState(true);
  
  // Report details
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('minor');
  const [images, setImages] = useState([]);
  
  // Step tracker
  const [currentStep, setCurrentStep] = useState(1);

  // Load selected machine when component mounts
  useEffect(() => {
    loadSelectedMachine();
  }, []);

  // Load subsystems when a machine is selected
  useEffect(() => {
    if (selectedMachine) {
      loadSubsystems();
    }
  }, [selectedMachine]);

  // Load functions when a subsystem is selected
  useEffect(() => {
    if (selectedSubsystem) {
      loadFunctions();
    }
  }, [selectedSubsystem]);

  // Load failures when a function is selected
  useEffect(() => {
    if (selectedFunction) {
      loadFunctionalFailures();
    }
  }, [selectedFunction]);

  // Load modes when a functional failure is selected
  useEffect(() => {
    if (selectedFailure) {
      loadFailureModes();
    }
  }, [selectedFailure]);

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

  const loadSubsystems = async () => {
    if (!selectedMachine) return;
    
    try {
      setLoadingSubsystems(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const subsystemsData = await fetchSubsystems(token, selectedMachine.id);
      setSubsystems(subsystemsData);
      
      // Reset other selections when subsystems change
      setSelectedSubsystem(null);
      setSelectedFunction(null);
      setSelectedFailure(null);
      setSelectedMode(null);
      setCurrentStep(1);
    } catch (error) {
      console.error('Error loading subsystems:', error);
      Alert.alert('Error', 'Failed to load subsystems');
    } finally {
      setLoadingSubsystems(false);
    }
  };

  const loadFunctions = async () => {
    try {
      setLoadingFunctions(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Get RCM functions for this subsystem
      const functionsData = await fetchRCMFunctions(token, selectedSubsystem.id);
      setFunctions(functionsData);
      
      // Reset downstream selections
      setSelectedFunction(null);
      setSelectedFailure(null);
      setSelectedMode(null);
    } catch (error) {
      console.error('Error loading functions:', error);
      Alert.alert('Error', 'Failed to load functions');
    } finally {
      setLoadingFunctions(false);
    }
  };

  const loadFunctionalFailures = () => {
    // In a real app, you would fetch this from the API
    // For now, we'll use the failures from the selected function
    if (selectedFunction && selectedFunction.functional_failures) {
      setFunctionalFailures(selectedFunction.functional_failures);
    } else {
      setFunctionalFailures([]);
    }
    
    // Reset downstream selections
    setSelectedFailure(null);
    setSelectedMode(null);
  };

  const loadFailureModes = () => {
    // In a real app, you would fetch this from the API
    // For now, we'll use the modes from the selected failure
    if (selectedFailure && selectedFailure.failure_modes) {
      setFailureModes(selectedFailure.failure_modes);
    } else {
      setFailureModes([]);
    }
    
    // Reset downstream selection
    setSelectedMode(null);
  };

  const handleSubsystemSelect = (subsystem) => {
    setSelectedSubsystem(subsystem);
    setCurrentStep(2);
  };

  const handleFunctionSelect = (func) => {
    setSelectedFunction(func);
    
    if (skipToMode && func.failure_modes && func.failure_modes.length > 0) {
      // Skip directly to failure modes
      setFailureModes(func.failure_modes);
      setCurrentStep(4);
    } else {
      setCurrentStep(3);
    }
  };

  const handleFailureSelect = (failure) => {
    setSelectedFailure(failure);
    setCurrentStep(4);
  };

  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
    setCurrentStep(5);
  };

  const handleAddImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Permission to access camera roll is required');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Add the new image to the existing images array
        setImages([...images, result.assets[0]]);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Permission to access camera is required');
        return;
      }
      
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Add the new image to the existing images array
        setImages([...images, result.assets[0]]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleRemoveImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const handleSubmitReport = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description of the issue');
      return;
    }
    
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Prepare the report data
      const reportData = {
        machine_id: selectedMachine.id,
        subsystem_id: selectedSubsystem ? selectedSubsystem.id : null,
        component_id: null, // You might want to add component selection
        description: description,
        severity: severity,
        deviation_description: description,
        has_deviation: true,
        failure_data: {
          function_id: selectedFunction ? selectedFunction.id : null,
          functional_failure_id: selectedFailure ? selectedFailure.id : null,
          failure_mode_id: selectedMode ? selectedMode.id : null,
        }
      };
      
      // Convert images to the format expected by the API
      const imageFiles = images.map(img => ({
        uri: img.uri,
        type: 'image/jpeg',
        name: 'failure_image.jpg'
      }));
      
      // Submit the report
      const result = await reportDeviation(token, reportData, imageFiles);
      
      Alert.alert(
        "Report Submitted",
        "Your failure report has been submitted successfully",
        [{ text: "OK", onPress: () => resetForm() }]
      );

  const NoMachineSelected = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="qr-code-scanner" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Machine Selected</Text>
      <Text style={styles.emptyMessage}>
        Scan a machine QR code to report a failure
      </Text>
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={() => navigation.navigate('QRScanner')}
      >
        <Text style={styles.scanButtonText}>Scan QR Code</Text>
      </TouchableOpacity>
    </View>
  );

  // Render appropriate step based on current step state
  const renderCurrentStep = () => {
    if (!selectedMachine) {
      return <NoMachineSelected />;
    }

    switch (currentStep) {
      case 1:
        return renderSubsystemStep();
      case 2:
        return renderFunctionStep();
      case 3:
        return renderFailureStep();
      case 4:
        return renderModeStep();
      case 5:
        return renderDetailsStep();
      default:
        return renderSubsystemStep();
    }
  };

  // Navigation buttons for moving between steps
  const renderNavButtons = () => {
    if (!selectedMachine || currentStep === 5) return null;

    return (
      <View style={styles.navButtonsContainer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <MaterialIcons name="arrow-back" size={20} color="#5D6271" />
            <Text style={styles.navButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        {currentStep < 5 && skipToMode && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => setCurrentStep(5)}
          >
            <Text style={styles.skipButtonText}>Skip to Details</Text>
            <MaterialIcons name="skip-next" size={20} color="#5D6271" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderCurrentStep()}
      {renderNavButtons()}
    </View>
  );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedSubsystem(null);
    setSelectedFunction(null);
    setSelectedFailure(null);
    setSelectedMode(null);
    setDescription('');
    setSeverity('minor');
    setImages([]);
    setCurrentStep(1);
  };

  const renderSubsystemStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Subsystem</Text>
      
      {loadingSubsystems ? (
        <ActivityIndicator size="large" color="#5D6271" />
      ) : (
        <ScrollView style={styles.optionsContainer}>
          {subsystems.map(subsystem => (
            <TouchableOpacity
              key={subsystem.id}
              style={styles.optionItem}
              onPress={() => handleSubsystemSelect(subsystem)}
            >
              <Text style={styles.optionText}>{subsystem.name}</Text>
              <MaterialIcons name="chevron-right" size={24} color="#5D6271" />
            </TouchableOpacity>
          ))}
          
          {subsystems.length === 0 && (
            <Text style={styles.emptyText}>No subsystems found</Text>
          )}
        </ScrollView>
      )}
    </View>
  );

  const renderFunctionStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Function</Text>
      
      {loadingFunctions ? (
        <ActivityIndicator size="large" color="#5D6271" />
      ) : (
        <ScrollView style={styles.optionsContainer}>
          {functions.map(func => (
            <TouchableOpacity
              key={func.id}
              style={styles.optionItem}
              onPress={() => handleFunctionSelect(func)}
            >
              <Text style={styles.optionText}>{func.name}</Text>
              <MaterialIcons name="chevron-right" size={24} color="#5D6271" />
            </TouchableOpacity>
          ))}
          
          {functions.length === 0 && (
            <Text style={styles.emptyText}>No functions found</Text>
          )}
        </ScrollView>
      )}
    </View>
  );

  const renderFailureStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Functional Failure</Text>
      
      <ScrollView style={styles.optionsContainer}>
        {functionalFailures.map(failure => (
          <TouchableOpacity
            key={failure.id}
            style={styles.optionItem}
            onPress={() => handleFailureSelect(failure)}
          >
            <Text style={styles.optionText}>{failure.name}</Text>
            <MaterialIcons name="chevron-right" size={24} color="#5D6271" />
          </TouchableOpacity>
        ))}
        
        {functionalFailures.length === 0 && (
          <Text style={styles.emptyText}>No functional failures found</Text>
        )}
      </ScrollView>
    </View>
  );

  const renderModeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Failure Mode</Text>
      
      <ScrollView style={styles.optionsContainer}>
        {failureModes.map(mode => (
          <TouchableOpacity
            key={mode.id}
            style={styles.optionItem}
            onPress={() => handleModeSelect(mode)}
          >
            <Text style={styles.optionText}>{mode.name}</Text>
            <MaterialIcons name="chevron-right" size={24} color="#5D6271" />
          </TouchableOpacity>
        ))}
        
        {failureModes.length === 0 && (
          <Text style={styles.emptyText}>No failure modes found</Text>
        )}
      </ScrollView>
    </View>
  );

  const renderDetailsStep = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.stepContainer}
    >
      <ScrollView contentContainerStyle={styles.detailsContainer}>
        <Text style={styles.stepTitle}>Failure Details</Text>
        
        <View style={styles.selectionSummary}>
          <Text style={styles.summaryLabel}>Selection:</Text>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryKey}>Subsystem:</Text>
            <Text style={styles.summaryValue}>{selectedSubsystem?.name || 'Not selected'}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryKey}>Function:</Text>
            <Text style={styles.summaryValue}>{selectedFunction?.name || 'Not selected'}</Text>
          </View>
          
          {selectedFailure && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryKey}>Functional Failure:</Text>
              <Text style={styles.summaryValue}>{selectedFailure.name}</Text>
            </View>
          )}
          
          {selectedMode && (
            <View style={styles.summaryItem}>
            <Text style={styles.summaryKey}>Failure Mode:</Text>
            <Text style={styles.summaryValue}>{selectedMode.name}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Failure Description</Text>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={4}
          placeholder="Describe the failure in detail..."
          value={description}
          onChangeText={setDescription}
        />
      </View>
      
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Severity</Text>
        
        <View style={styles.severityContainer}>
          <TouchableOpacity
            style={[
              styles.severityOption,
              severity === 'minor' && styles.selectedSeverity
            ]}
            onPress={() => setSeverity('minor')}
          >
            <Text style={[
              styles.severityText,
              severity === 'minor' && styles.selectedSeverityText
            ]}>
              Minor
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.severityOption,
              severity === 'major' && styles.selectedSeverity
            ]}
            onPress={() => setSeverity('major')}
          >
            <Text style={[
              styles.severityText,
              severity === 'major' && styles.selectedSeverityText
            ]}>
              Major
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.severityOption,
              severity === 'critical' && styles.selectedSeverity
            ]}
            onPress={() => setSeverity('critical')}
          >
            <Text style={[
              styles.severityText,
              severity === 'critical' && styles.selectedSeverityText
            ]}>
              Critical
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Attach Images</Text>
        
        <View style={styles.imageButtons}>
          <TouchableOpacity style={styles.imageButton} onPress={handleTakePhoto}>
            <MaterialIcons name="camera-alt" size={24} color="#5D6271" />
            <Text style={styles.imageButtonText}>Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.imageButton} onPress={handleAddImage}>
            <MaterialIcons name="photo-library" size={24} color="#5D6271" />
            <Text style={styles.imageButtonText}>Upload Image</Text>
          </TouchableOpacity>
        </View>
        
        {images.length > 0 && (
          <View style={styles.imagesContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveImage(index)}
                >
                  <MaterialIcons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmitReport}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView>
);
}