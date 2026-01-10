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
export default function DonateClothesScreen({ navigation, route }) {
  const { association, user } = route.params || {};
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null);
  const [condition, setCondition] = useState("New");
  const [darkMode, setDarkMode] = useState(false);
  const [showCondition, setShowCondition] = useState(false);
  const CONDITIONS = ["New", "Like New", "Used", "Needs Repair"];

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

  /* ================= LOCATION (LIKE FOOD) ================= */
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


  const handleNext = () => {
    if (!category || !description || !address) {
      Alert.alert("Validation", "Please fill all required fields");
      return;
    }

    Alert.alert("Success", "Clothes donation saved");
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: text }]}>
          Donate Clothes
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Category */}
        <TextInput
          style={[
            styles.input,
            { backgroundColor: inputBg, borderColor: border, color: text },
          ]}
          placeholder="Category"
          placeholderTextColor="#999"
          value={category}
          onChangeText={setCategory}
        />

        {/* Description */}
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: inputBg, borderColor: border, color: text },
          ]}
          placeholder="Description"
          placeholderTextColor="#999"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        {/* ===== Address (LIKE FOOD) ===== */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={[
              styles.input,
              { flex: 1, backgroundColor: inputBg, borderColor: border },
            ]}
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

        {/* Condition */}
        <Text style={[styles.label, { color: text }]}>Condition</Text>
        <TouchableOpacity
        style={[
          styles.dropdown,
          { backgroundColor: inputBg, borderColor: border },
        ]}
        onPress={() => setShowCondition((prev) => !prev)}
      >
        <Text style={[styles.dropdownText, { color: text }]}>
          {condition}
        </Text>
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
        {/* Images */}
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


        {/* Next */}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: nextBtnBg }]}
          onPress={handleNext}
        >
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
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
