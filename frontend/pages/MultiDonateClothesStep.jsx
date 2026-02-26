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
  
  console.log("🎬 [MultiDonateClothesStep] Component initialized with:");
  console.log("   - total:", total);
  console.log("   - index:", index);
  console.log("   - items count:", route.params?.items?.length || 0);
  console.log("   - association:", association?.association_name || "none");
  
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


  const handleNext = async () => {
    console.log("🚀 [handleNext] START - index:", index, "total:", total);
    
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
    
    console.log("📋 [handleNext] previousItems count:", previousItems.length);
    console.log("📋 [handleNext] updatedItems count:", updatedItems.length);
    console.log("📋 [handleNext] updatedItems:", updatedItems.map((item, i) => `Item ${i+1}: ${item.category}`));

    // If more items to add, go to next item
    if (index < total) {
      console.log("➡️ [handleNext] Going to NEXT item. index < total:", index, "<", total);
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
    // All items collected, create donations and proceed to delivery
    else {
      console.log("✨ [handleNext] FINAL SUBMISSION - Creating donations for ALL items");
      console.log("✨ [handleNext] Total items to create:", updatedItems.length);
      console.log("⚠️  [handleNext] ALL DONATIONS WILL BE CREATED WITH STATUS: 'pending'");
      
      setSubmitting(true);
      try {
        // Get user data with multiple fallbacks
        let userData = user;
        console.log("🔍 [handleNext] Current state user:", userData);
        
        // Try route params user
        if (!userData) {
          userData = route.params?.user;
          console.log("🔍 [handleNext] Route params user:", userData);
        }
        
        // Try AsyncStorage
        if (!userData) {
          const storedData = await AsyncStorage.getItem("user_data");
          if (storedData) {
            userData = JSON.parse(storedData);
            console.log("🔍 [handleNext] AsyncStorage user:", userData);
          }
        }
        
        console.log("✅ [handleNext] Final userData:", userData);
        console.log("🔍 [handleNext] userData properties:", userData ? Object.keys(userData) : "null");
        
        // Check for any user identifier
        const userId = userData?.user_id || userData?.account_id;
        const accountId = userData?.account_id;
        
        if (!userId && !accountId) {
          console.log("❌ [handleNext] Missing user identifiers. userData keys:", userData ? Object.keys(userData) : "null");
          console.log("❌ [handleNext] Full userData:", JSON.stringify(userData));
          throw new Error("Session expired. Please log in again.");
        }

        // Fetch user data - try using account_id first, then user_id
        console.log("📡 [handleNext] Fetching users...");
        const usersRes = await fetch(`${config.API_URL}/users`);
        if (!usersRes.ok) throw new Error("Failed to fetch users");
        const users = await usersRes.json();
        
        let realUser;
        if (accountId) {
          realUser = users.find((u) => u.account_id === accountId);
        } else if (userId) {
          realUser = users.find((u) => u.user_id === userId);
        }
        
        console.log("🔍 [handleNext] Found user:", realUser);
        if (!realUser) {
          console.log("❌ [handleNext] User not found. Searched for account_id:", accountId, "or user_id:", userId);
          throw new Error("User not found in database");
        }

        console.log("📡 [handleNext] Fetching donors...");
        const donorsRes = await fetch(`${config.API_URL}/donors`);
        if (!donorsRes.ok) throw new Error("Failed to fetch donors");
        const donors = await donorsRes.json();
        
        const donor = donors.find((d) => d.user_id === realUser.user_id);
        console.log("🔍 [handleNext] Found donor:", donor);
        if (!donor) throw new Error("Not registered as donor");

        const donor_id = donor.user_id;

        // Create donations for all items
        const donationIds = [];
        console.log("🔄 [handleNext] Starting donation creation loop for", updatedItems.length, "items");
        
        for (let i = 0; i < updatedItems.length; i++) {
          const item = updatedItems[i];
          console.log(`\n📦 [handleNext] ========== ITEM ${i + 1}/${updatedItems.length} ==========`);
          console.log(`📦 [handleNext] Category: ${item.category}, Condition: ${item.condition}`);
          console.log(`📦 [handleNext] Description: ${item.description?.substring(0, 50)}...`);
          
          const donationForm = new FormData();
          donationForm.append("donor_id", donor_id);
          donationForm.append("donation_type", "clothes");
          donationForm.append("status", "pending");
          donationForm.append("note", item.description);
          donationForm.append("address", item.address);
          
          console.log(`📤 [handleNext] Sending donation with status: "pending"`);
          
          if (association?.association_id) {
            donationForm.append("association_id", association.association_id);
            console.log(`📤 [handleNext] Association ID: ${association.association_id}`);
          }
          if (item.images && item.images.length > 0) {
            donationForm.append("item_image", {
              uri: item.images[0],
              name: "main.jpg",
              type: "image/jpeg",
            });
          }

          const donationRes = await fetch(`${config.API_URL}/donations`, {
            method: "POST",
            body: donationForm,
          });
          if (!donationRes.ok) {
            const error = await donationRes.text();
            throw new Error(error || "Failed to create donation");
          }

          const donationData = await donationRes.json();
          console.log(`✅ [handleNext] Created donation ID: ${donationData.donation_id}`);
          donationIds.push(donationData.donation_id);

          // Create clothes donation record with JSON
          const clothesPayload = {
            donation_id: donationData.donation_id,
            clothes_type: item.category || "Unspecified",
            item_condition: item.condition || "New",
          };

          console.log(`📦 [handleNext] Creating clothes record with:`, clothesPayload);
          const clothesRes = await fetch(`${config.API_URL}/clothes_donations`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(clothesPayload),
          });
          
          if (!clothesRes.ok) {
            const error = await clothesRes.text();
            console.error(`❌ [handleNext] Clothes record error:`, error);
            
            // If duplicate key error, it means the clothes record already exists - skip it
            if (error.includes("already exists") || error.includes("duplicate key")) {
              console.log(`⚠️ [handleNext] Clothes record already exists for donation ${donationData.donation_id}, skipping...`);
            } else {
              throw new Error(error || "Failed to create clothes record");
            }
          } else {
            console.log(`✅ [handleNext] Created clothes record for donation ${donationData.donation_id}`);
          }
        }

        console.log("\n✅ [handleNext] ========== SUMMARY ==========");
        console.log("✅ [handleNext] Total donations created:", donationIds.length);
        console.log("✅ [handleNext] Donation IDs:", donationIds);
        console.log("✅ [handleNext] ================================\n");
        
        // Navigate to delivery screen with all donation IDs
        navigation.navigate("DeliveryMethodScreen", {
          association,
          user: userData,
          donationType: "clothes",
          items: updatedItems,
          donation_ids: donationIds,  // Pass all donation IDs
          donor_id,
        });
      } catch (err) {
        console.error("❌ Error creating donations:", err);
        Alert.alert("Error", err.message || "Failed to process donations");
      } finally {
        setSubmitting(false);
      }
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
