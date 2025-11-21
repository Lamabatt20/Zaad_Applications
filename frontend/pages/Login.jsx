import React, { useState } from 'react';
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
        setUsernameError('');
        setPasswordError('');
        switch (res.data.role) {
          case 'association':
            //navigation.navigate('AssociationDashboard');
            break;
          case 'admin':
            //navigation.navigate('AdminDashboard');
            break;
          case 'donor':
            // navigate donors to choose donation type; pass user_id and username for later use
            navigation.navigate('ChooseDonationType', { user_id: res.data.user_id, username: res.data.username });
            break;
          default:
            setGeneralError('Unknown role');
        }
      } else {
        if (res.data.usernameIncorrect) setUsernameError('Username is incorrect');
        if (res.data.passwordIncorrect) setPasswordError('Password is incorrect');
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      
      <TouchableOpacity
        style={[
          styles.langButton,
          lang === 'EN'
            ? { right: 20, left: 'auto', flexDirection: 'row' }
            : { left: 20, right: 'auto', flexDirection: 'row-reverse' },
        ]}
        onPress={() => setLangModalVisible(true)}
      >
        <MaterialCommunityIcons
          name="chat"
          size={42}
          color="#A27571"
          style={{ transform: [{ scaleX: lang === 'AR' ? -1 : 1 }] }}
        />
        <Text style={styles.langText}>{lang}</Text>
      </TouchableOpacity>

     
      <Image source={require('../assets/images/logo3.png')} style={styles.logoTop} />

     
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="username"
          value={username}
          onChangeText={setUsername}
        />
        {usernameError !== '' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{usernameError}</Text>
            <View style={styles.errorArrow} />
          </View>
        )}

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <MaterialIcons
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={22}
              color="gray"
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

      
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>Log in</Text>}
      </TouchableOpacity>

      {generalError !== '' && (
        <Text
          style={[
            styles.generalErrorText,
            { color: generalError.includes('successful') ? 'green' : 'red' },
          ]}
        >
          {generalError}
        </Text>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgotPassword}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.createAccountButton}
        onPress={() => navigation.navigate('UserType')}
      >
        <Text style={styles.createText}>Create new Account</Text>
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
        <View style={styles.fullScreenModal}>
          <TouchableOpacity
            style={styles.closeIcon}
            onPress={() => setLangModalVisible(false)}
          >
            <Text style={styles.closeText}>X</Text>
          </TouchableOpacity>

          
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTitleAr}>اختر اللغة</Text>
            <Text style={styles.modalTitleEn}>Choose the Language</Text>
          </View>

          
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => selectLanguage('EN')}
          >
            <Text style={styles.optionText}>English (EN)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => selectLanguage('AR')}
          >
            <Text style={styles.optionText}>العربية (AR) </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBE1D7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  langButton: {
    color: '#EBE1D7',
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langText: {
    color: '#EBE1D7',
    fontWeight: '400',
    fontSize: 12,
    position: 'absolute',
  },
  logoTop: {
    width: 190,
    height: 190,
    resizeMode: 'contain',
    marginBottom: 80,
  },
  inputContainer: { 
    width: '100%',
    marginBottom: 20
  },
  label: { 
    fontSize: Platform.OS === 'ios' ? 14 : 12,
    color: '#000', 
    marginBottom: 4 
  },
  input: { 
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 6, 
    padding: 10, 
    marginBottom: 6, 
    fontSize: Platform.OS === 'ios' ? 14 : 12 
  },
  loginButton: { 
    backgroundColor: '#000', 
    paddingVertical: 12, 
    borderRadius: 25, 
    width: '100%', 
    alignItems: 'center' 
  },
  loginText: { 
    color: '#fff', 
    fontSize: Platform.OS === 'ios' ? 16 : 12, 
    fontWeight: '400' 
  },
  forgotPassword: { 
    color: '#000', 
    marginTop: 12, 
    textDecorationLine: 'underline', 
    fontSize: Platform.OS === 'ios' ? 15 : 12 
  },
  createAccountButton: { 
    borderColor: '#000', 
    borderWidth: 1, 
    paddingVertical: 12, 
    borderRadius: 25, 
    width: '100%', 
    alignItems: 'center', 
    marginTop: Platform.OS === 'ios' ? 170 : 155 
  },
  createText: { 
    color: '#000', 
    fontSize: Platform.OS === 'ios' ? 15 : 12 
  },
  bottomLogoContainer: { 
    position: 'absolute', 
    bottom: 10, 
    alignItems: 'center' 
  },
  logoBottom: { 
    width: Platform.OS === 'ios' ? 80 : 70, 
    height: Platform.OS === 'ios' ? 80 : 70, 
    resizeMode: 'contain' 
  },
  errorContainer: { backgroundColor: 'red', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 4, 
    alignSelf: 'flex-start', 
    marginTop: 2, 
    position: 'relative' 
  },
  errorText: { 
    color: '#fff', 
    fontSize: Platform.OS === 'ios' ? 12 : 10
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
    borderBottomColor: 'red' 
  },
  generalErrorText: { 
    fontSize: Platform.OS === 'ios' ? 14 : 12, 
    textAlign: 'center', 
    marginTop: 10 
  },
  passwordContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#000', 
    borderRadius: 6, 
    paddingHorizontal: 10, 
    marginBottom: 6 },
  inputPassword: { 
    flex: 1, 
    fontSize: Platform.OS === 'ios' ? 14 : 12, 
    paddingVertical: 10 
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#EBE1D7',
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  closeIcon: { 
    position: 'absolute', 
    top: 60, 
    right: 20, 
    zIndex: 10 
  },
  closeText: { 
    fontSize: 20, 
    fontWeight: '300', 
    color: 'gray' 
  },

  modalTitleContainer: { 
    marginBottom: 40, 
    alignItems: 'center' 
  },
  modalTitleEn: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#000' 
  },
  modalTitleAr: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#000', 
    marginTop: 5 },

  optionButton: { 
    width: '100%', 
    paddingVertical: 15, 
    borderWidth: 1, 
    borderColor: '#000', 
    borderRadius: 10, 
    marginBottom: 20, 
    alignItems: 'center', 
    backgroundColor: 'transparent' 
  },
  optionText: { 
    color: '#000', 
    fontSize: 18, 
    textAlign: 'center' 
  },
});
