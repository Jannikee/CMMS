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
  /*
  const handleLogin = async () => {
    if (!username || !password) {
      console.log("Missing username or password");
      return;
    }
  
    console.log(`Attempting login with username: ${username}`);
    
    try {
      // Make sure your API URL is correct - check if it needs to be your computer's IP address
      // instead of localhost, especially when testing on a real device
      console.log("Sending login request to:", API_URL);
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });
      
      console.log("Server response status:", response.status);
      
      const data = await response.json();
      console.log("Server response data:", data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Store the token
      await AsyncStorage.setItem('userToken', data.access_token);
      console.log("Login successful, token stored");
      
      // Navigate to next screen
      navigation.navigate('Dashboard');
    } catch (error) {
      console.error('Login error:', error);
      // Display error message to user
      Alert.alert('Login Failed', error.message || 'Please check your credentials');
    }
  };*/