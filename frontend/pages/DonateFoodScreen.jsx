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
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../config";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";

export default function DonateFoodScreen({ navigation, route }) {
  const initialQuantity = route?.params?.quantity ?? "1";

  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState(initialQuantity);
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null);
  const [images, setImages] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDark = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadDark();
  }, []);

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#333";
  const inputBg = darkMode ? "#2a2a2a" : "#fff";
  const border = darkMode ? "#555" : "#ddd";
  const nextBtnBg = "#A27571";
  

  /* ================= LOCATION ================= */
  const requestAndFetchLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Location permission is required");
      return;
    }

    const pos = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = pos.coords;
    setCoords({ latitude, longitude });

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
    );
    const data = await res.json();
    setAddress(data.display_name || `${latitude}, ${longitude}`);
  };

  /* ================= IMAGE PICK ================= */
  const pickImage = async (fromCamera = false) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert("Permission denied");
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (!result.canceled) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (uri) => {
    setImages((prev) => prev.filter((i) => i !== uri));
  };

  /* ================= MAIN FLOW ================= */
  const handleNext = async () => {
    if (!address || images.length === 0) {
      Alert.alert("Validation", "Please add address and images");
      return;
    }

    setLoading(true);

    try {
      /* ---------- 1️⃣ AI CHECK ---------- */
      const aiForm = new FormData();
      images.forEach((uri, index) => {
        aiForm.append("images", {
          uri,
          name: `img_${index}.jpg`,
          type: "image/jpeg",
        });
      });

      const aiRes = await fetch(`${API.API_URL}/ai/check-expiry`, {
        method: "POST",
        body: aiForm,
        headers: { "Content-Type": "multipart/form-data" },
      });

      const aiData = await aiRes.json();

      if (!aiData.success || aiData.need_clear_image) {
        setLoading(false);
        Alert.alert(
          "Image not clear",
          "Please retake the image and make sure the expiration date is clear"
        );
        return;
      }

      if (aiData.expired) {


        
        setLoading(false);
        Alert.alert(
                  "Rejected",
                  "This item is expired and will be skipped",
                  [{ text: "OK", onPress: goNextItem }]
                );
        return;
      }

      /* ---------- 2️⃣ SET CATEGORY FROM AI ---------- */
      setCategory(aiData.food_category);

      /* ---------- 3️⃣ SAVE DONATION ---------- */
      
        const user = route?.params?.user;
      console.log("USER ARRIVED:", user);

      if (!user?.account_id) {
        Alert.alert("Error", "User data missing");
        setLoading(false);
        return;
      }

      /* 1️⃣ get real user_id from users table */
      const usersRes = await fetch(`${API.API_URL}/users`);
      const users = await usersRes.json();

      const realUser = users.find(
        u => u.account_id === user.account_id
      );

      if (!realUser) {
        Alert.alert("Error", "User not found in users table");
        setLoading(false);
        return;
      }

      const real_user_id = realUser.user_id;
      console.log("REAL USER ID:", real_user_id);

     
      const donorsRes = await fetch(`${API.API_URL}/donors`);
      const donors = await donorsRes.json();

      const donor = donors.find(
        d => d.user_id === real_user_id
      );

      if (!donor) {
        Alert.alert("Error", "User is not registered as donor");
        setLoading(false);
        return;
      }

      
      const donor_id = donor.user_id;
      console.log("FINAL DONOR ID:", donor_id);
      const association_id = route?.params?.association?.association_id || null;

      const donationForm = new FormData();
      donationForm.append("donor_id", donor_id);
      donationForm.append("donation_type", "food");
      donationForm.append("status", "accepted");
      donationForm.append("note", description);
      donationForm.append("address", address);

      if (association_id) {
        donationForm.append("association_id", association_id);
      }


      donationForm.append("item_image", {
        uri: images[0],
        name: "main.jpg",
        type: "image/jpeg",
      });

      const donationRes = await fetch(`${API.API_URL}/donations`, {
            method: "POST",
            body: donationForm,
          });

          const text = await donationRes.text();

          if (!donationRes.ok) {
            console.log("Donation API error:", text);
            throw new Error(text);
          }

          const donation = JSON.parse(text);

      /* ---------- 4️⃣ SAVE FOOD DETAILS ---------- */
      await fetch(`${API.API_URL}/food_donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donation_id: donation.donation_id,
          food_type: aiData.food_category,
          expiration_date: aiData.expiry_date,
        }),
      });

      setLoading(false);
      Alert.alert("Success", "Donation accepted");
      navigation.goBack();
    } catch (err) {
      console.error(err);
      setLoading(false);
      Alert.alert("Error", "Something went wrong");
    }
  };

  /* ================= UI (UNCHANGED DESIGN) ================= */
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: text }]}>
          Donate Food
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
          placeholder="Category"
          placeholderTextColor="#999"
          value={category}
          editable={false}
        />

        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor: border, color: text }]}
          placeholder="Description"
          placeholderTextColor="#999"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={[styles.input, { flex: 1, backgroundColor: inputBg, borderColor: border }]}
            onPress={requestAndFetchLocation}
          >
            <Text style={{ color: text }}>
              {address || "Use current location"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={requestAndFetchLocation}>
            <Ionicons name="location" size={28} color={nextBtnBg} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: text }]}>
          Take pictures of the Donated Item
        </Text>
        <Text style={[styles.hint]}>Please make sure to show the Expiration Date</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {images.map((uri) => (
            <View key={uri} style={{ position: "relative" }}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity
                onPress={() => removeImage(uri)}
                style={{ position: "absolute", top: -6, right: -6 }}
              >
                <Ionicons name="close-circle" size={18} color="#A27571" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.imagePickerBox, { borderColor: border }]}
            onPress={() =>
              Alert.alert("Add Photo", "Choose", [
                { text: "Camera", onPress: () => pickImage(true) },
                { text: "Gallery", onPress: () => pickImage(false) },
                { text: "Cancel", style: "cancel" },
              ])
            }
          >
            <Text style={styles.plus}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: nextBtnBg }]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextText}>Next</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  label: { fontSize: 16, fontWeight: "600", marginTop: 16 },
  hint: { fontSize: 13, color: "#999", marginBottom: 10 },
  input: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  textArea: { height: 90, textAlignVertical: "top" },
  imagePickerBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: 80, height: 80, borderRadius: 8 },
  plus: { fontSize: 32, color: "#A27571" },
  nextBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  nextText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
});
