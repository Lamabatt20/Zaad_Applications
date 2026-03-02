import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Platform, ScrollView } from 'react-native';
import axios from 'axios';
import config from '../config';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RegisterForDonor({ navigation }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadDarkMode = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadDarkMode();
  }, []);

  const theme = {
    background: darkMode ? "#1c1c1c" : "#EBE1D7",
    text: darkMode ? "#fff" : "#000",
    border: darkMode ? "#555" : "#000",
    inputBackground: darkMode ? "#2a2a2a" : "#EBE1D7",
    placeholder: darkMode ? "#999" : "#666",
    buttonBackground: darkMode ? "#333" : "#000",
    errorBg: "#d10000",
  };

  const validateFields = () => {
    const newErrors = {};
    if (!username) newErrors.username = 'Username is required';
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!password) newErrors.password = 'Password is required';
    else if (!passwordRegex.test(password)) newErrors.password = 'Password must be 8+ chars, include uppercase, lowercase, number and symbol';
    if (!confirmPassword) newErrors.confirmPassword = 'Confirm password is required';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    const nameRegex = /^([A-Z][a-z]+)(\s[A-Z][a-z]+)*$/;
    if (!fullName) newErrors.fullName = 'Full name is required';
    else if (!nameRegex.test(fullName)) newErrors.fullName = 'Each word should start with a capital letter';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) newErrors.email = 'Email is required';
    else if (!emailRegex.test(email)) newErrors.email = 'Invalid email format';
   const phoneRegex = /^\+?\d{8,20}$/;
    if (!phone) newErrors.phone = 'Phone is required';
    else if (!phoneRegex.test(phone)) newErrors.phone = 'Phone must be 8-20 digits';
    if (!address) newErrors.address = 'City is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateFields()) return;
    setLoading(true);
    const API = axios.create({ baseURL: config.API_URL });

    try {
      const accountRes = await API.post('/accounts', {
        username,
        password,
        role: 'donor',
        email,
        phone,
        full_name: fullName,
        address,
      });

      if (!accountRes.data.success) throw new Error(accountRes.data.message || 'Failed to create account');

      const accountId = accountRes.data.account_id;

      const userRes = await API.post('/users', { account_id: accountId });
      if (!userRes.data.success || !userRes.data.user) throw new Error(userRes.data.message || 'Failed to create user');

      const userId = userRes.data.user.user_id;

      const donorRes = await API.post('/donors', { user_id: userId });
      if (!donorRes.data) throw new Error('Failed to create donor');

      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setAddress('');
      setPhone('');
      setEmail('');
      setErrors({});

      navigation.replace("VerifyPhone", {
      email,
      role: "donor",
    });
    } catch (error) {
      setErrors({ general: error.response?.data?.message || error.message || 'Server error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        paddingHorizontal: 40,
        paddingTop: 20,
        paddingBottom: 165,
        alignItems: 'center',
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Image source={require('../assets/images/logo1.png')} style={styles.logoTop} />

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: theme.text }]}>Username</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text },
          ]}
          placeholder="username"
          placeholderTextColor={theme.placeholder}
          value={username}
          onChangeText={setUsername}
        />
        {errors.username && (
          <View style={[styles.errorContainer, { backgroundColor: theme.errorBg }]}>
            <Text style={styles.errorText}>{errors.username}</Text>
            <View style={[styles.errorArrow, { borderBottomColor: theme.errorBg }]} />
          </View>
        )}

        <Text style={[styles.label, { color: theme.text }]}>Password</Text>
        <View style={[styles.passwordContainer, { borderColor: theme.border,color: theme.text,backgroundColor: theme.inputBackground }]}>
          <TextInput
            style={[styles.inputPassword, { color: theme.text }]}
            placeholder="password"
            placeholderTextColor={theme.placeholder}
            value={password}
            secureTextEntry={!showPassword}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        {errors.password && (
          <View style={[styles.errorContainer, { backgroundColor: theme.errorBg }]}>
            <Text style={styles.errorText}>{errors.password}</Text>
            <View style={[styles.errorArrow, { borderBottomColor: theme.errorBg }]} />
          </View>
        )}

        <Text style={[styles.label, { color: theme.text }]}>Confirm Password</Text>
        <View style={[styles.passwordContainer, { borderColor: theme.border,color: theme.text,backgroundColor: theme.inputBackground }]}>
          <TextInput
            style={[styles.inputPassword, { color: theme.text }]}
            placeholder="confirm password"
            placeholderTextColor={theme.placeholder}
            value={confirmPassword}
            secureTextEntry={!showConfirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <MaterialIcons name={showConfirmPassword ? 'visibility' : 'visibility-off'} size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        {errors.confirmPassword && (
          <View style={[styles.errorContainer, { backgroundColor: theme.errorBg }]}>
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            <View style={[styles.errorArrow, { borderBottomColor: theme.errorBg }]} />
          </View>
        )}

        <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text },
          ]}
          placeholder="Full name"
          placeholderTextColor={theme.placeholder}
          value={fullName}
          onChangeText={setFullName}
        />
        {errors.fullName && (
          <View style={[styles.errorContainer, { backgroundColor: theme.errorBg }]}>
            <Text style={styles.errorText}>{errors.fullName}</Text>
            <View style={[styles.errorArrow, { borderBottomColor: theme.errorBg }]} />
          </View>
        )}

        <Text style={[styles.label, { color: theme.text }]}>Address</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text },
          ]}
          placeholder="City"
          placeholderTextColor={theme.placeholder}
          value={address}
          onChangeText={setAddress}
        />
        {errors.address && (
          <View style={[styles.errorContainer, { backgroundColor: theme.errorBg }]}>
            <Text style={styles.errorText}>{errors.address}</Text>
            <View style={[styles.errorArrow, { borderBottomColor: theme.errorBg }]} />
          </View>
        )}

        <Text style={[styles.label, { color: theme.text }]}>Phone</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text },
          ]}
          placeholder="Phone"
          placeholderTextColor={theme.placeholder}
          value={phone}
          keyboardType="phone-pad"
          onChangeText={setPhone}
        />
        {errors.phone && (
          <View style={[styles.errorContainer, { backgroundColor: theme.errorBg }]}>
            <Text style={styles.errorText}>{errors.phone}</Text>
            <View style={[styles.errorArrow, { borderBottomColor: theme.errorBg }]} />
          </View>
        )}

        <Text style={[styles.label, { color: theme.text }]}>Email</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text },
          ]}
          placeholder="Email"
          placeholderTextColor={theme.placeholder}
          value={email}
          keyboardType="email-address"
          onChangeText={setEmail}
        />
        {errors.email && (
          <View style={[styles.errorContainer, { backgroundColor: theme.errorBg }]}>
            <Text style={styles.errorText}>{errors.email}</Text>
            <View style={[styles.errorArrow, { borderBottomColor: theme.errorBg }]} />
          </View>
        )}

        {errors.general && <Text style={[styles.error, { color: theme.errorBg }]}>{errors.general}</Text>}
      </View>

      <TouchableOpacity
        style={[styles.signupButton, { backgroundColor: theme.buttonBackground }]}
        onPress={handleSignup}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signupText}>Signup</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  logoTop: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 50,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
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
  signupButton: {
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginTop: 40,
  },
  signupText: {
    color: '#fff',
    fontSize: Platform.OS === 'ios' ? 16 : 12,
    fontWeight: '400',
  },
  error: {
    fontSize: Platform.OS === 'ios' ? 12 : 10,
    marginBottom: 6,
  },
  errorContainer: {
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
