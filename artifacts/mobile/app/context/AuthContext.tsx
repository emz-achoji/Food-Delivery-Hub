import React, { useEffect, useState } from 'react';
import { createContext } from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, apiPost } from '../lib/api';

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'admin';
  createdAt: string;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  register: (name: string, email: string, phone?: string, address?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContext<AuthContextType>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('maxfoods_user');
        if (storedUserId) {
          const userData = await apiGet('/auth/me', { 'x-user-id': storedUserId });
          if (userData.email === 'admin@maxfoods.com') {
            userData.role = 'admin';
          }
          setUser(userData);
          setToken(storedUserId); // using user id as token for simplicity in this mock
        }
      } catch (e) {
        console.log('Failed to load user', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await apiPost('/auth/login', { email });
      let loggedInUser = response.user;
      if (loggedInUser.email === 'admin@maxfoods.com') {
        loggedInUser.role = 'admin';
      }
      setUser(loggedInUser);
      setToken(response.token);
      await AsyncStorage.setItem('maxfoods_user', loggedInUser.id);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, phone?: string, address?: string) => {
    setIsLoading(true);
    try {
      const response = await apiPost('/auth/register', { name, email, phone, address });
      let registeredUser = response.user;
      if (registeredUser.email === 'admin@maxfoods.com') {
        registeredUser.role = 'admin';
      }
      setUser(registeredUser);
      setToken(response.token);
      await AsyncStorage.setItem('maxfoods_user', registeredUser.id);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('maxfoods_user');
  };

  return { user, token, isLoading, login, register, logout };
});
