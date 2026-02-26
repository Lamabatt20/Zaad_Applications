import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from "../config";

/* =========================
   🔹 Address Normalizer
========================= */
const normalizeAddress = (address) => {
  if (!address) return "Ramallah, West Bank, Palestine";

  const lower = address.toLowerCase();

  if (lower.includes("ramallah") || lower.includes("رام")) {
    return "Ramallah, West Bank, Palestine";
  }

  if (
    lower.includes("beitunia") ||
    lower.includes("beitunya") ||
    lower.includes("بيتونيا")
  ) {
    return "Beitunia, West Bank, Palestine";
  }

  if (
    lower.includes("khalil") ||
    lower.includes("الخليل") ||
    lower.includes("hebron")
  ) {
    return "Hebron, West Bank, Palestine";
  }

  if (lower.includes("nablus") || lower.includes("نابلس")) {
    return "Nablus, West Bank, Palestine";
  }

  if (lower.includes("jenin") || lower.includes("جنين")) {
    return "Jenin, West Bank, Palestine";
  }

  if (lower.includes("tulkarm") || lower.includes("طولكرم")) {
    return "Tulkarm, West Bank, Palestine";
  }

  if (lower.includes("bethlehem") || lower.includes("بيت لحم")) {
    return "Bethlehem, West Bank, Palestine";
  }

  // fallback
  return "Ramallah, West Bank, Palestine";
};

