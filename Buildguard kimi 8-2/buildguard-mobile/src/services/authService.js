import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'buildguard_auth_token';
const USER_KEY = 'buildguard_user';
const REFRESH_TOKEN_KEY = 'buildguard_refresh_token';

class AuthService {
  async setToken(token) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
      // Fallback to AsyncStorage if SecureStore fails
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  }

  async getToken() {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) return token;
      // Fallback to AsyncStorage
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async removeToken() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  async setRefreshToken(token) {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  }

  async getRefreshToken() {
    try {
      const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (token) return token;
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      return null;
    }
  }

  async removeRefreshToken() {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error removing refresh token:', error);
    }
  }

  async setUser(user) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  async getUser() {
    try {
      const user = await AsyncStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async removeUser() {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  }

  async logout() {
    await this.removeToken();
    await this.removeRefreshToken();
    await this.removeUser();
  }

  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  }

  // Validate token format (basic check)
  isValidTokenFormat(token) {
    if (!token) return false;
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    return parts.length === 3;
  }
}

export const authService = new AuthService();
