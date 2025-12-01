import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../config";

export default function AssociationInfo({ route, navigation }) {
  const { association } = route.params;

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem("dark_mode");
        if (saved !== null) setDarkMode(saved === "true");
      } catch (e) {
      }
    };
    loadTheme();
    const unsubscribe = navigation?.addListener?.("focus", loadTheme);
    return unsubscribe;
  }, [navigation]);

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const headerTitleColor = darkMode ? "#fff" : "#8b6f69";
  const cardBg = darkMode ? "#2a2a2a" : "#fff";
  const cardTitleColor = darkMode ? "#fff" : "#000";
  const cardDescriptionColor = darkMode ? "#ccc" : "#444";
  const questionColor = darkMode ? "#fff" : "#333";
  const btnYesBg = "#A27571";
  const btnNoBg = "#C6AAA3";
  const btnTextColor = "#fff";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Image
          source={require("../assets/images/logo1.png")}
          style={styles.headerLogo}
        />
        <Text style={[styles.headerTitle, { color: headerTitleColor }]}>
          {association.name}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.row}>
          <Image
            source={{ uri: `${API.API_URL}${association.association_logo}` }}
            style={styles.cardImage}
          />
          <View style={styles.cardTextContainer}>
            <Text style={[styles.cardTitle, { color: cardTitleColor }]}>
              {association.name}
            </Text>
            <Text style={[styles.cardDescription, { color: cardDescriptionColor }]}>
              {association.description || "No description available."}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.question, { color: questionColor }]}>
        Do you want to donate to this association?
      </Text>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.btnYes, { backgroundColor: btnYesBg }]}
          onPress={() => navigation.navigate("DonateClothesScreen")}
        >
          <Text style={[styles.btnText, { color: btnTextColor }]}>Yes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnNo, { backgroundColor: btnNoBg }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.btnText, { color: btnTextColor }]}>No</Text>
        </TouchableOpacity>
      </View>

      <Image
        source={require("../assets/images/Z A A D.png")}
        style={styles.bottomLogo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  headerLogo: {
    width: 160,
    height: 100,
    resizeMode: "contain",
    marginLeft: -130,
    marginRight: 10,
    marginTop: -10,
  },
  headerTitle: {
    fontFamily: "Times New Roman",
    fontSize: 25,
    marginLeft: -40,
  },

  card: {
    width: "90%",
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 30,
    marginTop: 30,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },

  cardTextContainer: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  cardDescription: {
    fontSize: 14,
    marginTop: 5,
  },

  question: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 15,
  },

  buttonsContainer: {
    width: "80%",
    flexDirection: "column",
    gap: 10,
  },

  btnYes: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  btnNo: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    opacity: 0.95,
  },

  btnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  bottomLogo: {
    width: 80,
    height: 80,
    resizeMode: "contain",
    position: "absolute",
    bottom: 10,
  },
});