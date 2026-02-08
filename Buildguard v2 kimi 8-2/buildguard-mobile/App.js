import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import CameraScreen from './src/screens/CameraScreen';
import PhotoReviewScreen from './src/screens/PhotoReviewScreen';
import ProjectDetailScreen from './src/screens/ProjectDetailScreen';
import StagesScreen from './src/screens/StagesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OfflineQueueScreen from './src/screens/OfflineQueueScreen';

// Services
import { authService } from './src/services/authService';
import { syncService } from './src/services/syncService';

// Context
import { AuthProvider } from './src/context/AuthContext';
import { ProjectProvider } from './src/context/ProjectContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#00D4AA',
        tabBarInactiveTintColor: '#8B9EB0',
        tabBarStyle: {
          backgroundColor: '#0A1628',
          borderTopColor: '#1E3A5F',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        headerStyle: {
          backgroundColor: '#0A1628',
        },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Tab.Screen 
        name="Projects" 
        component={ProjectsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={[styles.tabIcon, { backgroundColor: color + '20' }]}>
              <Text style={[styles.tabIconText, { color }]}>P</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Camera" 
        component={CameraScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={[styles.cameraTabIcon, { backgroundColor: color }]}>
              <Text style={styles.cameraTabIconText}>+</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Stages" 
        component={StagesScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={[styles.tabIcon, { backgroundColor: color + '20' }]}>
              <Text style={[styles.tabIconText, { color }]}>S</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={[styles.tabIcon, { backgroundColor: color + '20' }]}>
              <Text style={[styles.tabIconText, { color }]}>Me</Text>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
    // Start sync service when app loads
    syncService.startSync();
    return () => {
      syncService.stopSync();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const token = await authService.getToken();
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.loadingText}>BuildGuard Pro</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0A1628',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen 
              name="Main" 
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="PhotoReview" 
              component={PhotoReviewScreen}
              options={{ 
                title: 'Review Photo',
                presentation: 'modal'
              }}
            />
            <Stack.Screen 
              name="ProjectDetail" 
              component={ProjectDetailScreen}
              options={{ title: 'Project Details' }}
            />
            <Stack.Screen 
              name="OfflineQueue" 
              component={OfflineQueueScreen}
              options={{ title: 'Offline Queue' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ProjectProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </ProjectProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A1628',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#00D4AA',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  tabIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cameraTabIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cameraTabIconText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0A1628',
  },
});
