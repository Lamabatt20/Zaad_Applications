import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function WaitingApproval() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadTheme();
  }, []);

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const textColor = darkMode ? "#fff" : "#2f2f2f";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Image
        source={require("../assets/images/logo3.png")}
        style={styles.logo}
      />

      <View style={styles.card}>
        <Text style={[styles.title, { color: textColor }]}>
          ⏳ قيد المراجعة
        </Text>

        <Text style={[styles.text, { color: textColor }]}>
          تم توثيق رقم هاتفك بنجاح.
        </Text>

        <Text style={[styles.text, { color: textColor }]}>
          حساب الجمعية قيد المراجعة من قبل الإدارة.
        </Text>

        <Text style={[styles.note, { color: textColor }]}>
          سيتم إشعارك عبر البريد الإلكتروني عند الموافقة.
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
  },
  logo: {
    width: 140,
    height: 140,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 30,
  },
  card: {
    padding: 25,
    borderRadius: 14,
    backgroundColor: "transparent",
  },
  title: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 15,
    fontFamily: "Times New Roman",
  },
  text: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 8,
  },
  note: {
    marginTop: 10,
    fontSize: 13,
    textAlign: "center",
    opacity: 0.8,
  },
});
