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
import { useFocusEffect, useIsFocused } from "@react-navigation/native";

export default function DonateFoodScreen({ navigation, route }) {
  console.log("🔵 [DonateFoodScreen] Component mounted/rendered");
  const isFocused = useIsFocused();
  const initialQuantity = route?.params?.quantity ?? "1";

  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState(initialQuantity);
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [productImages, setProductImages] = useState([]);
  const [expiryImage, setExpiryImage] = useState(null);

  const [step1Complete, setStep1Complete] = useState(false);
  const [step2Complete, setStep2Complete] = useState(false);
  const [step3Complete, setStep3Complete] = useState(false);

  const [checkingAI, setCheckingAI] = useState(false);
  const [checkingExpiry, setCheckingExpiry] = useState(false);

  const [expiryDate, setExpiryDate] = useState(null);

  useEffect(() => {
    const loadDark = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
      console.log("📱 [useEffect-mount] Dark mode loaded:", saved);
    };
    loadDark();
  }, []);

  // Apply scanned product when returning from ScanScreen
  useFocusEffect(
    React.useCallback(() => {
      console.log(" [useFocusEffect] Screen focused, checking for scanned product...");
      const applyScannedProduct = async () => {
        try {
          const stored = await AsyncStorage.getItem("scanned_product");
          console.log(" [useFocusEffect] AsyncStorage scanned_product:", stored);
          if (stored) {
            const product = JSON.parse(stored);
            console.log(" [useFocusEffect] Parsed product:", product);
            // Remove immediately to prevent re-applying on next focus
            await AsyncStorage.removeItem("scanned_product");
            console.log("🧹 [useFocusEffect] Removed scanned_product from AsyncStorage");
            const normalizedCategory = (product?.category || "").trim().toLowerCase();
            const isDairy = ["dairy", "milk", "حليب", "البان", "ألبان"].some((term) =>
              normalizedCategory.includes(term)
            );
            if (isDairy) {
              Alert.alert("Not allowed", "Dairy items are not accepted for donation.");
              setProductImages([]);
              resetWorkflow();
              return;
            }
            if (product?.name) {
              console.log(" [useFocusEffect] Setting description:", product.name);
              setDescription(product.name);
              setCategory(product.category || "");
              setStep2Complete(true);
              console.log(" [useFocusEffect] Step 2 marked complete");
            }
          }
        } catch (e) {
          console.error(" [useFocusEffect] Error applying scanned product:", e);
        }
      };

      applyScannedProduct();
    }, [])
  );

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#333";
  const inputBg = darkMode ? "#2a2a2a" : "#fff";
  const border = darkMode ? "#555" : "#ddd";
  const nextBtnBg = "#A27571";

  const requestAndFetchLocation = async () => {
    console.log(" [requestAndFetchLocation] Requesting location...");
    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log(" [requestAndFetchLocation] Permission status:", status);
    if (status !== "granted") {
      Alert.alert("Permission denied", "Location permission is required");
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = pos.coords;
    console.log(" [requestAndFetchLocation] Got coords:", latitude, longitude);
    setCoords({ latitude, longitude });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
    );
    const data = await res.json();
    console.log(" [requestAndFetchLocation] Geocoded address:", data.display_name);
    setAddress(data.display_name || `${latitude}, ${longitude}`);
  };

  const resetWorkflow = () => {
    console.log(" [resetWorkflow] Resetting workflow steps");
    setStep1Complete(false);
    setStep2Complete(false);
    setStep3Complete(false);
    setExpiryDate(null);
  };

  const clearForm = () => {
    console.log(" [clearForm] Clearing entire form state");
    setCategory("");
    setDescription("");
    setQuantity("1");
    setAddress("");
    setCoords(null);
    setProductImages([]);
    setExpiryImage(null);
    resetWorkflow();
  };

  const checkAI = async (imageUris) => {
    console.log(" [checkAI] Starting AI check with", imageUris?.length, "images");
    if (!imageUris || imageUris.length === 0) {
      console.log(" [checkAI] No images provided, resetting");
      resetWorkflow();
      return;
    }
    setCheckingAI(true);
    try {
      console.log(" [checkAI] Sending images to /ai/check-food-new");
      const aiForm = new FormData();
      imageUris.forEach((uri, index) => {
        aiForm.append("images", { uri, name: `img_${index}.jpg`, type: "image/jpeg" });
      });
      const aiRes = await fetch(`${API.API_URL}/ai/check-food-new`, {
        method: "POST",
        body: aiForm,
      });
      console.log(" [checkAI] AI response status:", aiRes.status);
      if (!aiRes.ok) {
        const errorText = await aiRes.text();
        console.log(" [checkAI] AI check failed:", errorText);
        throw new Error(errorText || "AI check failed");
      }
      const data = await aiRes.json();
      console.log("[checkAI] AI response data:", data);
      if (data.rejected && data.reason?.includes("مطبوخ")) {
        Alert.alert(
          "Rejected",
          `${data.reason}\nPlease try again with a clear photo.`
        );
        setProductImages([]);
        resetWorkflow();
      } else if (data.rejected && data.reason?.includes("تالف")) {
        Alert.alert(
          "Rejected",
          "This item appears damaged and cannot be accepted. Please try again with a clear photo."
        );
        setProductImages([]);
        resetWorkflow();
      } else if (data.rejected) {
        Alert.alert(
          "Rejected",
          `${data.reason || "Item not accepted"}\nPlease try again with a clear photo.`
        );
        setProductImages([]);
        resetWorkflow();
      } else if (data.passed_checks) {
        console.log("[checkAI] Passed all checks!");
        setStep1Complete(true);
        Alert.alert("Step 1 complete", "Item passed checks. Next: scan the barcode.");
      }
    } catch (err) {
      console.error("AI check error:", err);
      Alert.alert("Error", "Failed to validate item. Please try again.");
      setProductImages([]);
      resetWorkflow();
    } finally {
      setCheckingAI(false);
    }
  };

  const scanBarcode = () => {
    console.log("📱 [scanBarcode] Navigating to ScanScreen with", productImages?.length, "product images");
    navigation.navigate("ScanScreen", { 
      returnTo: "DonateFoodScreen", 
      images: productImages,
      goBackInstead: true  // Tell ScanScreen to use goBack instead of navigate
    });
  };

  const checkExpiry = async () => {
    console.log("📅 [checkExpiry] Starting expiry check");
    if (!expiryImage) {
      console.log(" [checkExpiry] No expiry image provided");
      Alert.alert("Error", "Please add an expiry-date photo first.");
      return;
    }
    console.log(" [checkExpiry] Sending expiry image to AI");
    setCheckingExpiry(true);
    try {
      const expiryForm = new FormData();
      expiryForm.append("images", { uri: expiryImage, name: "expiry.jpg", type: "image/jpeg" });
      const expiryRes = await fetch(`${API.API_URL}/ai/check-expiry`, {
        method: "POST",
        body: expiryForm,
      });
      console.log(" [checkExpiry] Response status:", expiryRes.status);
      if (!expiryRes.ok) throw new Error("Failed to check expiry date");
      const expiryData = await expiryRes.json();
      console.log(" [checkExpiry] Expiry data:", expiryData);
      if (expiryData.expired) {
        Alert.alert("Expired", "This product is expired and cannot be donated.");
        return;
      }
      if (expiryData.need_clear_image) {
        Alert.alert("Unclear", "Expiry date not visible. Please retake the photo.");
        return;
      }
      setStep3Complete(true);
      setExpiryDate(expiryData.expiry_date);
      console.log(" [checkExpiry] Expiry validated:", expiryData.expiry_date);
      Alert.alert("Validated", `Valid until: ${expiryData.expiry_date || "Date unclear"}`);
    } catch (err) {
      console.error("Expiry check error:", err);
      Alert.alert("Error", "Failed to check expiry. Please try again.");
    } finally {
      setCheckingExpiry(false);
    }
  };

  const pickProductImage = async (fromCamera = false) => {
    console.log(" [pickProductImage] Picking product image from", fromCamera ? "camera" : "gallery");
    if (step3Complete) {
      Alert.alert("Already validated", "Cannot modify images after validation.");
      return;
    }
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
      const newImages = [...productImages, result.assets[0].uri];
      console.log(" [pickProductImage] Image selected, total images now:", newImages.length);
      setProductImages(newImages);
      resetWorkflow();
      checkAI(newImages);
    }
  };

  const removeProductImage = (uri) => {
    console.log(" [removeProductImage] Removing image");
    if (step3Complete) {
      Alert.alert("Already validated", "Cannot modify images after validation.");
      return;
    }
    const newImages = productImages.filter((i) => i !== uri);
    setProductImages(newImages);
    resetWorkflow();
    if (newImages.length > 0) checkAI(newImages);
  };

  const pickExpiryImage = async (fromCamera = false) => {
    console.log(" [pickExpiryImage] Picking expiry image from", fromCamera ? "camera" : "gallery");
    if (!step2Complete) {
      Alert.alert("Scan barcode first", "Please scan the barcode before adding expiry photo.");
      return;
    }
    if (step3Complete) {
      Alert.alert("Already validated", "Cannot modify images after validation.");
      return;
    }
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
      console.log(" [pickExpiryImage] Expiry image selected");
      setExpiryImage(result.assets[0].uri);
      setStep3Complete(false);
      setExpiryDate(null);
    }
  };

  const removeExpiryImage = () => {
    if (step3Complete) {
      Alert.alert("Already validated", "Cannot modify images after validation.");
      return;
    }
    setExpiryImage(null);
    setStep3Complete(false);
    setExpiryDate(null);
  };

  const handleNext = async () => {
    console.log(" [handleNext] Submitting donation...");
    console.log("  - Address:", address);
    console.log("  - Product images:", productImages.length);
    console.log("  - Step 1 (AI):", step1Complete);
    console.log("  - Step 2 (Barcode):", step2Complete);
    console.log("  - Step 3 (Expiry):", step3Complete);
    if (!address || productImages.length === 0) {
      Alert.alert("Validation", "Please add address and product photos");
      return;
    }
    if (!step3Complete) {
      Alert.alert("Validation", "Please complete all validation steps");
      return;
    }
    setLoading(true);
    try {
      const user = route?.params?.user;
      if (!user?.account_id) throw new Error("Session expired. Please log in again.");

      console.log(" [handleNext] Fetching user data...");
      const usersRes = await fetch(`${API.API_URL}/users`);
      const users = await usersRes.json();
      const realUser = users.find((u) => u.account_id === user.account_id);
      console.log(" [handleNext] User found:", realUser?.account_id);
      if (!realUser) throw new Error("User not found");

      console.log(" [handleNext] Fetching donor data...");
      const donorsRes = await fetch(`${API.API_URL}/donors`);
      const donors = await donorsRes.json();
      const donor = donors.find((d) => d.user_id === realUser.user_id);
      console.log("[handleNext] Donor found:", donor?.user_id);
      if (!donor) throw new Error("Not registered as donor");

      const donor_id = donor.user_id;
      const association_id = route?.params?.association?.association_id || null;

      const donationForm = new FormData();
      donationForm.append("donor_id", donor_id);
      donationForm.append("donation_type", "food");
      donationForm.append("status", "accepted");
      donationForm.append("note", description);
      donationForm.append("address", address);
      if (association_id) donationForm.append("association_id", association_id);
      donationForm.append("item_image", {
        uri: productImages[0],
        name: "main.jpg",
        type: "image/jpeg",
      });

      console.log(" [handleNext] Creating donation...");
      const donationRes = await fetch(`${API.API_URL}/donations`, { method: "POST", body: donationForm });
      const textResp = await donationRes.text();
      console.log(" [handleNext] Donation creation response:", donationRes.status);
      if (!donationRes.ok) throw new Error(textResp || "Donation creation failed");

      const donation = JSON.parse(textResp);
      const donation_id = donation.donation_id;

      const foodForm = new FormData();
      foodForm.append("donation_id", donation_id);
      foodForm.append("category", category || "��� ����");
      foodForm.append("expiry_date", expiryDate || "");

      console.log(" [handleNext] Creating food donation record...");
      console.log("  - donation_id:", donation_id);
      console.log("  - category:", category || "غير محدد");
      console.log("  - expiry_date:", expiryDate || "");

      const foodRes = await fetch(`${API.API_URL}/food_donations`, { method: "POST", body: foodForm });
      console.log("[handleNext] Food donation response status:", foodRes.status);
      
      if (!foodRes.ok) {
        const foodError = await foodRes.text();
        console.log(" [handleNext] Food donation error response:", foodError);
        throw new Error(foodError || "Failed to create food donation record");
      }
      
      console.log(" [handleNext] Food donation record created");

      // Clean up after successful submission
      await AsyncStorage.removeItem("scanned_product");
      console.log(" [handleNext] Cleaned up AsyncStorage");
      
      clearForm();
      console.log(" [handleNext] Cleared all form state");

      console.log(" [handleNext] Donation submitted successfully!");
      Alert.alert("Success", "Your donation has been submitted!");
      navigation.navigate("DeliveryMethodScreen", {
        ...route.params,
        donationType: "food",
        items: [
          {
            category,
            description,
            address,
            images: productImages,
            expiry_date: expiryDate,
          },
        ],
        donation_id,
        donor_id,
        association_id,
        address,
      });
    } catch (err) {
      console.error(" [handleNext] Submit error:", err);
      Alert.alert("Error", err.message || "Failed to submit donation");
    } finally {
      setLoading(false);
    }
  };

  return (
    isFocused ? (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: text }]}>Donate Food</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <Ionicons name={step1Complete ? "checkmark-circle" : "camera"} size={24} color={step1Complete ? "#4CAF50" : "#999"} />
            <Text style={[styles.progressText, { color: step1Complete ? "#4CAF50" : "#999" }]}>AI Check</Text>
          </View>
          <View style={[styles.progressLine, { backgroundColor: step1Complete ? "#4CAF50" : "#ddd" }]} />
          <View style={styles.progressStep}>
            <Ionicons name={step2Complete ? "checkmark-circle" : "barcode"} size={24} color={step2Complete ? "#4CAF50" : "#999"} />
            <Text style={[styles.progressText, { color: step2Complete ? "#4CAF50" : "#999" }]}>Barcode</Text>
          </View>
          <View style={[styles.progressLine, { backgroundColor: step2Complete ? "#4CAF50" : "#ddd" }]} />
          <View style={styles.progressStep}>
            <Ionicons name={step3Complete ? "checkmark-circle" : "calendar"} size={24} color={step3Complete ? "#4CAF50" : "#999"} />
            <Text style={[styles.progressText, { color: step3Complete ? "#4CAF50" : "#999" }]}>Expiry</Text>
          </View>
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
          placeholder="Category (auto-filled)"
          placeholderTextColor="#999"
          value={category}
          editable={false}
        />

        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor: border, color: text }]}
          placeholder="Description (auto-filled)"
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
            <Text style={{ color: text }}>{address || "Use current location"}</Text>
          </TouchableOpacity>
            <TouchableOpacity onPress={requestAndFetchLocation} style={{ justifyContent: "center" }}>           
               <Ionicons name="location" size={30} color={nextBtnBg} />
            </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: text, marginTop: 18 }]}>Product Photos (for AI check)</Text>
        <Text style={styles.hint}>Show the full package (not expiry yet).</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {productImages.map((uri) => (
            <View key={uri} style={{ position: "relative" }}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity onPress={() => removeProductImage(uri)} style={styles.removeBtn} disabled={step3Complete}>
                <Ionicons name="close-circle" size={20} color="#A27571" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.imagePickerBox, { borderColor: border }]}
            onPress={() =>
              Alert.alert("Add Product Photo", "Choose", [
                { text: "Camera", onPress: () => pickProductImage(true) },
                { text: "Gallery", onPress: () => pickProductImage(false) },
                { text: "Cancel", style: "cancel" },
              ])
            }
            disabled={checkingAI || step3Complete}
          >
            {checkingAI ? <ActivityIndicator color="#A27571" /> : <Text style={styles.plus}>+</Text>}
          </TouchableOpacity>
        </View>

        {step1Complete && !step2Complete && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#FF9800" }]} onPress={scanBarcode}>
            <Ionicons name="barcode" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Scan Barcode</Text>
          </TouchableOpacity>
        )}

        {step2Complete && (
          <>
            <Text style={[styles.label, { color: text, marginTop: 18 }]}>Expiry Photo</Text>
            <Text style={styles.hint}>Take a clear photo of the expiry date only.</Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {expiryImage && (
                <View style={{ position: "relative" }}>
                  <Image source={{ uri: expiryImage }} style={styles.image} />
                  <TouchableOpacity onPress={removeExpiryImage} style={styles.removeBtn} disabled={step3Complete}>
                    <Ionicons name="close-circle" size={20} color="#A27571" />
                  </TouchableOpacity>
                </View>
              )}

              {!step3Complete && (
                <TouchableOpacity
                  style={[styles.imagePickerBox, { borderColor: border }]}
                  onPress={() =>
                    Alert.alert("Add Expiry Photo", "Choose", [
                      { text: "Camera", onPress: () => pickExpiryImage(true) },
                      { text: "Gallery", onPress: () => pickExpiryImage(false) },
                      { text: "Cancel", style: "cancel" },
                    ])
                  }
                  disabled={checkingExpiry}
                >
                  {checkingExpiry ? <ActivityIndicator color="#A27571" /> : <Text style={styles.plus}>+</Text>}
                </TouchableOpacity>
              )}
            </View>

            {expiryImage && !step3Complete && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#2196F3" }]}
                onPress={checkExpiry}
                disabled={checkingExpiry}
              >
                {checkingExpiry ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="calendar" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Check Expiry Date</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        {step2Complete && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>Barcode scanned: {description || "Product"}</Text>
          </View>
        )}

        {step3Complete && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Fully validated! Valid until: {expiryDate || "Date unclear"}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: step3Complete ? nextBtnBg : "#ccc" }]}
          onPress={handleNext}
          disabled={loading || !step3Complete}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Donation</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    ) : (
      <View style={{ flex: 1 }} />
    )
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  progressStep: {
    alignItems: "center",
  },
  progressLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "600",
  },

  label: { fontSize: 16, fontWeight: "600", marginTop: 16 },
  hint: { fontSize: 13, color: "#999", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginTop: 12,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },

  image: { width: 80, height: 80, borderRadius: 10 },
  removeBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  imagePickerBox: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderRadius: 10,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  plus: { fontSize: 32, color: "#A27571", fontWeight: "300" },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  successBox: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  successText: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  submitBtn: {
    paddingVertical: 16,
    borderRadius: 10,
    marginTop: 24,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
