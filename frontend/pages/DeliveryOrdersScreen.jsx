import React, { useState, useCallback } from "react";
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
import { useFocusEffect } from "@react-navigation/native";

const BROWN = "#A27571";
const BG = "#EBE1D7";

export default function DeliveryOrdersScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

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

  // 🔄 refresh when screen focused
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

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
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Image
            source={require("../assets/images/logout.png")}
            style={styles.logoutIcon}
          />
        </TouchableOpacity>

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
            {/* ===== DONOR INFO ===== */}
            <Text style={styles.sectionTitle}>Pickup</Text>

            <Text style={styles.label}>Donor</Text>
            <Text style={styles.value}>{item.donor_name}</Text>

            <Text style={styles.label}>Address</Text>
            <Text style={styles.address}>
              {item.donation_address  || "—"}
            </Text>

            {/* ===== ASSOCIATION INFO ===== */}
            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Drop-off</Text>

            <Text style={styles.label}>Association</Text>
            <Text style={styles.value}>
              {item.association_name || "—"}
            </Text>

            <Text style={styles.label}>Address</Text>
            <Text style={styles.address}>
              {item.association_address || "—"}
            </Text>

            {/* ===== STATUS ===== */}
            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {item.delivery_status}
                </Text>
              </View>
            </View>

            {/* ===== ACTION ===== */}
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
          <Text style={styles.empty}>No delivery orders available</Text>
        }
      />

      {/* ===== FOOTER ===== */}
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

  card: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: BROWN,
    marginBottom: 6,
  },

  label: {
    color: "#777",
    fontSize: 12,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  address: {
    fontSize: 13,
    color: "#000",
    lineHeight: 18,
    marginBottom: 8,
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },

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
