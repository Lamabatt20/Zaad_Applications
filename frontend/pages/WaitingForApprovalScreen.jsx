import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

export default function WaitingApproval() {
  const [darkMode, setDarkMode] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const loadTheme = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadTheme();
  }, []);

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const textColor = darkMode ? "#fff" : "#2f2f2f";
  const linkColor = darkMode ? "#ed985f" : "#A27571";


  return (
    <View style={[styles.container, { backgroundColor: bg }]}>

      {/* 🔙 Back to Login */}
      <TouchableOpacity
        onPress={() => navigation.replace("Login")}
        style={styles.backBtn}
      >
        <Text style={[styles.backText, { color: linkColor }]}>
          ← 
        </Text>
      </TouchableOpacity>

      <Image
        source={require("../assets/images/logo3.png")}
        style={styles.logo}
      />

      <View style={styles.card}>
        <Text style={[styles.title, { color: textColor }]}>
          ⏳ قيد المراجعة
        </Text>

        <Text style={[styles.subtitle, { color: textColor }]}>
          Pending Review
        </Text>

        <Text style={[styles.text, { color: textColor }]}>
          تم توثيق البريد الإلكتروني بنجاح.
        </Text>

        <Text style={[styles.textEn, { color: textColor }]}>
          Your email has been successfully verified.
        </Text>

        <Text style={[styles.text, { color: textColor }]}>
          حساب الجمعية قيد المراجعة من قبل الإدارة.
        </Text>

        <Text style={[styles.textEn, { color: textColor }]}>
          Your association account is currently under admin review.
        </Text>

        <Text style={[styles.note, { color: textColor }]}>
          سيتم إشعارك عبر البريد الإلكتروني عند الموافقة.
        </Text>

        <Text style={[styles.noteEn, { color: textColor }]}>
          You will be notified by email once your account is approved.
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
  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
  },
  backText: {
    fontSize: 14,
    fontWeight: "500",
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
    marginBottom: 4,
    fontFamily: "Times New Roman",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 14,
    opacity: 0.85,
  },
  text: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 4,
  },
  textEn: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
    opacity: 0.85,
  },
  note: {
    marginTop: 10,
    fontSize: 13,
    textAlign: "center",
    opacity: 0.8,
  },
  noteEn: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    opacity: 0.7,
  },
});
