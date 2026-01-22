import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 2;

export default function AdminDashboard({ navigation }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadTheme();

    const unsubscribe = navigation.addListener("focus", loadTheme);
    return unsubscribe;
  }, [navigation]);

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const textColor = darkMode ? "#fff" : "#2f2f2f";
  const cardText = darkMode ? "#fff" : "#333";

  // ===== LOGOUT =====
  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* HEADER */}
        <View style={styles.welcomeRow}>
          <Image
            source={require("../assets/images/image.png")}
            style={styles.welcomeLogo}
            resizeMode="contain"
          />

          <View style={styles.welcomeTextContainer}>
            <Text style={[styles.welcome, { color: textColor }]}>
              Admin Dashboard
            </Text>
          </View>

          {/* 🔴 LOGOUT ICON بدل الدرع */}
          <TouchableOpacity onPress={handleLogout}>
            <Image
              source={require("../assets/images/logout.png")}
              style={[
                styles.logoutIcon,
                { tintColor: darkMode ? "#fff" : "#A27571" },
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* TITLE */}
        <Text style={[styles.bodyTitle, { color: textColor }]}>
          Administration Panel
        </Text>

        {/* CARDS */}
        <View style={styles.cardsRow}>

          {/* Pending Associations */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("PendingAssociations")}
          >
            <Ionicons name="time-outline" size={40} color="#A27571" />
            <Text style={[styles.cardLabel, { color: cardText }]}>
              Pending Associations
            </Text>
          </TouchableOpacity>

          {/* Donations Report */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("DonationsReport")}
          >
            <Ionicons name="bar-chart-outline" size={40} color="#A27571" />
            <Text style={[styles.cardLabel, { color: cardText }]}>
              Donations Report
            </Text>
          </TouchableOpacity>

          {/* Users Report */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("AddDeliveryPerson")}
          >
            <Ionicons name="people-outline" size={40} color="#A27571" />
            <Text style={[styles.cardLabel, { color: cardText }]}>
              Add delivery person
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* FOOTER LOGO */}
      <View style={styles.footerContainer}>
        <Image
          source={require("../assets/images/Z A A D.png")}
          style={styles.footerLogo}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },

  /* HEADER */
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  welcomeLogo: {
    width: 150,
    height: 150,
    marginLeft: -35,
    marginTop: -50,
  },
  welcomeTextContainer: {
    flex: 1,
    marginLeft: -40,
  },
  welcome: {
    fontFamily: "Times New Roman",
    fontSize: 24,
    marginTop: -40,
  },
  logoutIcon: {
    width: 34,
    height: 34,
    resizeMode: "contain",
  },

  /* BODY */
  bodyTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
    marginTop: -10,
  },

  /* CARDS */
  cardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    alignItems: "center",
    paddingVertical: 25,
    borderRadius: 14,
    backgroundColor: "transparent",
    marginBottom: 16,
  },
  cardLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  /* FOOTER */
  footerContainer: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    alignItems: "center",
  },
  footerLogo: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
});
