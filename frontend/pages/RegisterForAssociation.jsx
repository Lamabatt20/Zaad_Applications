import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Platform, ScrollView } from 'react-native';
import axios from 'axios';
import config from '../config';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RegisterForAssociation({ navigation }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadMode = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadMode();
  }, []);

  const theme = {
    background: darkMode ? "#1c1c1c" : "#EBE1D7",
    text: darkMode ? "#fff" : "#000",
    border: darkMode ? "#888" : "#000",
    inputBg: darkMode ? "#2a2a2a" : "#EBE1D7",
    placeholder: darkMode ? "#aaa" : "#555",
    button: darkMode ? "#333" : "#000",
    errorBg: darkMode ? "#b30000" : "red",
  };

  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [associationName, setAssociationName] = useState('');
  const [associationLogo, setAssociationLogo] = useState(null);
  const [associationAuth, setAssociationAuth] = useState(null);
  const [description, setDescription] = useState('');
  const [food, setFood] = useState(false);
  const [clothes, setClothes] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateFieldsStep1 = () => {
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

  const validateFieldsStep2 = () => {
    const newErrors = {};
    if (!associationName) newErrors.associationName = 'Association name is required';
    if (!associationLogo) newErrors.associationLogo = 'Association logo is required';
    if (!associationAuth) newErrors.associationAuth = 'Authentication file is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickFile = async (setFile) => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files[0];
        setFile(file);
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled) {
        let asset = result.assets[0];

        if (Platform.OS === 'android' && asset.uri.startsWith('content://')) {
          const fileUri = FileSystem.cacheDirectory + (asset.fileName || 'temp.jpg');
          await FileSystem.copyAsync({ from: asset.uri, to: fileUri });
          asset.uri = fileUri;
        }
        setFile(asset);
      }
    }
  };

  const handleSignup = async () => {
    if (!validateFieldsStep2()) return;
    setLoading(true);
    const API = axios.create({ baseURL: config.API_URL });

    try {
      const accountRes = await API.post('/accounts', {
        username,
        password,
        role: 'association',
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

      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('name', associationName);

      if (Platform.OS === 'web') {
        formData.append('association_logo', associationLogo);
        formData.append('association_authentication', associationAuth);
      } else {
        formData.append('association_logo', {
          uri: associationLogo.uri,
          type: associationLogo.type || 'image/jpeg',
          name: associationLogo.fileName || 'logo.jpg',
        });
        formData.append('association_authentication', {
          uri: associationAuth.uri,
          type: associationAuth.type || 'image/jpeg',
          name: associationAuth.fileName || 'auth.jpg',
        });
      }

      formData.append('description', description);
      formData.append('food', food);
      formData.append('clothes', clothes);

      const assocRes = await API.post('/associations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!assocRes.data) throw new Error('Failed to create association');

      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setAddress('');
      setPhone('');
      setEmail('');
      setAssociationName('');
      setAssociationLogo(null);
      setAssociationAuth(null);
      setDescription('');
      setFood(false);
      setClothes(false);
      setErrors({});
      navigation.replace("VerifyPhone", {
      phone,
      role: "association",
    });
    
    } catch (error) {
      setErrors({ general: error.response?.data?.message || error.message || 'Server error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const renderError = (message) => (
    <View style={[styles.errorContainer, { backgroundColor: theme.errorBg }]}>
      <Text style={styles.errorText}>{message}</Text>
      <View style={styles.errorArrow} />
    </View>
  );

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

      {step === 1 && (
        <View style={styles.inputContainer}>

          <Text style={[styles.label, { color: theme.text }]}>Username</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="username"
            placeholderTextColor={theme.placeholder}
            value={username}
            onChangeText={setUsername}
          />
          {errors.username && renderError(errors.username)}

          <Text style={[styles.label, { color: theme.text }]}>Password</Text>
          <View style={[styles.passwordContainer, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
            <TextInput
              style={[styles.inputPassword, { color: theme.text }]}
              placeholder="password"
              placeholderTextColor={theme.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
          {errors.password && renderError(errors.password)}

          <Text style={[styles.label, { color: theme.text }]}>Confirm Password</Text>
          <View style={[styles.passwordContainer, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
            <TextInput
              style={[styles.inputPassword, { color: theme.text }]}
              placeholder="confirm password"
              placeholderTextColor={theme.placeholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <MaterialIcons name={showConfirmPassword ? "visibility" : "visibility-off"} size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && renderError(errors.confirmPassword)}

          <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="Full name"
            placeholderTextColor={theme.placeholder}
            value={fullName}
            onChangeText={setFullName}
          />
          {errors.fullName && renderError(errors.fullName)}

          <Text style={[styles.label, { color: theme.text }]}>Address</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="Address"
            placeholderTextColor={theme.placeholder}
            value={address}
            onChangeText={setAddress}
          />
          {errors.address && renderError(errors.address)}

          <Text style={[styles.label, { color: theme.text }]}>Phone</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="Phone"
            placeholderTextColor={theme.placeholder}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          {errors.phone && renderError(errors.phone)}

          <Text style={[styles.label, { color: theme.text }]}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="Email"
            placeholderTextColor={theme.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          {errors.email && renderError(errors.email)}

          {errors.general && <Text style={{ color: "red" }}>{errors.general}</Text>}

          <TouchableOpacity
            style={[styles.signupButton, { backgroundColor: theme.button }]}
            onPress={() => { if (validateFieldsStep1()) setStep(2); }}
          >
            <Text style={[styles.signupText, { color: "#fff" }]}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.inputContainer}>

          <Text style={[styles.label, { color: theme.text }]}>Association Name</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="Association Name"
            placeholderTextColor={theme.placeholder}
            value={associationName}
            onChangeText={setAssociationName}
          />
          {errors.associationName && renderError(errors.associationName)}

          <Text style={[styles.label, { color: theme.text }]}>Logo</Text>
          <TouchableOpacity
            style={[styles.inputWithIcon, { borderColor: theme.border, backgroundColor: theme.inputBg }]}
            onPress={() => pickFile(setAssociationLogo)}
          >
            <Text style={[styles.inputText, { color: theme.text }]}>
              {associationLogo ? (associationLogo.name || associationLogo.fileName) : 'Pick Association Logo'}
            </Text>
            <MaterialIcons name="upload-file" size={20} color={theme.text} />
          </TouchableOpacity>
          {errors.associationLogo && renderError(errors.associationLogo)}

          <Text style={[styles.label, { color: theme.text }]}>Authentication paper</Text>
          <TouchableOpacity
            style={[styles.inputWithIcon, { borderColor: theme.border, backgroundColor: theme.inputBg }]}
            onPress={() => pickFile(setAssociationAuth)}
          >
            <Text style={[styles.inputText, { color: theme.text }]}>
              {associationAuth ? (associationAuth.name || associationAuth.fileName) : 'Pick Authentication File'}
            </Text>
            <MaterialIcons name="upload-file" size={20} color={theme.text} />
          </TouchableOpacity>
          {errors.associationAuth && renderError(errors.associationAuth)}

          <Text style={[styles.label, { color: theme.text }]}>Description</Text>
          <TextInput
            style={[styles.input, { height: 80, borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="Description"
            placeholderTextColor={theme.placeholder}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={[styles.label, { color: theme.text }]}>Type of donations</Text>
          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }} onPress={() => setFood(!food)}>
              <View style={[styles.checkbox, { borderColor: theme.border, backgroundColor: food ? theme.text : "transparent" }]} />
              <Text style={{ marginLeft: 5, color: theme.text }}>Food</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setClothes(!clothes)}>
              <View style={[styles.checkbox, { borderColor: theme.border, backgroundColor: clothes ? theme.text : "transparent" }]} />
              <Text style={{ marginLeft: 5, color: theme.text }}>Clothes</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.signupButton, { backgroundColor: theme.button }]} onPress={handleSignup}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.signupText, { color: "#fff" }]}>Signup</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  logoTop: { width: 100, height: 100, resizeMode: 'contain', marginBottom: 50 },
  inputContainer: { width: '100%', marginBottom: 20 },
  label: { fontSize: Platform.OS === 'ios' ? 14 : 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 6, fontSize: Platform.OS === 'ios' ? 14 : 12 },
  signupButton: { paddingVertical: 12, borderRadius: 25, width: '100%', alignItems: 'center', marginTop: 30 },
  signupText: { fontSize: Platform.OS === 'ios' ? 16 : 12, fontWeight: '400' },
  errorContainer: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginTop: 2, position: 'relative' },
  errorText: { color: '#fff', fontSize: Platform.OS === 'ios' ? 12 : 10 },
  errorArrow: { position: 'absolute', top: -6, left: 10, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 6, borderStyle: 'solid', backgroundColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'red' },
  inputWithIcon: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 12 : 8, marginBottom: 6 },
  inputText: { fontSize: Platform.OS === 'ios' ? 14 : 12, flexShrink: 1 },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderRadius: 4 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, marginBottom: 6 },
  inputPassword: { flex: 1, paddingVertical: 8, fontSize: Platform.OS === 'ios' ? 14 : 12 },
});
