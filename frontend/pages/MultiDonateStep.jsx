import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API from '../config';
import * as ImagePicker from 'expo-image-picker';
import { Platform, PermissionsAndroid } from 'react-native';

export default function MultiDonateStep({ route, navigation }) {
  const { association, donationType, total = 1, index = 1 } = route.params || {};

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [isPerishable, setIsPerishable] = useState('No');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [image, setImage] = useState(null);
  const [expirationDate, setExpirationDate] = useState('');
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem('dark_mode');
        if (saved !== null) setDarkMode(saved === 'true');
      } catch (e) {}
    };
    load();
  }, []);

  const bg = darkMode ? '#1c1c1c' : '#EBE1D7';
  const text = darkMode ? '#fff' : '#333';
  const inputBg = darkMode ? '#2a2a2a' : '#fff';
  const border = darkMode ? '#555' : '#ddd';
  const btnColor = '#A27571';

  const submitStep = async () => {
    // validate required fields
    if (!category || !address) {
      Alert.alert('Missing fields', 'Please fill Category and Pickup Address before continuing.');
      return;
    }
    if (!image) {
      Alert.alert('Missing photo', 'Please add a photo for this item before continuing.');
      return;
    }
    if (isPerishable === 'Yes' && !expirationDate) {
      Alert.alert('Missing expiry', 'Please enter expiration date for perishable food.');
      return;
    }

    // create single donation with quantity 1
    setLoading(true);
    try {
      const userRaw = await AsyncStorage.getItem('user_data');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const donor_id = user?.user_id;

      if (!donor_id) {
        Alert.alert('Not logged in', 'Please log in as a donor to create donations.');
        setLoading(false);
        return;
      }

      const form = new FormData();
      form.append('donor_id', donor_id);
      form.append('donation_type', donationType || 'clothes');
      form.append('note', description || `Donation to ${association?.name || ''}`);
      form.append('status', 'pending');

      // optional fields which backend may ignore
      form.append('category', category);
      form.append('address', address);
      form.append('isPerishable', isPerishable === 'Yes' ? 'true' : 'false');
      // attach image
      const uriParts = image.split('.');
      const fileType = uriParts[uriParts.length - 1];
      form.append('item_image', {
        uri: image,
        name: `photo.${fileType}`,
        type: `image/${fileType}`,
      });

      // attach association and coords when available
      if (association?.association_id) form.append('association_id', association.association_id);
      if (coords) {
        form.append('latitude', coords.latitude.toString());
        form.append('longitude', coords.longitude.toString());
      }

      const res = await axios.post(`${API.API_URL}/donations`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // if food, create food_donations row
      const donationId = res?.data?.donation_id || res?.data?.id;
      if (donationType === 'food' && donationId) {
        await axios.post(`${API.API_URL}/food_donations`, {
          donation_id: donationId,
          is_perishable: isPerishable === 'Yes',
          food_type: category,
          expiration_date: expirationDate || null,
        });
      }

      setLoading(false);

      if (index < total) {
        // proceed to next step
        navigation.replace('MultiDonateStep', {
          association,
          donationType,
          total,
          index: index + 1,
        });
      } else {
        // finished
        navigation.replace('DonationComplete', { association, total });
      }
    } catch (e) {
      console.error('submit error', e);
      setLoading(false);
      Alert.alert('Error', 'Failed to submit donation. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access media library is required to add a photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (!result.cancelled) setImage(result.uri);
    } catch (e) {
      console.error('image pick error', e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: text }]}>Item {index} of {total}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: text }]}>Category</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]} value={category} onChangeText={setCategory} />

        <Text style={[styles.label, { color: text }]}>Description</Text>
        <TextInput style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor: border, color: text }]} value={description} onChangeText={setDescription} multiline />

        <Text style={[styles.label, { color: text }]}>Pickup Address</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text, flex: 1 }]} value={address} onChangeText={setAddress} />
          <TouchableOpacity onPress={async () => {
            // request location and reverse-geocode
            navigator.geolocation.getCurrentPosition(async (pos) => {
              const { latitude, longitude } = pos.coords;
              setCoords({ latitude, longitude });
              try {
                const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
                const d = await r.json();
                setAddress(d.display_name || `${latitude}, ${longitude}`);
              } catch (e) {
                setAddress(`${latitude}, ${longitude}`);
              }
            }, (err) => Alert.alert('Location error', 'Could not get current location'), { enableHighAccuracy: true, timeout: 15000 });
          }} style={{ marginLeft: 8 }}>
            <Ionicons name="location" size={28} color={btnColor} />
          </TouchableOpacity>
        </View>

        {isPerishable === 'Yes' && (
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
            placeholder="Expiration date (YYYY-MM-DD)"
            placeholderTextColor="#999"
            value={expirationDate}
            onChangeText={setExpirationDate}
          />
        )}

        {donationType === 'food' && (
          <>
            <Text style={[styles.label, { color: text }]}>Is Perishable</Text>
            <TouchableOpacity style={[styles.dropdown, { backgroundColor: inputBg, borderColor: border }]} onPress={() => setIsPerishable(isPerishable === 'Yes' ? 'No' : 'Yes')}>
              <Text style={[styles.dropdownText, { color: text }]}>{isPerishable}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity style={[styles.imagePickerBox, { borderColor: border }]} onPress={pickImage}> 
            {image ? (
              <Image source={{ uri: image }} style={{ width: 56, height: 56, borderRadius: 8 }} />
            ) : (
              <Text style={styles.plus}>+</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.imagePickerBox, { borderColor: border }]} onPress={async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') { Alert.alert('Permission required', 'Camera permission is required to take a photo.'); return; }
              const result = await ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
              if (!result.cancelled) setImage(result.uri);
            } catch (e) { console.error('camera error', e); }
          }}>
            <Ionicons name="camera" size={28} color={btnColor} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: btnColor }]} onPress={submitStep} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{index < total ? 'Next' : 'Submit'}</Text>}
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footerContainer}>
        <Image source={require('../assets/images/Z A A D.png')} style={styles.footerLogo} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 120 },
  label: { fontSize: 16, marginBottom: 8 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, borderWidth: 1, marginBottom: 12 },
  textArea: { height: 90, textAlignVertical: 'top' },
  dropdown: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, marginBottom: 12 },
  dropdownText: { fontSize: 15 },
  imagePickerBox: { width: 60, height: 60, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20 },
  plus: { fontSize: 32, color: '#A27571' },
  button: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footerContainer: { position: 'absolute', bottom: 10, width: '100%', alignItems: 'center' },
  footerLogo: { width: 80, height: 80, resizeMode: 'contain' },
});
