import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};

export function NotificationProvider({ children }) {
  const [notif, setNotif] = useState(null);

  const showNotification = useCallback((message, type = 'info') => {
    setNotif({ message, type });
    setTimeout(() => setNotif(null), 4000);
  }, []);

  const hideNotification = useCallback(() => setNotif(null), []);

  const bgColor = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      {notif && (
        <View style={[styles.container, { backgroundColor: bgColor[notif.type] || bgColor.info }]}>
          <Text style={styles.iconText}>{icons[notif.type] || icons.info}</Text>
          <Text style={styles.text}>{notif.message}</Text>
          <TouchableOpacity onPress={hideNotification}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </NotificationContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginRight: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  close: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