export default function ThankYouSelfDeliveryScreen({ navigation, route }) {
  const {
    association,
    donationType = "clothes",
    items = [],
    category,
    description,
    address,
    images,
    donation_ids = null,  // Existing donation IDs from multi-donation flow
  } = route.params || {};

  const [darkMode, setDarkMode] = useState(false);
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);

  /* =========================
     🔹 Load Theme
  ========================= */
  useEffect(() => {
    AsyncStorage.getItem("dark_mode").then((v) => {
      if (v !== null) setDarkMode(v === "true");
    });
  }, []);

  /* =========================
     🔹 Fetch Location
  ========================= */
  useEffect(() => {
    fetchAssociationLocation();
  }, []);

  const fetchAssociationLocation = async () => {
    try {
      const query = normalizeAddress(association?.address);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          query
        )}`
      );

      const data = await res.json();

      if (data && data.length > 0) {
        setCoords({
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        });
      }
    } catch (err) {
      console.log("Geocoding failed:", err);
    }
  };

  /* =========================
     🔹 Submit Donation
  ========================= */
  const submitDonation = async () => {
     setLoading(true);
 
     try {
       console.log("🚀 [ThankYouSelfDelivery] ========================================");
       console.log("🚀 [ThankYouSelfDelivery] Starting submission");
       console.log("🚀 [ThankYouSelfDelivery] donation_ids from params:", donation_ids);
       console.log("🚀 [ThankYouSelfDelivery] donation_ids type:", typeof donation_ids);
       console.log("🚀 [ThankYouSelfDelivery] Is array?:", Array.isArray(donation_ids));
       console.log("🚀 [ThankYouSelfDelivery] Length:", donation_ids?.length);
       console.log("🚀 [ThankYouSelfDelivery] ========================================");
       
       // If donations already exist (from MultiDonateClothesStep), just update delivery method
       if (donation_ids && Array.isArray(donation_ids) && donation_ids.length > 0) {
         console.log("✅ [ThankYouSelfDelivery] Using existing donations - NO NEW DONATIONS WILL BE CREATED");
         console.log("✅ [ThankYouSelfDelivery] Existing donation IDs:", donation_ids);
         
         // Update delivery_method for each existing donation
         for (const donationId of donation_ids) {
           console.log(`📦 [ThankYouSelfDelivery] Updating donation ${donationId} with delivery method`);
           
           const updateRes = await fetch(`${config.API_URL}/donations/${donationId}`, {
             method: "PATCH",
             headers: {
               "Content-Type": "application/json",
             },
             body: JSON.stringify({
               delivery_method: "donor"
             }),
           });
           
           if (!updateRes.ok) {
             const error = await updateRes.text();
             console.error(`❌ [ThankYouSelfDelivery] Failed to update donation ${donationId}:`, error);
           } else {
             console.log(`✅ [ThankYouSelfDelivery] Updated donation ${donationId}`);
           }
         }
         
         Alert.alert(
           "Request Sent ",
           "Your donation request has been sent successfully.\n\n" +
             "The association will review your request first.\n" +
             "You will be notified once the donation is accepted,\n" +
             "then you can deliver it to the association.",
           [
             {
               text: "OK",
               onPress: () => {
                 navigation.popToTop();
               },
             },
           ]
         );
         
         setLoading(false);
         return;
       }
       
       // Original flow: Create new donation (for single donation or old flow)
       console.log("📝 [ThankYouSelfDelivery] Creating NEW donation");
       
       const userData = await AsyncStorage.getItem("user_data");
       if (!userData) throw new Error("Session expired");
 
       const user = JSON.parse(userData);
       const accountId = user?.account_id || user?.user_id || user?.id;
 
       const usersRes = await fetch(`${config.API_URL}/users`);
       const users = await usersRes.json();
       const realUser = users.find(u => u.account_id === accountId);
       if (!realUser) throw new Error("User not found");
 
       const donorsRes = await fetch(`${config.API_URL}/donors`);
       const donors = await donorsRes.json();
       const donor = donors.find(d => d.user_id === realUser.user_id);
       if (!donor) throw new Error("Register as donor first");
 
       const donorId = donor.user_id;
 
       
       const finalItems =
         items.length > 0
           ? items
           : [{ category, description, address, images }];
 
       
              const mainItem =
          items.length > 0
            ? items[0]
            : { category, description, address, images };

        const donationForm = new FormData();
        donationForm.append("donor_id", donorId);
        donationForm.append("donation_type", donationType);
        donationForm.append("status", "pending");
        donationForm.append("delivery_method", "donor");
        donationForm.append("association_id", association.association_id);

        
        donationForm.append("note", mainItem.description || null);
        donationForm.append("address", mainItem.address || null);

        if (mainItem.images?.length > 0) {
          donationForm.append("item_image", {
            uri: mainItem.images[0],
            name: "donation.jpg",
            type: "image/jpeg",
          });
        }
 
       const donationRes = await fetch(`${config.API_URL}/donations`, {
         method: "POST",
         body: donationForm,
       });
 
       const donation = await donationRes.json();
       if (!donation?.donation_id) {
         throw new Error("Donation not created");
       }
 
      
       if (donationType === "food") {
         for (const item of finalItems) {
           const foodForm = new FormData();
           const foodCategory = item.category || item.food_type || category;
           const expiryDate =
             item.expiry_date ||
             item.expiryDate ||
             item.expiration_date ||
             item.expirationDate ||
             null;

           foodForm.append("donation_id", donation.donation_id);
           foodForm.append("category", foodCategory || "غير محدد");
           if (expiryDate) foodForm.append("expiry_date", expiryDate);

           const res = await fetch(`${config.API_URL}/food_donations`, {
             method: "POST",
             body: foodForm,
           });

           if (!res.ok) {
             const errText = await res.text();
             throw new Error(errText || "Failed to save item");
           }
         }
       } else {
         for (const item of finalItems) {
           const res = await fetch(`${config.API_URL}/clothes_donations`, {
             method: "POST",
             headers: {
               "Content-Type": "application/json",
             },
             body: JSON.stringify({
               donation_id: donation.donation_id,
               clothes_type: item.category,
             }),
           });

           if (!res.ok) {
             const errText = await res.text();
             throw new Error(errText || "Failed to save item");
           }
         }
       }
    Alert.alert(
      "Request Sent ",
      "Your donation request has been sent successfully.\n\n" +
        "The association will review your request first.\n" +
        "You will be notified once the donation is accepted,\n" +
        "then you can deliver it to the address shown above.",
      [
        {
          text: "OK",
          onPress: () => navigation.popToTop(),
        },
      ]
    );
  } catch (err) {
    Alert.alert("Error", err.message || "Failed to submit donation");
  } finally {
    setLoading(false);
  }
};


  /* =========================
     🎨 Theme Colors
  ========================= */
  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#2f2f2f";
  const primary = "#A27571";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: text }]}>
        Thank you for your donation 
      </Text>

      <Text style={[styles.message, { color: text }]}>
        Your donation request has been sent successfully.
        {"\n\n"}
        The association will review your request first.
        {"\n"}
        You will be notified once the donation is accepted,
        {"\n"}
        then you can deliver it to the following address:
        </Text>


      <Text style={[styles.association, { color: primary }]}>
        {association?.name}
      </Text>

      {/* =========================
          🗺️ Map OR Fallback
      ========================= */}
      {coords ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
        >
          <Marker
            coordinate={coords}
            title={association?.name}
          />
        </MapView>
      ) : (
        <Text style={{ textAlign: "center", color: text, marginBottom: 20 }}>
          Location unavailable
        </Text>
      )}

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: primary }]}
        onPress={submitDonation}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {loading ? "Submitting..." : "Confirm"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* =========================
   🎨 Styles
========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 20,
  },
  message: {
    textAlign: "center",
    marginVertical: 20,
    fontSize: 15,
    lineHeight: 22,
  },
  association: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
  },
  map: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
});
