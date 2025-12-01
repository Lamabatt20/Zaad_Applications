import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import config from '../config';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ForgotPassword({ navigation }) {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadMode = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadMode();
  }, []);

  const colors = {
    bg: darkMode ? "#1c1c1c" : "#EBE1D7",
    text: darkMode ? "#fff" : "#000",
    inputBorder: darkMode ? "#666" : "#000",
    inputText: darkMode ? "#2a2a2a" : "#000",
    placeholder: darkMode ? "#ccc" : "#555",
    buttonBg: darkMode ? "#333" : "#000",
    buttonText: darkMode ? "#fff" : "#fff"
  };

  const validateFields = () => {
    const newErrors = {};
    if (!usernameOrEmail) newErrors.usernameOrEmail = 'Username or Email is required';
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!newPassword) newErrors.newPassword = 'Password is required';
    else if (!passwordRegex.test(newPassword)) newErrors.newPassword = 'Password must be stronger';
    if (!confirmPassword) newErrors.confirmPassword = 'Confirm password is required';
    else if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateFields()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${config.API_URL}/reset-password`, {
        usernameOrEmail,
        newPassword,
      });
      if (res.data.success) {
        setErrors({});
        setUsernameOrEmail('');
        setNewPassword('');
        setConfirmPassword('');
        alert('Password reset successfully');
        navigation.navigate('Login');
      } else {
        setErrors({ general: res.data.message || 'Error' });
      }
    } catch (error) {
      setErrors({ general: error.response?.data?.message || 'Server error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 30,
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      style={{ backgroundColor: colors.bg }}
    >
      <Image
        source={require('../assets/images/logo3.png')}
        style={styles.logoTop}
      />

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Username or Email</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.inputBorder, color: colors.inputText }]}
          placeholder="username or email"
          placeholderTextColor={colors.placeholder}
          value={usernameOrEmail}
          onChangeText={setUsernameOrEmail}
        />
        {errors.usernameOrEmail && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.usernameOrEmail}</Text>
            <View style={styles.errorArrow} />
          </View>
        )}

        <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
        <View style={[styles.passwordContainer, { borderColor: colors.inputBorder }]}>
          <TextInput
            style={[styles.inputPassword, { color: colors.inputText }]}
            placeholder="new password"
            placeholderTextColor={colors.placeholder}
            secureTextEntry={!showNewPassword}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
            <MaterialIcons
              name={showNewPassword ? 'visibility' : 'visibility-off'}
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {errors.newPassword && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.newPassword}</Text>
            <View style={styles.errorArrow} />
          </View>
        )}

        <Text style={[styles.label, { color: colors.text }]}>Confirm New Password</Text>
        <View style={[styles.passwordContainer, { borderColor: colors.inputBorder }]}>
          <TextInput
            style={[styles.inputPassword, { color: colors.inputText }]}
            placeholder="confirm new password"
            placeholderTextColor={colors.placeholder}
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <MaterialIcons
              name={showConfirmPassword ? 'visibility' : 'visibility-off'}
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {errors.confirmPassword && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            <View style={styles.errorArrow} />
          </View>
        )}

        {errors.general && (
          <Text style={[styles.error, { alignSelf: 'flex-start' }]}>{errors.general}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.resetButton, { backgroundColor: colors.buttonBg }]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.buttonText} />
        ) : (
          <Text style={[styles.resetText, { color: colors.buttonText }]}>Reset Password</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  logoTop: {
    width: 190,
    height: 190,
    resizeMode: 'contain',
    marginBottom: 120,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 80,
  },
  label: {
    fontSize: Platform.OS === 'ios' ? 14 : 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    fontSize: Platform.OS === 'ios' ? 14 : 12,
  },
  resetButton: {
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  resetText: {
    fontSize: Platform.OS === 'ios' ? 16 : 12,
    fontWeight: '400',
  },
  errorContainer: {
    backgroundColor: 'red',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
    position: 'relative',
  },
  errorText: {
    color: '#fff',
    fontSize: Platform.OS === 'ios' ? 12 : 10,
  },
  errorArrow: {
    position: 'absolute',
    top: -6,
    left: 10,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'red',
  },
  error: {
    color: 'red',
    fontSize: Platform.OS === 'ios' ? 12 : 10,
    marginBottom: 6,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  inputPassword: {
    flex: 1,
    fontSize: Platform.OS === 'ios' ? 14 : 12,
    paddingVertical: 10,
  },
});
