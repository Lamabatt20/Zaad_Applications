import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import config from "../config";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EditProfileScreen({ route, navigation }) {
  const { user_id, username, email, full_name, phone, role, address } =
    route?.params || {};

  const isAssociation = role === "association";

  const [editUsername, setEditUsername] = useState(username || "");
  const [editFullName, setEditFullName] = useState(full_name || "");
  const [editPhone, setEditPhone] = useState(phone || "");
  const [editAddress, setEditAddress] = useState(address || "");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadDarkMode();
  }, []);

  const loadDarkMode = async () => {
    const saved = await AsyncStorage.getItem("dark_mode");
    if (saved !== null) setDarkMode(saved === "true");
  };

  const theme = {
    background: darkMode ? "#1c1c1c" : "#EBE1D7",
    text: darkMode ? "#fff" : "#000",
    label: darkMode ? "#d1d1d1" : "#8b6f69",
    border: darkMode ? "#666" : "#000",
  };

  const updateAccount = async () => {
    try {
      await axios.put(`${config.API_URL}/accounts/user/${user_id}`, {
        username: editUsername,
        full_name: editFullName,
        phone: editPhone,
        address: editAddress,
        email,
        role,
      });

      alert("Profile updated successfully!");

      navigation.navigate({
        name: "ProfileScreen",
        params: {
          username: editUsername,
          full_name: editFullName,
          phone: editPhone,
          address: editAddress,
          email,
          role,
        },
        merge: true,
      });
    } catch (error) {
      if (error.response) {
        alert(error.response.data.message || "Update failed");
      } else {
        alert("Error updating account");
      }
    }
  };

  return (
    <LinearGradient
      colors={
        darkMode
          ? ["#2b2b2b", "#3a3a3a", "#1f1f1f"]
          : ["#A27571", "#FFDAB4", "rgba(162,117,113,0)"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBackground}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Image
          source={require("../assets/images/back.png")}
          style={{ width: 28, height: 28, tintColor: theme.text }}
        />
      </TouchableOpacity>

      {!isAssociation && (
        <TouchableOpacity
          style={styles.chatbotBtn}
          onPress={() =>
            navigation.navigate("ChatBotScreen", {
              user_id,
              username: editUsername,
              email,
              full_name: editFullName,
              phone: editPhone,
              role,
              address: editAddress,
            })
          }
        >
          <Image
            source={require("../assets/images/zaadbot.png")}
            style={{ width: 40, height: 40 }}
          />
        </TouchableOpacity>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: theme.background }]}>
          <View style={styles.profileImageContainer}>
            <Image
              source={require("../assets/images/profiles.png")}
              style={[
                { width: 125, height: 110 },
                { tintColor: theme.text },
              ]}
            />
          </View>

          <View style={styles.fieldBox}>
            <Text style={[styles.label, { color: theme.label }]}>Username</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text },
              ]}
              value={editUsername}
              onChangeText={setEditUsername}
            />
          </View>

          <View style={styles.fieldBox}>
            <Text style={[styles.label, { color: theme.label }]}>Fullname</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text },
              ]}
              value={editFullName}
              onChangeText={setEditFullName}
            />
          </View>

          <View style={styles.fieldBox}>
            <Text style={[styles.label, { color: theme.label }]}>Address</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text },
              ]}
              value={editAddress}
              onChangeText={setEditAddress}
            />
          </View>

          <View style={styles.fieldBox}>
            <Text style={[styles.label, { color: theme.label }]}>Phone</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text },
              ]}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="number-pad"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={updateAccount}>
            <Ionicons
              name="checkmark-done"
              size={17}
              color="#fff"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.passwordBtn}
            onPress={() =>
              navigation.navigate("ChangePassword", {
                user_id,
                username: editUsername,
                email,
                full_name: editFullName,
                phone: editPhone,
                address: editAddress,
                role,
              })
            }
          >
            <Text style={styles.passwordBtnText}>Change Password</Text>
            <Ionicons
              name="lock-closed"
              size={17}
              color="#fff"
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: { flex: 1 },

  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 20,
  },

  chatbotBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 20,
  },

  profileCard: {
    marginTop: 170,
    padding: 25,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingBottom: 60,
    minHeight: "100%",
  },

  profileImageContainer: {
    alignItems: "center",
    marginTop: -90,
  },

  fieldBox: {
    marginTop: 15,
  },

  label: {
    fontSize: 13,
    marginBottom: 5,
  },

  input: {
    borderWidth: 2,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 15,
  },

  saveBtn: {
    backgroundColor: "#A27571",
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 175,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  passwordBtn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  passwordBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
