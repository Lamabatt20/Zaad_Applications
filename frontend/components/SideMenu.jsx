import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import config from "../config";

export default function SideMenu({
  visible,
  onClose,
  navigation,
  user = {},
  sourceScreen = "ChatBot",
  darkMode = false,
}) {
  const bgColor = darkMode ? "#1c1c1c" : "#EBE1D7";
  const textColor = darkMode ? "#fff" : "#2f2f2f";

  const { user_id, username, email, full_name, phone, role, address } = user;

  const [unreadCount, setUnreadCount] = useState(0);

  // 🔔 load unread notifications count
  useEffect(() => {
    let mounted = true;

    const loadUnreadCount = async () => {
      try {
        if (!user_id) return;

        const res = await axios.get(
          `${config.API_URL}/notifications/unread-count/${user_id}`
        );

        if (mounted) {
          setUnreadCount(Number(res.data?.count || 0));
        }
      } catch (e) {
        console.log("❌ unread count error:", e?.message);
      }
    };

    if (visible) {
      loadUnreadCount();
    }

    return () => {
      mounted = false;
    };
  }, [visible, user_id]);

  const handleLogout = async () => {
    await AsyncStorage.clear();
    onClose();
    navigation.navigate("Login");
  };

  return (
    <>
      {visible && (
        <>
          {/* Overlay */}
          <TouchableOpacity style={styles.overlay} onPress={onClose} />

          {/* Sidebar */}
          <Animated.View
            style={[styles.sidebarLeft, { backgroundColor: bgColor }]}
          >
            {/* ===== PROFILE ===== */}
            <View style={styles.profileBox}>
              <Image
                source={require("../assets/profile.png")}
                style={[styles.profileImg, { tintColor: textColor }]}
              />
              <Text style={[styles.profileName, { color: textColor }]}>
                {username || "User"}
              </Text>
              <Text style={[styles.profileEmail, { color: textColor }]}>
                {email || ""}
              </Text>
            </View>

            {/* ===== DASHBOARD ===== */}
            <TouchableOpacity
              style={styles.sideBtn}
              onPress={() => {
                onClose();
                navigation.navigate("ChooseDonationType", {
                  user_id,
                  username,
                  email,
                  full_name,
                  phone,
                  role,
                  address,
                });
              }}
            >
              <Text style={[styles.sideBtnText, { color: textColor }]}>
                Dashboard
              </Text>
            </TouchableOpacity>

            {/* ===== SETTINGS ===== */}
            <TouchableOpacity
              style={styles.sideBtn}
              onPress={() => {
                onClose();
                navigation.navigate("ProfileScreen", {
                  user_id,
                  username,
                  email,
                  full_name,
                  phone,
                  role,
                  address,
                });
              }}
            >
              <Text style={[styles.sideBtnText, { color: textColor }]}>
                Settings
              </Text>
            </TouchableOpacity>

            {/* ===== NOTIFICATIONS ===== */}
            <TouchableOpacity
              style={styles.sideBtn}
              onPress={() => {
                onClose();
                navigation.navigate("NotificationsScreen");
              }}
            >
              <View style={styles.notificationRow}>
                <Text style={[styles.sideBtnText, { color: textColor }]}>
                  Notifications
                </Text>

                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* ===== SEARCH ===== */}
            <TouchableOpacity
              style={styles.sideBtn}
              onPress={() => {
                onClose();
                navigation.navigate("SearchAssociation", {
                  user_id,
                  username,
                  email,
                  full_name,
                  phone,
                  role,
                  address,
                  sourceScreen,
                });
              }}
            >
              <Text style={[styles.sideBtnText, { color: textColor }]}>
                Search
              </Text>
            </TouchableOpacity>

            {/* ===== LOGOUT ===== */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </>
  );
}

/* ===== STYLES ===== */
const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 9,
  },

  sidebarLeft: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 280,
    paddingTop: 40,
    zIndex: 10,
    elevation: 10,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },

  profileBox: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
  },
  profileEmail: {
    fontSize: 13,
  },

  sideBtn: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  sideBtnText: {
    fontSize: 16,
  },

  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  badge: {
    backgroundColor: "red",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },

  logoutBtn: {
    marginTop: 30,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  logoutText: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
  },
});