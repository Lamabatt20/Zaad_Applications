import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../config";

export default function AssociationInfo({ route, navigation }) {
  const { association, donationType } = route.params;

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem("dark_mode");
        if (saved !== null) setDarkMode(saved === "true");
      } catch (e) {}
    };
    loadTheme();
    const unsubscribe = navigation?.addListener?.("focus", loadTheme);
    return unsubscribe;
  }, [navigation]);

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const textColor = darkMode ? "#fff" : "#333";
  const cardBg = darkMode ? "#2a2a2a" : "#fff";
  const cardTitleColor = darkMode ? "#fff" : "#000";
  const cardDescriptionColor = darkMode ? "#aaa" : "#666";
  const btnYesBg = "#A27571";
  const btnNoBg = "#C6AAA3";
  const btnTextColor = "#fff";
  const borderColor = darkMode ? "#444" : "#eee";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>

      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.headerLogo}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 220 } // ←⬅⬅⬅ حل المشكلة هنا
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroRow}>
          <Image
            source={{ uri: `${API.API_URL}${association.association_logo}` }}
            style={styles.heroLogoLeft}
          />
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitleTop}>{association.name}</Text>
            <Text style={[styles.heroSubtitle, { color: textColor }]}>
              {donationType?.charAt(0).toUpperCase() +
                donationType?.slice(1) || "Donation"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.descriptionSection,
            {
              backgroundColor: cardBg,
              borderColor: borderColor,
            },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: cardDescriptionColor }]}>
            About
          </Text>
          <Text style={[styles.descriptionText, { color: cardTitleColor }]}>
            {association.description || "No description available."}
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <Ionicons name="help-circle" size={24} color={btnYesBg} />
          <Text style={[styles.questionText, { color: textColor }]}>
            Would you like to donate to this association?
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.btnYes, { backgroundColor: btnYesBg }]}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate(
                donationType === "food"
                  ? "DonateFoodScreen"
                  : "DonateClothesScreen",
                { association }
              )
            }
          >
            <Ionicons
              name="checkmark"
              size={20}
              color={btnTextColor}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.btnText, { color: btnTextColor }]}>
              Yes, Donate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnNo, { backgroundColor: btnNoBg }]}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="close"
              size={20}
              color={btnTextColor}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.btnText, { color: btnTextColor }]}>
              No, Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.fixedFooter}>
        <Image
          source={require("../assets/images/Z A A D.png")}
          style={styles.fixedFooterLogo}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 0,
    justifyContent: "flex-start",
  },

  headerLogo: {
    width: 160,
    height: 90,
    marginRight: 20,
    marginLeft: -25,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  heroRow: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  heroLogoLeft: {
    width: 140,
    height: 140,
    borderRadius: 12,
    resizeMode: "contain",
    marginRight: 16,
  },

  heroTextContainer: {
    flex: 1,
    justifyContent: "center",
  },

  heroTitleTop: {
    fontSize: 20,
    fontWeight: "800",
    color: "#8b6f69",
    textAlign: "center",
  },

  heroSubtitle: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
  },

  descriptionSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },

  questionContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: "rgba(162, 117, 113, 0.08)",
  },

  questionText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
    flex: 1,
  },

  buttonContainer: {
    gap: 12,
    marginBottom: 30,
  },

  btnYes: {
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  btnNo: {
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  btnText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  fixedFooter: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    alignItems: "center",
  },

  fixedFooterLogo: {
    width: 80,
    height: 80,
  },
});
