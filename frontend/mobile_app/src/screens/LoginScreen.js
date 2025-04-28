// screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { login } from '../services/api';
//import { AuthContext } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
//import { login } from '../services/api';
import { mockLogin } from '../services/mockDataService'; // Make sure to import this


export default function LoginScreen({ navigation }) {
  //const { onLogin } = useContext(AuthContext);        // added
  const [error, setError] = useState(null);           //added
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      navigation.replace('Dashboard');
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials');
    } finally {
      setLoading(false);
    }
  };
  // ... existing code ...
  // Function to enable test mode and login
  const handleTestModeLogin = async () => {
    try {
      setLoading(true);
      
      // Set test mode flag in AsyncStorage
      await AsyncStorage.setItem('testMode', 'true');
      
      // Use mock login function directly
      const testUser = await mockLogin('testuser', 'password');
      
      // Store token
      await AsyncStorage.setItem('userToken', testUser.access_token);

      navigation.replace('Dashboard');
      
      // Trigger login in the app context
      //onLogin(testUser);
      
    } catch (error) {
      console.error('Test mode login error:', error);
      setError('Failed to login with test mode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>CMMS</Text>
        <Text style={styles.tagline}>Vedlikeholdssystem</Text>
        <TouchableOpacity 
        style={styles.testModeButton}
        onPress={handleTestModeLogin}
        disabled={loading}
        >
        <Text style={styles.testModeText}>Test Mode Login</Text>
      </TouchableOpacity>
    </View>
      
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Brukernavn"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Passord"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? 'Logger inn...' : 'Logg inn'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5D6271',
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#5D6271',
    height: 50,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});