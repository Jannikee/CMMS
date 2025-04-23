import { createContext } from 'react';

// Create an authentication context
export const AuthContext = createContext({
  user: null,
  onLogin: () => {},
  onLogout: () => {},
});