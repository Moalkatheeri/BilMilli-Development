import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { syncService } from '../services/syncService';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [syncStatus, setSyncStatus] = useState({});
  const [storageStats, setStorageStats] = useState({});
  const [notifications, setNotifications] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    const sync = await syncService.getSyncStatus();
    const storage = await storageService.getStorageStats();
    setSyncStatus(sync);
    setStorageStats(storage);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };

  const handleForceSync = async () => {
    await syncService.forceSync();
    loadStats();
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            await storageService.clearCache();
            loadStats();
          }
        },
      ]
    );
  };

  const menuItems = [
    {
      title: 'Account',
      items: [
        { label: 'Edit Profile', icon: '👤', action: () => {} },
        { label: 'Change Password', icon: '🔒', action: () => {} },
        { label: 'Payment Methods', icon: '💳', action: () => {} },
      ],
    },
    {
      title: 'Projects',
      items: [
        { label: 'My Projects', icon: '🏗️', action: () => navigation.navigate('Projects') },
        { label: 'Documents', icon: '📄', action: () => {} },
        { label: 'Contracts', icon: '📋', action: () => {} },
      ],
    },
    {
      title: 'Data & Sync',
      items: [
        { 
          label: 'Offline Queue', 
          icon: '⏳', 
          badge: syncStatus.pendingItems,
          action: () => navigation.navigate('OfflineQueue') 
        },
        { 
          label: 'Force Sync', 
          icon: '🔄', 
          action: handleForceSync,
          disabled: syncStatus.isSyncing
        },
        { label: 'Clear Cache', icon: '🗑️', action: handleClearCache },
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'Help Center', icon: '❓', action: () => {} },
        { label: 'Contact Support', icon: '💬', action: () => {} },
        { label: 'Report a Bug', icon: '🐛', action: () => {} },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
        
        {user?.subscription && (
          <View style={styles.subscriptionBadge}>
            <Text style={styles.subscriptionText}>
              {user.subscription.plan.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{syncStatus.pendingItems || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{storageStats.cacheEntries || 0}</Text>
          <Text style={styles.statLabel}>Cached</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{storageStats.draftsCount || 0}</Text>
          <Text style={styles.statLabel}>Drafts</Text>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingIcon}>🔔</Text>
            <Text style={styles.settingLabel}>Notifications</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#1E3A5F', true: '#00D4AA' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingIcon}>✈️</Text>
            <Text style={styles.settingLabel}>Offline Mode</Text>
          </View>
          <Switch
            value={offlineMode}
            onValueChange={setOfflineMode}
            trackColor={{ false: '#1E3A5F', true: '#00D4AA' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Menu Sections */}
      {menuItems.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.menuSection}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, itemIndex) => (
            <TouchableOpacity
              key={itemIndex}
              style={[styles.menuItem, item.disabled && styles.menuItemDisabled]}
              onPress={item.action}
              disabled={item.disabled}
            >
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
                <Text style={styles.menuItemArrow}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>BuildGuard Pro v1.0.0</Text>
        <Text style={styles.appBuild}>Build 2024.01.15</Text>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#111D2E',
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00D4AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#0A1628',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#8B9EB0',
    fontSize: 14,
    marginTop: 4,
  },
  subscriptionBadge: {
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.3)',
  },
  subscriptionText: {
    color: '#00D4AA',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#0A1628',
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    color: '#00D4AA',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#8B9EB0',
    fontSize: 12,
    marginTop: 4,
  },
  
  settingsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    color: '#8B9EB0',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111D2E',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 1,
    borderRadius: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  
  menuSection: {
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111D2E',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 1,
    borderRadius: 12,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  menuItemLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuItemArrow: {
    color: '#8B9EB0',
    fontSize: 20,
  },
  
  appInfo: {
    alignItems: 'center',
    padding: 30,
  },
  appVersion: {
    color: '#8B9EB0',
    fontSize: 14,
  },
  appBuild: {
    color: '#5A6A7A',
    fontSize: 12,
    marginTop: 4,
  },
  
  logoutButton: {
    backgroundColor: '#1E3A5F',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  
  bottomPadding: {
    height: 40,
  },
});
