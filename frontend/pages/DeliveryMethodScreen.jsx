import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

export default function DeliveryMethodScreen({ navigation, route }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadTheme();
  }, []);

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#2f2f2f";
  const cardBg = darkMode ? "#2a2a2a" : "#fff";
  const primary = "#A27571";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Image
        source={require("../assets/images/logo3.png")}
        style={styles.logo}
      />

      <Text style={[styles.title, { color: text }]}>
        Choose Delivery Method
      </Text>

      <Text style={[styles.subtitle, { color: text }]}>
        Please select how you would like your donation to be delivered.
      </Text>

      {/* Self Delivery */}
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg }]}
        onPress={() =>
          navigation.navigate("ThankYouSelfDeliveryScreen", {
            ...route.params,
            delivery_method: "self",
          })
        }
      >
        <Ionicons name="walk-outline" size={36} color={primary} />
        <Text style={[styles.cardText, { color: text }]}>
          I will deliver it myself
        </Text>
      </TouchableOpacity>

      {/* Delivery Service */}
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg }]}
        onPress={() =>
          navigation.navigate("UnderReviewDeliveryScreen", {
            ...route.params,
            delivery_method: "service",
          })
        }
      >
        <Ionicons name="car-outline" size={36} color={primary} />
        <Text style={[styles.cardText, { color: text }]}>
          Request delivery service
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Image
          source={require("../assets/images/Z A A D.png")}
          style={styles.footerLogo}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.8,
    marginBottom: 30,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 14,
    marginBottom: 18,
    elevation: 3,
  },
  cardText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 15,
    width: "100%",
    alignItems: "center",
  },
  footerLogo: {
    width: 70,
    height: 70,
    resizeMode: "contain",
  },
});
