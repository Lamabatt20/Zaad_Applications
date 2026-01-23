import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import config from "../config";

const BROWN = "#A27571";
const BG = "#EBE1D7";

export default function DeliveryOrdersScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const userData = await AsyncStorage.getItem("user_data");
      const user = JSON.parse(userData);

      if (!user?.delivery_person_id) {
        setOrders([]);
        return;
      }

      const res = await axios.get(
        `${config.API_URL}/delivery/my-donations/${user.delivery_person_id}`
      );

      setOrders(res.data?.donations || []);
    } catch (e) {
      console.log("❌ fetchOrders error:", e);
    } finally {
      setLoading(false);
    }
  };

  // ===== LOGOUT =====
  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.headerRow}>
        {/* Logout Icon (Top Right) */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Image
            source={require("../assets/images/logout.png")}
            style={styles.logoutIcon}
          />
        </TouchableOpacity>

        {/* Admin-style Logo + Title */}
        <View style={styles.welcomeRow}>
          <Image
            source={require("../assets/images/image.png")}
            style={styles.welcomeLogo}
          />
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcome}>Delivery Orders</Text>
          </View>
        </View>
      </View>

      {/* ===== LIST ===== */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.donation_id.toString()}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.label}>Donor</Text>
            <Text style={styles.value}>{item.donor_name}</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {item.delivery_status}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() =>
                navigation.navigate("DeliveryTrackScreen", {
                  donation: item,
                })
              }
            >
              <Text style={styles.trackText}>Track Order</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No delivery orders available
          </Text>
        }
      />

      {/* ===== FOOTER LOGO ===== */}
      <View style={styles.footer}>
        <Image
          source={require("../assets/images/Z A A D.png")}
          style={styles.footerLogo}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BG,
  },

  /* ===== HEADER ===== */
  headerRow: {
    position: "relative",
  },

  logoutBtn: {
    position: "absolute",
    right: 10,
    top: 10,
    zIndex: 10,
  },
  logoutIcon: {
    width: 34,
    height: 34,
    resizeMode: "contain",
    tintColor: BROWN,
  },

  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
  },
  welcomeLogo: {
    width: 150,
    height: 150,
    marginLeft: -20,
    marginTop: -60,
    resizeMode: "contain",
  },
  welcomeTextContainer: {
    flex: 1,
    marginLeft: -30,
  },
  welcome: {
    fontFamily: "Times New Roman",
    fontSize: 24,
    marginTop: -50,
    color: BROWN,
  },

  /* ===== CARD ===== */
  card: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  label: {
    color: "#777",
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  /* ===== STATUS ===== */
  statusBadge: {
    backgroundColor: BG,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BROWN,
  },
  statusText: {
    color: BROWN,
    fontWeight: "800",
    fontSize: 12,
  },

  /* ===== BUTTON ===== */
  trackBtn: {
    marginTop: 10,
    backgroundColor: BROWN,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 30,
    alignSelf: "center",
  },
  trackText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  empty: {
    textAlign: "center",
    marginTop: 60,
    color: "#777",
    fontSize: 14,
  },

  /* ===== FOOTER ===== */
  footer: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    alignItems: "center",
  },
  footerLogo: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
});
