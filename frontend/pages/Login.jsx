import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import axios from 'axios';
import config from '../config';
import { Platform } from 'react-native';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
  if (!username || !password) {
    setMessage('Please enter username and password');
    return;
  }

  setLoading(true);
  setMessage('');
   const API = axios.create({
  baseURL: config.API_URL,
});

  try {
    const res = await API.post('/login', {
      username,
      password,
    });

    if (res.data.success) {
      const role = res.data.role;
      const name = res.data.username;

      if (role === 'admin') {
        setMessage(`Welcome Admin ${name}!`);
      } else if (role === 'donor') {
        setMessage(`Welcome Donor ${name}!`);
      } else if (role === 'association') {
        setMessage(`Welcome Association ${name}!`);
      } else {
        setMessage(`Welcome ${name}!`);
      }
    } else {
      setMessage(res.data.message || 'Invalid username or password');
    }
  } catch (error) {
    console.error(error);
    setMessage('Server error. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      
      <Image
        source={require('../assets/images/logo3.png')}
        style={styles.logoTop}
      />

      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="username"
          value={username}
          onChangeText={setUsername}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginText}>Log in</Text>
        )}
      </TouchableOpacity>

     
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
        <Image
          source={require('../assets/images/Z A A D.png')}
          style={styles.logoBottom}
        />
      </View>

      
      {message ? <Text style={styles.message}>{message}</Text> : null}
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
  logoTop: {
    width: 190,
    height: 190,
    resizeMode: 'contain',
    marginBottom: 80,
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
    marginBottom: 12,
    fontSize: Platform.OS === 'ios' ? 14 : 12,
  },
  loginButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  loginText: {
    color: '#ffffffff',
    fontSize: Platform.OS === 'ios' ? 16 : 12,
    fontWeight: '400',
  },
  forgotPassword: {
    color: '#000',
    marginTop: 12,
    textDecorationLine: 'underline',
    fontSize: Platform.OS === 'ios' ? 15 : 12,
  },
  createAccountButton: {
    borderColor: '#000',
    borderWidth: 1,
    paddingVertical:12 ,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 170 : 155,
  },
  createText: {
    color: '#000',
    fontSize: Platform.OS === 'ios' ? 15 : 12,
  },
  bottomLogoContainer: {
    position: 'absolute',
    bottom: 10,
    alignItems: 'center',
  },
  logoBottom: {
    width: Platform.OS === 'ios' ? 80 : 70,
    height: Platform.OS === 'ios' ? 80 : 70,
    resizeMode: 'contain',
  },
  message: {
    fontSize: Platform.OS === 'ios' ? 15 : 12,
    color: '#A27571',
    marginTop: Platform.OS === 'ios' ? 15 : 7,
  },
});
