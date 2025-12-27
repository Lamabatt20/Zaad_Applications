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
  Modal,
} from 'react-native';
import axios from 'axios';
import config from '../config';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation }) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('EN');
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadDark = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadDark();
  }, []);

  const selectLanguage = (value) => {
    setLang(value);
    setLangModalVisible(false);
  };

  const validateFields = () => {
    let valid = true;
    setUsernameError('');
    setPasswordError('');
    setGeneralError('');
    if (!username) {
      setUsernameError('Username is required');
      valid = false;
    }
    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    }
    return valid;
  };

  const handleLogin = async () => {
    if (!validateFields()) return;
    setLoading(true);
    setGeneralError('');
    const API = axios.create({ baseURL: config.API_URL });

    try {
      const res = await API.post('/login', { username, password });
      if (res.data.success) {
        const userData = {
          user_id: res.data.user_id,
          username: res.data.username,
          email: res.data.email,
          full_name: res.data.full_name,
          phone: res.data.phone,
          role: res.data.role,
          address: res.data.address,
          food: res.data.food === true || res.data.food === 'true',
          clothes: res.data.clothes === true || res.data.clothes === 'true',

        };

        await AsyncStorage.setItem("user_data", JSON.stringify(userData));

        switch (res.data.role) {
          case 'association':
              if (userData.food && userData.clothes) {
                navigation.navigate('DashbordAssociationAll', userData);
              } else if (userData.food && !userData.clothes) {
                navigation.navigate('DashbordAssociationFoods', userData);
              } else if (!userData.food && userData.clothes) {
                navigation.navigate('DashbordAssociationClothes', userData);
              } else {
                setGeneralError('No donation type assigned');
              }
              break;

          case 'donor':
            navigation.navigate("ChooseDonationType", userData);
            break;

          case 'admin':
            break;

          default:
            setGeneralError('Unknown role');
        }
      } else {
        if (res.data.usernameIncorrect) setUsernameError('Username is incorrect');
        if (res.data.passwordIncorrect) setPasswordError('Password is incorrect');
      }
    } catch (error) {
      setGeneralError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#000";
  const inputBg = darkMode ? "#2a2a2a" : "#EBE1D7";
  const border = darkMode ? "#666" : "#000";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <TouchableOpacity
        style={[
          styles.langButton,
          lang === 'EN' ? { right: 20 } : { left: 20 },
        ]}
        onPress={() => setLangModalVisible(true)}
      >
        <MaterialCommunityIcons
          name="chat"
          size={42}
          color="#A27571"
          style={{ transform: [{ scaleX: lang === 'AR' ? -1 : 1 }] }}
        />
        <Text style={[styles.langText, { color: text, position: 'absolute' }]}>{lang}</Text>
      </TouchableOpacity>

      <Image source={require('../assets/images/logo3.png')} style={styles.logoTop} />

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: text }]}>Username</Text>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: text, borderColor: border }]}
          placeholder="username"
          placeholderTextColor={darkMode ? "#999" : "#666"}
          value={username}
          onChangeText={setUsername}
        />

        {usernameError !== '' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{usernameError}</Text>
            <View style={styles.errorArrow} />
          </View>
        )}

        <Text style={[styles.label, { color: text }]}>Password</Text>
        <View style={[styles.passwordContainer, { borderColor: border }]}>
          <TextInput
            style={[styles.inputPassword, { color: text }]}
            placeholder="password"
            placeholderTextColor={darkMode ? "#999" : "#666"}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <MaterialIcons
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={22}
              color={text}
            />
          </TouchableOpacity>
        </View>

        {passwordError !== '' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{passwordError}</Text>
            <View style={styles.errorArrow} />
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.loginButton, { backgroundColor: darkMode ? "#333" : "#000" }]}
        onPress={handleLogin}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>Log in</Text>}
      </TouchableOpacity>

      {generalError !== '' && (
        <Text style={[styles.generalErrorText, { color: 'red' }]}>
          {generalError}
        </Text>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={[styles.forgotPassword, { color: text }]}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.createAccountButton, { borderColor: text }]}
        onPress={() => navigation.navigate('UserType')}
      >
        <Text style={[styles.createText, { color: text }]}>Create new Account</Text>
      </TouchableOpacity>

      <View style={styles.bottomLogoContainer}>
        <Image source={require('../assets/images/Z A A D.png')} style={styles.logoBottom} />
      </View>

      <Modal
        visible={langModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={[styles.fullScreenModal, { backgroundColor: bg }]}>
          <TouchableOpacity style={styles.closeIcon} onPress={() => setLangModalVisible(false)}>
            <Text style={[styles.closeText, { color: text }]}>X</Text>
          </TouchableOpacity>

          <View style={styles.modalTitleContainer}>
            <Text style={[styles.modalTitleAr, { color: text }]}>اختر اللغة</Text>
            <Text style={[styles.modalTitleEn, { color: text }]}>Choose the Language</Text>
          </View>

          <TouchableOpacity style={[styles.optionButton, { borderColor: text }]} onPress={() => selectLanguage('EN')}>
            <Text style={[styles.optionText, { color: text }]}>English (EN)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionButton, { borderColor: text }]} onPress={() => selectLanguage('AR')}>
            <Text style={[styles.optionText, { color: text }]}>العربية (AR)</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  langButton: { position: 'absolute', top: 50, zIndex: 50, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  langText: { fontWeight: '700', fontSize: 12 },
  logoTop: { width: 190, height: 190, resizeMode: 'contain', marginBottom: 80 },
  inputContainer: { width: '100%', marginBottom: 20 },
  label: { fontSize: Platform.OS === 'ios' ? 14 : 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 6 },
  loginButton: { paddingVertical: 12, borderRadius: 25, width: '100%', alignItems: 'center' },
  loginText: { color: '#fff', fontSize: Platform.OS === 'ios' ? 16 : 12 },
  forgotPassword: { marginTop: 12, textDecorationLine: 'underline' },
  createAccountButton: { borderWidth: 1, paddingVertical: 12, borderRadius: 25, width: '100%', alignItems: 'center', marginTop: 170 },
  createText: { fontSize: Platform.OS === 'ios' ? 15 : 12 },
  bottomLogoContainer: { position: 'absolute', bottom: 10 },
  logoBottom: { width: 80, height: 80, resizeMode: 'contain' },
  errorContainer: { backgroundColor: 'red', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 2 },
  errorText: { color: '#fff', fontSize: 12 },
  errorArrow: { position: 'absolute', top: -6, left: 10, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'red' },
  generalErrorText: { fontSize: 14, textAlign: 'center', marginTop: 10 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10 },
  inputPassword: { flex: 1, paddingVertical: 10 },
  fullScreenModal: { flex: 1, paddingHorizontal: 20, paddingTop: 60, alignItems: 'center' },
  closeIcon: { position: 'absolute', top: 60, right: 20 },
  closeText: { fontSize: 20 },
  modalTitleContainer: { marginBottom: 40, alignItems: 'center' },
  modalTitleEn: { fontSize: 22, fontWeight: 'bold' },
  modalTitleAr: { fontSize: 20, fontWeight: 'bold', marginTop: 5 },
  optionButton: { width: '100%', paddingVertical: 15, borderWidth: 1, borderRadius: 10, marginBottom: 20, alignItems: 'center' },
  optionText: { fontSize: 18 },
});
