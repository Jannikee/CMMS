import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with base URL
const authAPI = axios.create({
  baseURL: `${API_URL}/api/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add auth token
authAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Login user
export const loginUser = async (username, password) => {
  try {
    console.log("Sender login request...");                                 //Tester
    const response = await authAPI.post('/login', { username, password });
    console.log("Server response:", response.data);                         //tester
    
    // Store the token in localStorage
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      
      return {
        username: response.data.username,
        role: response.data.role,
        token: response.data.access_token,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Login error:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to login');
  }
};

// Register new user (for admin use)
export const registerUser = async (userData) => {
  try {
    const response = await authAPI.post('/register', userData);
    return response.data;
  } catch (error) {
    console.error('Registration error:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to register user');
  }
};

// Check if user is already authenticated
export const checkAuthStatus = async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return null;
  }
  
  try {
    // For JWT, we need a protected endpoint to validate the token
    // If your backend doesn't have a specific endpoint for this,
    // you can use any protected endpoint to verify token validity
    
    // You could also decode the JWT locally to get user info
    // BUT the token should still be validated with the server
    const payload = parseJwt(token);
    
    if (payload) {
      // Fetch user details if necessary
      // For now, we'll just return basic info
      return {
        username: payload.username || 'User',
        role: payload.role || 'worker',
        token: token,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Auth check error:', error);
    localStorage.removeItem('token');
    return null;
  }
};

// Parse JWT token (basic client-side parsing)
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse JWT token:', e);
    return null;
  }
}
export const fetchUsers = async () => {
  try {
    const response = await authAPI.get('/users'); // Calls Flask API
    return response.data.users; // Extracts user list from response
  } catch (error) {
    console.error('Fetch users error:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch users');
  }
};