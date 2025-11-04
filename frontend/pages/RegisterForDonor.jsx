import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Platform, ScrollView } from 'react-native';
import axios from 'axios';
import config from '../config';

export default function RegisterForDonor({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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
    const phoneRegex = /^\d{8,15}$/;
    if (!phone) newErrors.phone = 'Phone is required';
    else if (!phoneRegex.test(phone)) newErrors.phone = 'Phone must be 8-15 digits';
    if (!address) newErrors.address = 'Address is required';
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
      const accountId = accountRes.data.account.account_id;
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
      setTimeout(() => navigation.navigate('Login'), 1000);
    } catch (error) {
      console.error(error);
      setErrors({ general: error.response?.data?.message || error.message || 'Server error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{backgroundColor: '#EBE1D7', flexGrow: 1, paddingHorizontal: 30, paddingVertical: 70, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={require('../assets/images/logo1.png')} style={styles.logoTop} />
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} placeholder="username" value={username} onChangeText={setUsername} />
        {errors.username && (<View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.username}</Text>
            <View style={styles.errorArrow} />
        </View>
        )}

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} placeholder="password" value={password} onChangeText={setPassword} secureTextEntry />
        {errors.password && (<View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.password}</Text>
            <View style={styles.errorArrow} />
        </View>
        )}

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput style={styles.input} placeholder="confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        {errors.confirmPassword && (<View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            <View style={styles.errorArrow} />
        </View>
        )}

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
            {errors.fullName && (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.fullName}</Text>
            <View style={styles.errorArrow} />
        </View>
        )}

        <Text style={styles.label}>Address</Text>
        <TextInput style={styles.input} placeholder="Address" value={address} onChangeText={setAddress} />
        {errors.address && (<View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.address}</Text>
            <View style={styles.errorArrow} />
        </View>
        )}

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {errors.phone && (<View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.phone}</Text>
            <View style={styles.errorArrow} />
        </View>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        {errors.email && (<View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.email}</Text>
            <View style={styles.errorArrow} />
        </View>
        )}

        {errors.general && <Text style={styles.error}>{errors.general}</Text>}
      </View>
      <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signupText}>Signup</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EBE1D7',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 40,
},
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
    color: '#000000',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    fontSize: Platform.OS === 'ios' ? 14 : 12,
  },
  signupButton: {
    backgroundColor: '#000',
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
    color: 'red',
    fontSize: Platform.OS === 'ios' ? 12 : 10,
    marginBottom: 6,
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
  borderStyle: 'solid',
  backgroundColor: 'transparent',
  borderLeftColor: 'transparent',
  borderRightColor: 'transparent',
  borderBottomColor: 'red',
},
});
