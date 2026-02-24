import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from "../config";


import logo from "../assets/images/logo3.png";

export default function UnderReviewDeliveryScreen({ navigation, route }) {
  const {
    association,
    donationType = "clothes",
    items = [],
    category,
    description,
    address,
    images,
  } = route.params || {};

  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("dark_mode").then(v => {
      if (v !== null) setDarkMode(v === "true");
    });
  }, []);

  const submitDonation = async () => {
    setLoading(true);

    try {
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
        finalItems[0];

      const donationForm = new FormData();
      donationForm.append("donor_id", donorId);
      donationForm.append("donation_type", donationType);
      donationForm.append("status", "pending");
      donationForm.append("delivery_method", "association");
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
        "Request Sent 🤍",
        "Your donation request was sent successfully.\n\n" +
          "The association will review it first.\n" +
          "You will be notified once it is accepted.",
        [{ text: "OK", onPress: () => navigation.popToTop() }]
      );
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#2f2f2f";
  const primary = "#A27571";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>

      {/* ✅ LOGO */}
      <Image
        source={logo}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={[styles.title, { color: text }]}>
        Request Under Review
      </Text>

      <Text style={[styles.message, { color: text }]}>
        Your donation request has been submitted successfully.
        {"\n\n"}
        The association will review your request.
        {"\n"}
        You will be notified once it is accepted.
      </Text>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  logo: {
    width: 160,
    height: 160,
    alignSelf: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
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
