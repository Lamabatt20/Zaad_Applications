import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';

export default function SideMenu({ visible, onClose, navigation, user = {} }) {
  if (!visible) return null;

  const { user_id, username, email, full_name, phone, role, address } = user;

  return (
    <>
      <TouchableOpacity style={styles.overlay} onPress={onClose} />

      <Animated.View style={styles.sidebarLeft}>
        <View style={styles.profileBox}>
          <Image source={require('../assets/profile.png')} style={styles.profileImg} />
          <Text style={styles.profileName}>{username || 'Donor'}</Text>
          <Text style={styles.profileEmail}>{email || ''}</Text>
        </View>

        <TouchableOpacity style={styles.sideBtn} onPress={() => { onClose(); navigation.navigate('Dashboard'); }}>
          <Text style={styles.sideBtnText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideBtn} onPress={() => { onClose(); navigation.navigate('ProfileScreen', { user_id, username, email, full_name, phone, role, address }); }}>
          <Text style={styles.sideBtnText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideBtn} onPress={() => { onClose(); navigation.navigate('Notifications'); }}>
          <Text style={styles.sideBtnText}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideBtn} onPress={() => { onClose(); navigation.navigate('Search'); }}>
          <Text style={styles.sideBtnText}>Search</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => { onClose(); navigation.navigate('Login'); }}>
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
    backgroundColor: '#fff',
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
    color: '#333',
  },
  profileEmail: {
    fontSize: 13,
    color: '#666',
  },
  sideBtn: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  sideBtnText: {
    fontSize: 16,
    color: '#333',
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
