import { useState } from 'react';
import { useStore } from '../store/index.js';
import { login as loginApi, register as registerApi } from '../services/api.js';

const useAuth = () => {
  const { user, token, login: storeLogin, logout: storeLogout } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await loginApi(credentials);
      storeLogin(response.data.user, response.data.token);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await registerApi(userData);
      storeLogin(response.data.user, response.data.token);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    storeLogout();
  };

  return { user, token, login, logout, register, loading, error };
};

export default useAuth;