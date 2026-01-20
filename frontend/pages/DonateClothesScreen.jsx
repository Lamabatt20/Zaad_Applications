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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import config from "../config";

export default function DonateClothesScreen({ navigation, route }) {
  const { association, user: routeUser } = route.params || {};
  const [user, setUser] = useState(routeUser);
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null);
  const [condition, setCondition] = useState("New");
  const [darkMode, setDarkMode] = useState(false);
  const [showCondition, setShowCondition] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const CATEGORIES = ["Newborn", "Toddlers", "Kids", "Women", "Men"];
  const CONDITIONS = ["New", "Like New", "Used", "Needs Repair"];

  useEffect(() => {
    const loadData = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
      
      // Load user from AsyncStorage if not in route params
      if (!routeUser) {
        const userData = await AsyncStorage.getItem("user_data");
        if (userData) {
          const parsed = JSON.parse(userData);
          console.log("Loaded user from storage:", parsed);
          setUser(parsed);
        } else {
          console.log("No user_data found in AsyncStorage");
        }
      } else {
        console.log("User from route params:", routeUser);
      }
    };
    loadData();
  }, []);

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#333";
  const inputBg = darkMode ? "#2a2a2a" : "#fff";
  const border = darkMode ? "#555" : "#ddd";
  const nextBtnBg = "#A27571";

  const requestAndFetchLocation = async () => {
    try {
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
    } catch (err) {
      Alert.alert("Location error", "Unable to fetch location");
    }
  };

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




  const submitDonation = async () => {
    if (!category || !description || !address) {
      Alert.alert("Validation", "Please fill all required fields");
      return;
    }
    
    console.log("Submit donation - user state:", user);
    
    setSubmitting(true);
    try {
      const accountId = user?.account_id || user?.user_id || user?.id;
      console.log("Account ID extracted:", accountId);
      
      if (!accountId) {
        console.error("No account ID found. User object:", user);
        throw new Error("Missing user session. Please log in again.");
      }

      const usersRes = await fetch(`${config.API_URL}/users`);
      const usersList = await usersRes.json();
      const realUser = usersList.find((u) => u.account_id === accountId);
      if (!realUser) throw new Error("User not found. Please log in again.");

      const donorsRes = await fetch(`${config.API_URL}/donors`);
      const donorsList = await donorsRes.json();
      const donor = donorsList.find((d) => d.user_id === realUser.user_id);
      if (!donor) throw new Error("You need to register as a donor first.");

      const donorId = donor.user_id;
      const associationId = association?.association_id || association?.id || null;

      const form = new FormData();
      form.append("donor_id", donorId);
      form.append("donation_type", "clothes");
      form.append("note", description);
      form.append("status", "pending");
      form.append("address", address);
      if (associationId) form.append("association_id", associationId);
      if (images.length > 0) {
        form.append("item_image", {
          uri: images[0],
          name: "clothes.jpg",
          type: "image/jpeg",
        });
      }

      console.log("Sending donation request with donor_id:", donorId);
      
      const donationRes = await fetch(`${config.API_URL}/donations`, {
        method: "POST",
        body: form,
      });
      const donationText = await donationRes.text();
      console.log("Donation response status:", donationRes.status);
      console.log("Donation response text:", donationText);
      
      if (!donationRes.ok) {
        throw new Error(donationText || `Donation failed (${donationRes.status})`);
      }

      let donation;
      try {
        donation = JSON.parse(donationText);
        console.log("Parsed donation:", donation);
      } catch (parseErr) {
        console.error("Failed to parse donation response:", parseErr);
        throw new Error("Invalid server response. Please try again.");
      }
      
      if (!donation?.donation_id) {
        console.error("No donation_id in response:", donation);
        throw new Error("Failed to create donation - no donation_id returned");
      }

      console.log("Creating clothes donation with donation_id:", donation.donation_id);
      
      const clothesRes = await fetch(`${config.API_URL}/clothes_donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donation_id: donation.donation_id,
          clothes_type: category,
        }),
      });
      
      const clothesText = await clothesRes.text();
      console.log("Clothes donation response:", clothesText);
      
      if (!clothesRes.ok) throw new Error("Failed to save clothes donation");

      Alert.alert("Success", "Clothes donation submitted");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to submit donation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    submitDonation();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: text }]}>Donate Clothes</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.label, { color: text }]}>Category</Text>
        <TouchableOpacity
          style={[styles.dropdown, { backgroundColor: inputBg, borderColor: border }]}
          onPress={() => setShowCategory((prev) => !prev)}
        >
          <Text style={[styles.dropdownText, { color: category ? text : "#999" }]}>
            {category || "Select Category"}
          </Text>
          <Ionicons
            name={showCategory ? "chevron-up" : "chevron-down"}
            size={20}
            color={text}
          />
        </TouchableOpacity>
        {showCategory && (
          <View
            style={{
              backgroundColor: inputBg,
              borderColor: border,
              borderWidth: 1,
              borderRadius: 10,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            {CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => {
                  setCategory(item);
                  setShowCategory(false);
                }}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderBottomWidth: item !== CATEGORIES.at(-1) ? 1 : 0,
                  borderBottomColor: border,
                }}
              >
                <Text style={{ color: text }}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

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

        <Text style={[styles.label, { color: text }]}>Condition</Text>
        <TouchableOpacity
          style={[styles.dropdown, { backgroundColor: inputBg, borderColor: border }]}
          onPress={() => setShowCondition((prev) => !prev)}
        >
          <Text style={[styles.dropdownText, { color: text }]}>{condition}</Text>
          <Ionicons
            name={showCondition ? "chevron-up" : "chevron-down"}
            size={20}
            color={text}
          />
        </TouchableOpacity>
        {showCondition && (
          <View
            style={{
              backgroundColor: inputBg,
              borderColor: border,
              borderWidth: 1,
              borderRadius: 10,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            {CONDITIONS.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => {
                  setCondition(item);
                  setShowCondition(false);
                }}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderBottomWidth: item !== CONDITIONS.at(-1) ? 1 : 0,
                  borderBottomColor: border,
                }}
              >
                <Text style={{ color: text }}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[styles.label, { color: text }]}>Take pictures of the Donated Item</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {images.map((uri) => (
            <View key={uri} style={{ position: "relative" }}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity onPress={() => removeImage(uri)} style={{ position: "absolute", top: -6, right: -6 }}>
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
          style={[styles.nextBtn, { backgroundColor: nextBtnBg, opacity: submitting ? 0.7 : 1 }]}
          onPress={handleNext}
          disabled={submitting}
        >
          <Text style={styles.nextText}>{submitting ? "Submitting..." : "Next"}</Text>
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
  input: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
  },
  textArea: { height: 90, textAlignVertical: "top" },
  dropdown: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: -1,
  },
  dropdownText: { fontSize: 15 },
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
  image: { width: 80, height: 80, borderRadius: 8 },
  plus: { fontSize: 32, color: "#A27571", fontWeight: "300" },
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
  footerLogo: { width: 80, height: 80, resizeMode: "contain" },
});
