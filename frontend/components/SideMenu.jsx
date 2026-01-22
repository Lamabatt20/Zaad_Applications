import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SideMenu({ visible, onClose, navigation, user = {}, sourceScreen = 'ChatBot', darkMode = false }) {
  if (!visible) return null;

  const bgColor = darkMode ? "#1c1c1c" : "#EBE1D7";
  const textColor = darkMode ? "#fff" : "#2f2f2f";

  const { user_id, username, email, full_name, phone, role, address } = user;

  const handleLogout = async () => {
    await AsyncStorage.clear();
    onClose();
    navigation.navigate('Login');
  };

  return (
    <>
      <TouchableOpacity style={styles.overlay} onPress={onClose} />

      <Animated.View style={[styles.sidebarLeft, { backgroundColor: bgColor }]}>
        <View style={styles.profileBox}>
          <Image source={require('../assets/profile.png')} style={[styles.profileImg,{ tintColor: textColor }]} />
          <Text style={[styles.profileName, { color: textColor }]}>{username || 'Donor'}</Text>
          <Text style={[styles.profileEmail, { color: textColor }]}>{email || ''}</Text>
        </View>

        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => {
            onClose();
            navigation.navigate('ChooseDonationType', { user_id, username, email, full_name, phone, role, address });
          }}
        >
          <Text style={[styles.sideBtnText, { color: textColor }]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => {
            onClose();
            navigation.navigate('ProfileScreen', { user_id, username, email, full_name, phone, role, address });
          }}
        >
          <Text style={[styles.sideBtnText, { color: textColor }]}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => {
            onClose();
            navigation.navigate('NotificationsScreen');
          }}
        >
          <Text style={[styles.sideBtnText, { color: textColor }]}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => {
            onClose();
            navigation.navigate('SearchAssociation', { user_id, username, email, full_name, phone, role, address, sourceScreen });
          }}
        >
          <Text style={[styles.sideBtnText, { color: textColor }]}>Search</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 9,
  },
  sidebarLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 280,
    paddingTop: 40,
    zIndex: 10,
    elevation: 10,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  profileBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 13,
  },
  sideBtn: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  sideBtnText: {
    fontSize: 16,
  },
  logoutBtn: {
    marginTop: 30,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  logoutText: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
