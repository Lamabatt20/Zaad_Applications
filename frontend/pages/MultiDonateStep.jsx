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

export default function MultiDonateStep({ route, navigation }) {
  const { association, donationType, total = 1, index = 1 } = route.params || {};

  const [category, setCategory] = useState("");
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
  const btnColor = "#A27571";

  /* ================= HELPERS ================= */

  const resetForm = () => {
    setCategory("");
    setDescription("");
    setAddress("");
    setCoords(null);
    setImages([]);
  };

  const goNextItem = () => {
    resetForm();

    
    if (index < total) {
      navigation.replace("MultiDonateStep", {
        association,
        donationType,
        total,
        index: index + 1,
      });
    } 
    
    else {
      navigation.pop(); 
    }
  };

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

  const submitStep = async () => {
    if (!address || images.length === 0) {
      Alert.alert("Validation", "Please add address and images");
      return;
    }

    setLoading(true);

    try {
      /* ---------- 1️⃣ AI CHECK ---------- */
      const aiForm = new FormData();
      images.forEach((uri, i) => {
        aiForm.append("images", {
          uri,
          name: `img_${i}.jpg`,
          type: "image/jpeg",
        });
      });

      const aiRes = await fetch(`${API.API_URL}/ai/check-food-new`, {
        method: "POST",
        body: aiForm,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!aiRes.ok) {
        const errorText = await aiRes.text();
        setLoading(false);
        Alert.alert(
          "AI Check Failed",
          `Unable to verify the item: ${errorText || 'Server error'}`
        );
        return;
      }

      const aiData = await aiRes.json();

      /* ❌ COOKED */
      if (aiData.rejected && aiData.reason?.includes("مطبوخ")) {
        setLoading(false);
        Alert.alert(
          "❌ Rejected",
          "This food appears to be cooked.\nOnly packaged food can be donated.",
          [{ text: "OK", onPress: goNextItem }]
        );
        return;
      }

      /* ❌ MOLD */
      if (aiData.rejected && aiData.reason?.includes("متعفّن")) {
        setLoading(false);
        Alert.alert(
          "❌ Rejected",
          "The product shows signs of mold.\nPlease do not donate moldy items.",
          [{ text: "OK", onPress: goNextItem }]
        );
        return;
      }

      /* ❌ DAMAGED */
      if (aiData.rejected && aiData.reason?.includes("تالف")) {
        setLoading(false);
        Alert.alert(
          "❌ Rejected",
          "The product is damaged or unsafe.\nPlease check the packaging.",
          [{ text: "OK", onPress: goNextItem }]
        );
        return;
      }

      /* ❌ EXPIRED */
      if (aiData.expired) {
        setLoading(false);
        Alert.alert(
          "❌ Expired Item",
          "This product is expired and cannot be donated.",
          [{ text: "OK", onPress: goNextItem }]
        );
        return;
      }

      /* ⚠️ IMAGE NOT CLEAR */
      if (aiData.need_clear_image) {
        setLoading(false);
        Alert.alert(
          "⚠️ Image Not Clear",
          "Please retake the image and make sure the expiration date is clearly visible."
        );
        return;
      }

      /* ✅ ACCEPTED - Continue with donation */
      // Item passed all AI checks

      /* ---------- 2️⃣ SET CATEGORY ---------- */
      setCategory(aiData.food_category);

      /* ---------- 3️⃣ GET USER ---------- */
      let user = route?.params?.user;

      if (!user) {
        const userRaw = await AsyncStorage.getItem("user_data");
        user = userRaw ? JSON.parse(userRaw) : null;
      }

      if (!user?.account_id) {
        Alert.alert(
          "Session Error",
          "User session data is missing. Please log in again."
        );
        setLoading(false);
        return;
      }

      const usersRes = await fetch(`${API.API_URL}/users`);
      const users = await usersRes.json();
      const realUser = users.find(u => u.account_id === user.account_id);

      if (!realUser) {
        Alert.alert(
          "User Not Found",
          "Your account information could not be found. Please log in again."
        );
        setLoading(false);
        return;
      }

      const donorsRes = await fetch(`${API.API_URL}/donors`);
      const donors = await donorsRes.json();
      const donor = donors.find(d => d.user_id === realUser.user_id);

      if (!donor) {
        Alert.alert(
          "Registration Required",
          "You need to register as a donor before making donations. Please complete your registration first."
        );
        setLoading(false);
        return;
      }
      const association_id = association?.association_id;
      /* ---------- 4️⃣ SAVE DONATION ---------- */
      const donationForm = new FormData();
      donationForm.append("donor_id", donor.user_id);
      donationForm.append("donation_type", donationType || "food");
      donationForm.append("status", "accepted");
      donationForm.append("note", description);
      donationForm.append("address", address);

      donationForm.append("association_id", association_id);


      donationForm.append("item_image", {
        uri: images[0],
        name: "main.jpg",
        type: "image/jpeg",
      });

      const donationRes = await fetch(`${API.API_URL}/donations`, {
        method: "POST",
        body: donationForm,
      });

      const textRes = await donationRes.text();
      
      if (!donationRes.ok) {
        console.log("Donation API error:", textRes);
        throw new Error(
          textRes || `Server error: ${donationRes.status} ${donationRes.statusText}`
        );
      }

      /* ---------- 5️⃣ FOOD DETAILS ---------- */
      let donation;
      try {
        donation = JSON.parse(textRes);
      } catch (parseErr) {
        console.error("Failed to parse donation response:", textRes);
        throw new Error("Invalid server response. Please try again.");
      }

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

      /* ---------- 6️⃣ NEXT ---------- */
      Alert.alert(
        "✅ Item Accepted",
        "Your donation has been submitted successfully!",
        [{ text: "OK", onPress: goNextItem }]
      );

    } catch (err) {
      console.error("Donation error:", err);
      setLoading(false);
      
      let errorMessage = "An unexpected error occurred";
      
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      Alert.alert(
        "Donation Failed",
        errorMessage.includes('network') || errorMessage.includes('fetch')
          ? "Network error. Please check your internet connection and try again."
          : errorMessage
      );
    }
  };

  /* ================= UI ================= */

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: text }]}>Donate Food</Text>
          <Text style={{ color: "#999", fontSize: 13 }}>
            Item {index} of {total}
          </Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
          placeholder="Category"
          value={category}
          editable={false}
        />

        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor: border, color: text }]}
          placeholder="Description"
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
            <Ionicons name="location" size={28} color={btnColor} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: text }]}>
          Take pictures of the Donated Item
        </Text>

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
          style={[styles.nextBtn, { backgroundColor: btnColor }]}
          onPress={submitStep}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextText}>Next</Text>}
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
  input: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  textArea: { height: 90 },
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
  nextBtn: { paddingVertical: 14, borderRadius: 10, marginTop: 20 },
  nextText: { color: "#fff", textAlign: "center", fontSize: 16, fontWeight: "600" },
});
