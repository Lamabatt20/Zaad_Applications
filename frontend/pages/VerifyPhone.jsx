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
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  /* ======================
     LOAD DARK MODE
  ====================== */
  useEffect(() => {
    const loadTheme = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadTheme();
  }, []);

  /* ======================
     COOLDOWN TIMER
  ====================== */
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  /* ======================
     THEME COLORS
  ====================== */
  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const textColor = darkMode ? "#fff" : "#2f2f2f";
  const inputBg = darkMode ? "#2a2a2a" : "#fff";
  const buttonBg = darkMode ? "#ed985f" : "#A27571";
  const resendColor = cooldown > 0 ? "#999" : "#17477b";

  /* ======================
     VERIFY CODE
  ====================== */
  const verify = async () => {
    if (!code) {
      Alert.alert("Error", "Enter verification code");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(
        `${config.API_URL}/accounts/verify-email`,
        { email, code }
      );

      if (!res.data.success) {
        Alert.alert("Error", res.data.message || "Invalid code");
        return;
      }

      Alert.alert("Success", "Email verified successfully");

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

  /* ======================
     RESEND CODE
  ====================== */
  const resendCode = async () => {
    try {
      setResending(true);

      const res = await axios.post(
        `${config.API_URL}/accounts/resend-email-code`,
        { email }
      );

      if (!res.data.success) {
        Alert.alert("Error", res.data.message || "Failed to resend code");
        return;
      }

      Alert.alert("Success", "Verification code sent again");
      setCooldown(60); // 60 seconds lock

    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  /* ======================
     UI
  ====================== */
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

        {/* ===== RESEND CODE ===== */}
        <TouchableOpacity
          onPress={resendCode}
          disabled={resending || cooldown > 0}
          style={{ marginTop: 18 }}
        >
          <Text style={{ color: resendColor, textAlign: "center", fontSize: 14 }}>
            {cooldown > 0
              ? `Resend code in ${cooldown}s`
              : resending
              ? "Sending..."
              : "Resend verification code"}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

/* ======================
   STYLES
====================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 70,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
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
