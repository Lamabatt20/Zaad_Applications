import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function UserType({ navigation }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem("dark_mode");
        if (saved !== null) setDarkMode(saved === "true");
      } catch (e) {
      }
    };
    loadTheme();
    const unsubscribe = navigation?.addListener?.('focus', loadTheme);
    return unsubscribe;
  }, [navigation]);

  const bg = darkMode ? '#1c1c1c' : '#EBE1D7';
  const textColor = darkMode ? '#fff' : '#000';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Image
        source={require('../assets/images/logo1.png')}
        style={styles.logoTop}
        resizeMode="contain"
      />

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate('RegisterForDonor')}
        >
          <Image
            source={require('../assets/images/donor 1.png')}
            style={styles.icon}
          />
          <Text style={[styles.optionText, { color: textColor }]}>Donor</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate('RegisterForAssociation')}
        >
          <Image
            source={require('../assets/images/ass.png')}
            style={styles.icon}
          />
          <Text style={[styles.optionText, { color: textColor }]}>Association</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomLogoContainer}>
        <Image
          source={require('../assets/images/Z A A D.png')}
          style={styles.logoBottom}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoTop: {
    width: 120,
    height: 120,
    marginBottom: 200,
  },
  title: {
    fontSize: 18,
    marginBottom: 30,
    fontWeight: '600',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  option: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 300,
  },
  icon: {
    width: 110,
    height: 110,
    marginBottom: 10,
  },
  optionText: {
    fontSize: 16,
  },
  bottomLogoContainer: {
    position: 'absolute',
    bottom: 10,
    alignItems: 'center',
  },
  logoBottom: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
});