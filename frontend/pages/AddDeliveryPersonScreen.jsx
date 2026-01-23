import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import config from "../config";


export default function AddDeliveryPersonScreen({ navigation }) {
  

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [carType, setCarType] = useState("");

  const [loading, setLoading] = useState(false);
  const API = axios.create({ baseURL: config.API_URL });

  // ===== Submit =====
  const handleSubmit = async () => {
    if (!username || !password || !phone || !carType) {
      Alert.alert("Missing fields", "Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/admin/add-delivery-person", {
        username,
        password,
        full_name: fullName,
        phone,
        email,
        car_type: carType,
      });

      Alert.alert("Success", "Delivery person added (pending approval)");
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert(
        "Error",
        e.response?.data?.error || "Failed to add delivery person"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ===== HEADER (LOGO LEFT + TITLE) ===== */}
        <View style={styles.headerRow}>
          <Image
            source={require("../assets/images/image.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.headerTitle}>Add Delivery Person</Text>
        </View>
        <Text style={styles.label}>Username *</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
        />

        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Phone *</Text>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Car Type *</Text>
        <View style={styles.selectBox}>
          {["Motorcycle", "Car", "Van", "Truck"].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.option,
                carType === type && styles.optionSelected,
              ]}
              onPress={() => setCarType(type)}
            >
              <Text
                style={[
                  styles.optionText,
                  carType === type && styles.optionSelectedText,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ===== SUBMIT ===== */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Add Delivery Person</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EBE1D7",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  /* HEADER */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    marginTop: -10,
  },

  logo: {
     width: 150,
    height: 150,
    marginLeft: -35,
    marginTop: -30,
    marginBottom:-30,
  },

  headerTitle: {
   fontSize: 24,
    color: "#2f2f2f", 
    marginTop:-30,
    marginLeft: -20,
    fontFamily: "Times New Roman",
  },

  /* FORM */
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2f2f2f",
    marginTop: 18,
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#d6cfc8",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    fontSize: 14,
  },

  selectBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  option: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d6cfc8",
    backgroundColor: "transparent",
  },

  optionText: {
    fontSize: 13,
    color: "#2f2f2f",
  },

  optionSelected: {
    backgroundColor: "#A27571",
    borderColor: "#A27571",
  },

  optionSelectedText: {
    color: "#fff",
    fontWeight: "600",
  },

  /* BUTTON */
  button: {
    backgroundColor: "#A27571",
    marginTop: 35,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
