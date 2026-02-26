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
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import config from "../config";

export default function MultiDonateClothesStep({ navigation, route }) {
  const { total = 1, index = 1, association, user: routeUser, savedAddress, savedCoords } = route.params || {};
  const [user, setUser] = useState(routeUser);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState(savedAddress || "");
  const [coords, setCoords] = useState(savedCoords || null);
  const [condition, setCondition] = useState("New");
  const [darkMode, setDarkMode] = useState(false);
  const [images, setImages] = useState([]);
  const [showCondition, setShowCondition] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Validation steps
  const [step1Complete, setStep1Complete] = useState(false); // Basic info
  const [step2Complete, setStep2Complete] = useState(false); // Images added
  const [step3Complete, setStep3Complete] = useState(false); // Location set
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

  // Validation effect
  useEffect(() => {
    // Step 1: Basic info (category, description, condition)
    if (category && description && condition) {
      setStep1Complete(true);
    } else {
      setStep1Complete(false);
    }

    // Step 2: At least one image
    if (images.length > 0) {
      setStep2Complete(true);
    } else {
      setStep2Complete(false);
    }

    // Step 3: Address
    if (address) {
      setStep3Complete(true);
    } else {
      setStep3Complete(false);
    }
  }, [category, description, condition, images, address]);

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#333";
  const inputBg = darkMode ? "#2a2a2a" : "#fff";
  const border = darkMode ? "#555" : "#ddd";
  const nextBtnBg = "#A27571";

  /* ================= LOCATION (LIKE FOOD) ================= */
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


  const handleNext = () => {
    // Validate all steps are complete
    if (!step1Complete) {
      Alert.alert("Incomplete", "Please fill in category, description, and condition");
      return;
    }
    if (!step2Complete) {
      Alert.alert("Incomplete", "Please add at least one photo of the item");
      return;
    }
    if (!step3Complete) {
      Alert.alert("Incomplete", "Please set the pickup location");
      return;
    }

    const currentItem = {
      category,
      description,
      address,
      images,
      condition,
    };

    const previousItems = route.params?.items || [];
    const updatedItems = [...previousItems, currentItem];

    // If more items to add, go to next item
    if (index < total) {
      navigation.replace("MultiDonateClothesStep", {
        total,
        index: index + 1,
        association,
        user,
        items: updatedItems,
        savedAddress: address,  // Pass location to next item
        savedCoords: coords,    // Pass coordinates to next item
      });
    } 
    // All items collected, proceed to delivery method
    else {
      navigation.navigate("DeliveryMethodScreen", {
        association,
        user,
        donationType: "clothes",
        items: updatedItems,
      });
    }
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={text} />
        </TouchableOpacity>

        <View>
          <Text style={[styles.headerTitle, { color: text }]}>
            Donate Clothes
          </Text>
          <Text style={{ color: "#999", fontSize: 13 }}>
            Item {index} of {total}
          </Text>
        </View>

        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Category */}
        <Text style={[styles.label, { color: text }]}>Category</Text>
        <TouchableOpacity
          style={[
            styles.dropdown,
            { backgroundColor: inputBg, borderColor: border },
          ]}
          onPress={() => setShowCategory((prev) => !prev)}
        >
          <Text
            style={[styles.dropdownText, { color: category ? text : "#999" }]}
          >
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
        <Text style={[styles.label, { color: text }]}>Pickup Location</Text>
        {savedAddress && index > 1 && (
          <Text style={styles.hint}>Using location from first item (locked)</Text>
        )}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={[
              styles.input,
              { 
                flex: 1, 
                backgroundColor: savedAddress && index > 1 ? (darkMode ? "#1a1a1a" : "#f5f5f5") : inputBg, 
                borderColor: border,
                opacity: savedAddress && index > 1 ? 0.6 : 1
              },
            ]}
            onPress={requestAndFetchLocation}
            disabled={savedAddress && index > 1}
          >
            <Text style={{ color: text }}>
              {address || "Use current location"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={requestAndFetchLocation} 
            style={{ justifyContent: "center" }}
            disabled={savedAddress && index > 1}
          >           
            <Ionicons 
              name={savedAddress && index > 1 ? "lock-closed" : "location"} 
              size={30} 
              color={savedAddress && index > 1 ? "#999" : nextBtnBg} 
            />
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
          Take pictures of the Donated Item *
        </Text>
        <Text style={styles.hint}>At least one photo is required</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {images.map((uri) => (
            <View key={uri} style={{ position: "relative" }}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity
                onPress={() => removeImage(uri)}
                style={styles.removeBtn}
              >
                <Ionicons name="close-circle" size={20} color="#A27571" />
              </TouchableOpacity>
            </View>
          ))}

          {images.length === 0 && (
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
          )}
        </View>


        {/* Next */}
        <TouchableOpacity
          style={[
            styles.nextBtn, 
            { backgroundColor: (step1Complete && step2Complete && step3Complete) ? nextBtnBg : "#ccc" }
          ]}
          onPress={handleNext}
          disabled={!step1Complete || !step2Complete || !step3Complete || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextText}>
              {index < total ? `Next Item (${index}/${total})` : "Continue to Delivery"}
            </Text>
          )}
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
  hint: { 
    fontSize: 13, 
    color: "#999", 
    marginBottom: 10 
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    marginTop: 8,
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
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  image: { width: 80, height: 80, borderRadius: 8 },
  removeBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
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
