// MachineSelectionScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MachineSelectionScreen({ navigation, route }) {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filteredMachines, setFilteredMachines] = useState([]);

  // Load machines when component mounts
  useEffect(() => {
    loadMachines();
  }, []);

  // Filter machines when search text changes
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredMachines(machines);
    } else {
      const filtered = machines.filter(machine => 
        machine.name.toLowerCase().includes(searchText.toLowerCase()) ||
        machine.technical_id.toLowerCase().includes(searchText.toLowerCase()) ||
        machine.location.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredMachines(filtered);
    }
  }, [machines, searchText]);

  const loadMachines = async () => {
    try {
      setLoading(true);
      
      // In a real app, you would fetch from the API
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch('http://192.168.10.116:5000/api/machines', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch machines');
      }
      
      const data = await response.json();
      setMachines(data.machines);
      setFilteredMachines(data.machines);
    } catch (error) {
      console.error('Error loading machines:', error);
      Alert.alert('Error', 'Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  const handleMachineSelect = async (machine) => {
    try {
      // Store selected machine in AsyncStorage
      await AsyncStorage.setItem('selectedMachine', JSON.stringify(machine));
      
      // Show confirmation
      Alert.alert(
        "Machine Selected",
        `You have selected ${machine.name}`,
        [
          {
            text: "Update Hours",
            onPress: () => navigation.navigate('Runtime', { machine: machine })
          },
          {
            text: "Continue",
            onPress: () => navigation.navigate('Dashboard')
          }
        ]
      );
    } catch (error) {
      console.error('Error saving selected machine:', error);
      Alert.alert('Error', 'Failed to select machine');
    }
  };

  const renderMachineItem = ({ item }) => (
    <TouchableOpacity
      style={styles.machineItem}
      onPress={() => handleMachineSelect(item)}
    >
      <View style={styles.machineInfo}>
        <Text style={styles.machineName}>{item.name}</Text>
        <Text style={styles.machineId}>ID: {item.technical_id}</Text>
        <Text style={styles.machineLocation}>{item.location}</Text>
        
        {item.hour_counter !== undefined && (
          <View style={styles.hoursContainer}>
            <Text style={styles.hoursText}>{item.hour_counter} hours</Text>
          </View>
        )}
      </View>
      
      <MaterialIcons name="chevron-right" size={24} color="#5D6271" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Equipment</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID, or location..."
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchText('')}
          >
            <MaterialIcons name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5D6271" />
          <Text style={styles.loadingText}>Loading equipment...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMachines}
          renderItem={renderMachineItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={64} color="#CCCCCC" />
              <Text style={styles.emptyTitle}>No Equipment Found</Text>
              <Text style={styles.emptyMessage}>
                {searchText.length > 0
                  ? 'Try adjusting your search criteria'
                  : 'No equipment is available'}
              </Text>
            </View>
          }
        />
      )}
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => navigation.navigate('QRScanner')}
        >
          <MaterialIcons name="qr-code-scanner" size={20} color="white" />
          <Text style={styles.scanButtonText}>Scan QR Code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5D6271',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  listContainer: {
    paddingBottom: 80, // Leave space for footer
  },
  machineItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  machineInfo: {
    flex: 1,
  },
  machineName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  machineId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  machineLocation: {
    fontSize: 14,
    color: '#666',
  },
  hoursContainer: {
    marginTop: 8,
    backgroundColor: '#F0F2F5',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  hoursText: {
    fontSize: 12,
    color: '#5D6271',
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
    marginTop: 80,
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
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  scanButton: {
    backgroundColor: '#5D6271',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});