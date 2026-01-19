import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import axios from "axios";
import config from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function VerifyPhone({ route, navigation }) {
  const { email, role } = route.params;
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
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
  const inputBg = darkMode ? "#2a2a2a" : "#fff";
  const buttonBg = darkMode ? "#ed985f" : "#A27571";

  const verify = async () => {
    if (!code) return Alert.alert("Error", "Enter verification code");

    try {
      setLoading(true);

      const res = await axios.post(
        `${config.API_URL}/accounts/verify-email`,
        {
          email,
          code,
        }
      );

      if (!res.data.success) {
        Alert.alert("Error", res.data.message || "Invalid code");
        return;
      }

      if (role === "donor") {
        navigation.replace("Login");
      } else {
        navigation.replace("WaitingApproval");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Image
        source={require("../assets/images/logo3.png")}
        style={styles.logo}
      />

      <View style={[styles.card, { backgroundColor: inputBg }]}>
        <Text style={[styles.title, { color: textColor }]}>
          Verify Email
        </Text>

        <Text style={[styles.subtitle, { color: textColor }]}>
          Enter the verification code sent to your email
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              color: textColor,
              backgroundColor: inputBg,
              borderColor: darkMode ? "#555" : "#ccc",
            },
          ]}
          placeholder="Verification code"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={code}
          onChangeText={setCode}
        />

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: buttonBg }]}
          onPress={verify}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? "Verifying..." : "Verify"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 70, // يرفع اللوجو والمحتوى بدون لصق
  },
  logo: {
    width: 130,
    height: 130,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 25,
  },
  card: {
    borderRadius: 18,
    padding: 25,

    // Shadow iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,

    // Shadow Android
    elevation: 5,
  },
  title: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 6,
    fontFamily: "Times New Roman",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 22,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 22,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
