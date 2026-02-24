import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen({ route, navigation }) {
  const { user_id, username, email, full_name, phone, role, address } =
    route?.params || {};

  // ✅ role check
  const isAssociation = role === "association";

  const [darkMode, setDarkMode] = useState(false);
  const [editUsername, setUsername] = useState(username || "");
  const [editFullName, setFullName] = useState(full_name || "");
  const [editPhone, setPhone] = useState(phone || "");
  const [editAddress, setAddress] = useState(address || "");

  useEffect(() => {
    loadDarkMode();
  }, []);

  const loadDarkMode = async () => {
    try {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    } catch (e) {}
  };

  const toggleDarkMode = async () => {
    try {
      const newValue = !darkMode;
      setDarkMode(newValue);
      await AsyncStorage.setItem("dark_mode", newValue.toString());
    } catch (e) {}
  };

  useEffect(() => {
    if (route.params) {
      if (route.params.username) setUsername(route.params.username);
      if (route.params.full_name) setFullName(route.params.full_name);
      if (route.params.phone) setPhone(route.params.phone);
      if (route.params.address) setAddress(route.params.address);
    }
  }, [route.params]);

  const handleLogout = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  const theme = {
    background: darkMode ? "#1c1c1c" : "#EBE1D7",
    text: darkMode ? "#fff" : "#000",
    subText: darkMode ? "#d1d1d1" : "#555",
    border: darkMode ? "#444" : "#ccc",
    iconColor: darkMode ? "#fff" : "#000",
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require("../assets/images/back.png")}
            style={[styles.headerIcon, { tintColor: theme.iconColor }]}
          />
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>
          My Profile
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {!isAssociation && (
            <TouchableOpacity onPress={() => navigation.navigate("NotificationsScreen")}>
              <Ionicons
                name="notifications-outline"
                size={26}
                color={theme.iconColor}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleLogout}>
            <Image
              source={require("../assets/images/logout.png")}
              style={[styles.headerIcon, { tintColor: theme.iconColor }]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== PROFILE INFO ===== */}
      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.profileBtn}>
          <Ionicons
            name="person-circle-outline"
            size={60}
            color={theme.iconColor}
          />
        </TouchableOpacity>

        <View>
          <Text style={[styles.name, { color: theme.text }]}>
            {editUsername || "User Name"}
          </Text>

          <Text style={[styles.email, { color: theme.subText }]}>
            {email || "email@example.com"}
          </Text>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              navigation.navigate("EditProfileScreen", {
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
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== REWARDS & CERTIFICATES ===== */}
      {!isAssociation && (
        <TouchableOpacity 
          style={styles.row}
          onPress={() => navigation.navigate("RewardScreen", { user_id })}
        >
          <Image
            source={require("../assets/images/heart.png")}
            style={[styles.icon, { tintColor: theme.iconColor }]}
          />
          <Text style={[styles.rowText, { color: theme.text }]}>
            Rewards & Certificates
          </Text>
          <Image
            source={require("../assets/images/arrow.png")}
            style={[styles.arrowIcon, { tintColor: theme.iconColor }]}
          />
        </TouchableOpacity>
      )}

      {/* ===== DONATION HISTORY (✅ ADDED NAVIGATION) ===== */}
      {!isAssociation && (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("DonationHistoryScreen")}
        >
          <Image
            source={require("../assets/images/history.png")}
            style={[styles.icon, { tintColor: theme.iconColor }]}
          />
          <Text style={[styles.rowText, { color: theme.text }]}>
            View History
          </Text>
          <Image
            source={require("../assets/images/arrow.png")}
            style={[styles.arrowIcon, { tintColor: theme.iconColor }]}
          />
        </TouchableOpacity>
      )}

      <View style={[styles.separator, { backgroundColor: theme.border }]} />

      {/* ===== EDIT PROFILE ===== */}
      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          navigation.navigate("EditProfileScreen", {
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
          source={require("../assets/images/pen.png")}
          style={[styles.icon, { tintColor: theme.iconColor }]}
        />
        <Text style={[styles.rowText, { color: theme.text }]}>
          Edit Profile
        </Text>
        <Image
          source={require("../assets/images/arrow.png")}
          style={[styles.arrowIcon, { tintColor: theme.iconColor }]}
        />
      </TouchableOpacity>

      <View style={[styles.separator, { backgroundColor: theme.border }]} />

      {/* ===== DARK MODE ===== */}
      <View style={styles.row}>
        <Image
          source={require("../assets/images/moon.png")}
          style={[styles.icon, { tintColor: theme.iconColor }]}
        />
        <Text style={[styles.rowText, { color: theme.text }]}>
          Dark Mode
        </Text>
        <Switch value={darkMode} onValueChange={toggleDarkMode} />
      </View>

      {/* ===== CHATBOT ===== */}
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
            style={{ width: 50, height: 50, resizeMode: "contain" }}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
    marginTop: 30,
  },

  headerIcon: { width: 26, height: 26 },

  title: { fontSize: 22, fontWeight: "700" },

  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },

  name: { fontSize: 18, fontWeight: "bold" },

  email: { marginBottom: 5 },

  editButton: {
    backgroundColor: "#aed4ff",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
  },

  editButtonText: { fontSize: 12, color: "#000" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },

  rowText: { fontSize: 16, marginLeft: 10, flex: 1 },

  icon: { width: 22, height: 22 },

  arrowIcon: { width: 18, height: 18 },

  separator: { height: 1, marginVertical: 10 },

  chatbotBtn: { position: "absolute", bottom: 100, right: 20 },
});
