import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  SafeAreaView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../config";
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

export default function DonateFoodScreen({ navigation, route }) {
  const initialQuantity = route?.params?.quantity ?? "";
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState(String(initialQuantity));
  const [hideQuantityInput, setHideQuantityInput] = useState(false);
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null);
  const [images, setImages] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadDark = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadDark();
    // if EnterQuantityScreen passed quantity === 1 hide the quantity input
    if (initialQuantity === 1 || initialQuantity === "1") {
      setHideQuantityInput(true);
      setQuantity("1");
    }
  }, []);

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#333";
  const inputBg = darkMode ? "#2a2a2a" : "#fff";
  const border = darkMode ? "#555" : "#ddd";
  const nextBtnBg = "#A27571";

  const requestAndFetchLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to use this feature.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const { latitude, longitude } = pos.coords;
      setCoords({ latitude, longitude });
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        const display = data.display_name || `${latitude}, ${longitude}`;
        setAddress(display);
      } catch (e) {
        setAddress(`${latitude}, ${longitude}`);
      }
    } catch (e) {
      console.error('location error', e);
      Alert.alert('Location error', 'Could not get current location');
    }
  };

  const pickFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Permission to access media library is required');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      const uri = result?.uri ?? result?.assets?.[0]?.uri;
      const canceled = result?.cancelled === true || result?.canceled === true;
      if (!canceled && uri) {
        setImages((s) => [...s, uri]);
      }
    } catch (e) {
      console.error('image pick error', e);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Permission to use camera is required');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });
      const uri = result?.uri ?? result?.assets?.[0]?.uri;
      const canceled = result?.cancelled === true || result?.canceled === true;
      if (!canceled && uri) {
        setImages((s) => [...s, uri]);
      }
    } catch (e) {
      console.error('camera error', e);
    }
  };

  const onPressImagePicker = () => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose From Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removeImage = (uri) => {
    setImages((s) => s.filter((u) => u !== uri));
  };

  const handleNext = async () => {
    const qty = quantity && quantity !== "" ? quantity : "1";
    if (!address || address.trim() === "") {
      Alert.alert("Validation", "Please enter pickup address");
      return;
    }

    const payload = {
      category,
      quantity: Number(qty),
      description,
      address,
      coords,
      type: "food",
      association: route?.params?.association || null,
    };

    try {
      const res = await fetch(`${API.API_URL}/donations/food`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("save error", txt);
        Alert.alert("Error", "Could not save donation");
        return;
      }

      const data = await res.json();
      Alert.alert("Success", "Donation saved");
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Network error");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: text }]}>Donate Food</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
          placeholder="Category"
          placeholderTextColor="#999"
          value={category}
          onChangeText={setCategory}
        />

        
        {!hideQuantityInput && (
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
            placeholder="Quantity"
            placeholderTextColor="#999"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
        )}

        
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor: border, color: text }]}
          placeholder="Description"
          placeholderTextColor="#999"
          multiline
          value={description}
          onChangeText={setDescription}
        />

          
        {/* Location button for precise address */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity style={[styles.input, { backgroundColor: inputBg, borderColor: border, flex: 1 }]} onPress={() => requestAndFetchLocation()}>
            <Text style={{ color: text }}>{address ? address : 'Use current location to fill address'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={requestAndFetchLocation} style={{ marginLeft: 8 }}>
            <Ionicons name="location" size={28} color={nextBtnBg} />
          </TouchableOpacity>
        </View>

       
        <Text style={[styles.label, { color: text }]}>
          Take pictures of the Donated Item
        </Text>
        <Text style={[styles.hint, { color: "#999" }]}>
          Please Make sure to show the Expiration Date
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 20 }}>
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 90 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {images.map((uri) => (
                  <View key={uri} style={{ position: 'relative', marginRight: 8 }}>
                    <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                    <TouchableOpacity onPress={() => removeImage(uri)} style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 12, padding: 2 }}>
                      <Ionicons name="close" size={16} color="#A27571" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          <TouchableOpacity style={[styles.imagePickerBox, { borderColor: border }]} onPress={onPressImagePicker}>
            <Text style={styles.plus}>+</Text>
          </TouchableOpacity>
        </View>

    
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: nextBtnBg }]} onPress={handleNext}> 
          <Text style={styles.nextText}>next</Text>
        </TouchableOpacity>
      </ScrollView>

    
      <View style={styles.footerContainer}>
        <Image
          source={require("../assets/images/Z A A D.png")}
          style={styles.footerLogo}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    marginBottom: 10,
    fontWeight: "400",
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  dropdown: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  dropdownText: {
    fontSize: 15,
  },
  imagePickerBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  plus: {
    fontSize: 32,
    color: "#A27571",
    fontWeight: "300",
  },
  nextBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 40,
  },
  nextText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  footerContainer: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    alignItems: "center",
  },
  footerLogo: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
});
