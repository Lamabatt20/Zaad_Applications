import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import config from "../config";

/* ===== COLORS (Zaad Theme) ===== */
const BROWN = "#A27571";
const BEIGE = "#EBE1D7";
const CARD_BG = "#F7F1EC";
const TEXT_DARK = "#4A3B38";
const TEXT_LIGHT = "#7A6A66";

export default function DonationHistoryScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donor_id, setDonor_id] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem("user_data"));
      setUser(userData);
      setDonor_id(userData.user_id);
      const res = await axios.get(
        `${config.API_URL}/donation_history/donor/${userData.user_id}`
      );
      setItems(res.data || []);
    } catch (e) {
      console.log("Error loading donation history:", e);
    } finally {
      setLoading(false);
    }
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
      <View style={styles.header}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.headerLogo}
        />
        <Text style={styles.headerTitle}>Donation History</Text>
      </View>

      {/* ===== LIST ===== */}
      <FlatList
        data={items}
        keyExtractor={(item, index) => `${item.donation_id}-${index}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => {
          const isCompleted = item.delivery_status === "DELIVERED";
          const isApproved = item.description === "APPROVED";
          const isAssociation = item.delivery_method === "association";
          const isDonor = item.delivery_method === "donor";

          return (
            <View style={styles.card}>
              {/* ===== COMPLETED RIBBON ===== */}
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>
                    COMPLETED
                  </Text>
                </View>
              )}

              <Text style={styles.title}>
                Donation #{item.donation_id}
              </Text>

              <Text style={styles.status}>
                Status:{" "}
                <Text style={styles.statusValue}>
                  {item.description}
                </Text>
              </Text>

              <Text style={styles.date}>
                {new Date(item.event_time).toLocaleString("en-US")}
              </Text>

              {/* ===== ACTIONS ===== */}
              {isApproved && !isCompleted && isAssociation && (
                <TouchableOpacity
                  style={styles.trackBtn}
                  onPress={() =>
                    navigation.navigate("DonationTrackScreen", {
                      donation_id: item.donation_id,
                      delivery_status: item.delivery_status,
                    })
                  }
                >
                  <Text style={styles.btnText}>Track Donation</Text>
                </TouchableOpacity>
              )}

              {isApproved && !isCompleted && isDonor && (
                <TouchableOpacity
                  style={styles.deliverBtn}
                  onPress={() =>
                    navigation.navigate("DonationDeliverScreen", {
                      donation_id: item.donation_id,
                    })
                  }
                >
                  <Text style={styles.btnText}>Mark as Delivered</Text>
                </TouchableOpacity>
              )}

              {isCompleted && (
                <TouchableOpacity
                  style={styles.rateBtn}
                  onPress={() => {
                    if (item.donation_id && user?.user_id) {
                      navigation.navigate("DonationRating", {
                        donationId: item.donation_id,
                        donorId: user.user_id,
                      });
                    } else {
                      alert("Error: Missing donation or donor information");
                    }
                  }}
                >
                  <Text style={styles.btnText}>⭐ Rate Donation</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No donation history available
          </Text>
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

/* ===== STYLES ===== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BEIGE,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerLogo: {
    width: 140,
    height: 140,
    marginLeft: -30,
    marginTop: -40,
    resizeMode: "contain",
  },
  headerTitle: {
    fontFamily: "Times New Roman",
    fontSize: 24,
    color: BROWN,
    marginLeft: -20,
    marginTop: -40,
  },

  /* CARD */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    overflow: "hidden",
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 6,
  },

  status: {
    fontSize: 14,
    color: TEXT_LIGHT,
  },
  statusValue: {
    color: TEXT_DARK,
    fontWeight: "600",
  },

  date: {
    marginTop: 6,
    fontSize: 12,
    color: TEXT_LIGHT,
  },

  /* BUTTONS */
  trackBtn: {
    marginTop: 14,
    backgroundColor: BROWN,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },

  deliverBtn: {
    marginTop: 14,
    backgroundColor: "#C9B3AE",
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },

  rateBtn: {
    marginTop: 14,
    backgroundColor: "#D4A574",
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  /* COMPLETED RIBBON */
  completedBadge: {
    position: "absolute",
    top: 10,
    right: -22,
    backgroundColor: BROWN,
    paddingVertical: 2,
    paddingHorizontal: 26,
    transform: [{ rotate: "45deg" }],
    zIndex: 10,
  },

  completedBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  empty: {
    textAlign: "center",
    marginTop: 60,
    color: TEXT_LIGHT,
    fontSize: 15,
  },

  /* FOOTER */
  footer: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  footerLogo: {
    width: 90,
    height: 40,
    opacity: 0.8,
    resizeMode: "contain",
  },
});
