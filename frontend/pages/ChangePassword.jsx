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
  ScrollView,
} from 'react-native';
import axios from 'axios';
import config from '../config';
import { MaterialIcons } from '@expo/vector-icons';

export default function ChangePassword({ route, navigation }) {
  const { user_id, username, email, full_name, phone, role, address } =
    route?.params || {};

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const validateFields = () => {
    const newErrors = {};

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!newPassword) newErrors.newPassword = 'Password is required';
    else if (!passwordRegex.test(newPassword))
      newErrors.newPassword =
        'Password must be 8+ chars, include uppercase, lowercase, number and symbol';

    if (!confirmPassword) newErrors.confirmPassword = 'Confirm password is required';
    else if (newPassword !== confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleResetPassword = async () => {
    if (!validateFields()) return;
    setLoading(true);

    try {
      const res = await axios.put(
        `${config.API_URL}/accounts/user/${user_id}`,
        {
          password: newPassword,

        }
      );

      alert('Password has been reset successfully!');

      setNewPassword('');
      setConfirmPassword('');

      navigation.navigate("ProfileScreen", {
            user_id,username, email, full_name, phone, role, address 
            });

    } catch (error) {
      console.error(error);
      setErrors({
        general: error.response?.data?.message || 'Server error. Please try again.',
      });
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
      style={{ backgroundColor: '#EBE1D7' }}
    >
      <Image
        source={require('../assets/images/logo3.png')}
        style={styles.logoTop}
      />

      <View style={styles.inputContainer}>

        <Text style={styles.label}>New Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="new password"
            placeholderTextColor="#555"
            secureTextEntry={!showNewPassword}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
            <MaterialIcons
              name={showNewPassword ? 'visibility' : 'visibility-off'}
              size={22}
              color="gray"
            />
          </TouchableOpacity>
        </View>

        {errors.newPassword && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.newPassword}</Text>
            <View style={styles.errorArrow} />
          </View>
        )}

        
        <Text style={styles.label}>Confirm New Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="confirm new password"
            placeholderTextColor="#555"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <MaterialIcons
              name={showConfirmPassword ? 'visibility' : 'visibility-off'}
              size={22}
              color="gray"
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
          <Text style={[styles.error, { alignSelf: 'flex-start' }]}>
            {errors.general}
          </Text>
        )}
      </View>

      
      <TouchableOpacity
        style={styles.resetButton}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.resetText}>Reset Password</Text>
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
    color: '#000000',
    marginBottom: 4,
  },
  resetButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  resetText: {
    color: '#fff',
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
    borderStyle: 'solid',
    backgroundColor: 'transparent',
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
    borderColor: '#000',
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  inputPassword: {
    flex: 1,
    fontSize: Platform.OS === 'ios' ? 14 : 12,
    paddingVertical: 10,
    color: '#000',
  },
});
