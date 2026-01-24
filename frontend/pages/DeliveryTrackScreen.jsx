import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Image,
} from "react-native";
import axios from "axios";
import config from "../config";

const BROWN = "#A27571";
const BG = "#EBE1D7";

const steps = [
  { key: "ASSIGNED", label: "Order Assigned" },
  { key: "ON_THE_WAY_TO_DONOR", label: "On the way to donor" },
  { key: "PICKED_UP", label: "Donation picked up" },
  { key: "ON_THE_WAY_TO_ASSOCIATION", label: "On the way to association" },
  { key: "DELIVERED", label: "Donation delivered" },
];

export default function DeliveryTrackScreen({ route, navigation }) {
  const { donation } = route.params;
  const [status, setStatus] = useState(donation.delivery_status);
  const [loading, setLoading] = useState(false);

  const currentIndex = steps.findIndex((s) => s.key === status);

  const updateStatus = async (nextStatus) => {
    if (loading) return;

    try {
      setLoading(true);

      await axios.post(`${config.API_URL}/delivery/update-status`, {
        donation_id: donation.donation_id,
        next_status: nextStatus,
      });

      setStatus(nextStatus);

      if (nextStatus === "DELIVERED") {
        Alert.alert("Done", "Donation delivered successfully");
        if (route.params?.onGoBack) {
          route.params.onGoBack();
        }
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Error", "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.welcomeRow}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.welcomeLogo}
        />
        <View style={styles.welcomeTextContainer}>
          <Text style={styles.welcome}>Order Tracking</Text>
        </View>
      </View>

      {/* ===== TRACKING STEPS ===== */}
      <View style={styles.content}>
        {steps.map((step, index) => {
          const completed = index <= currentIndex;
          const isNext = index === currentIndex + 1;

          return (
            <View key={step.key} style={styles.row}>
              {/* CHECKBOX */}
              <View
                style={[
                  styles.checkbox,
                  completed && styles.checkboxActive,
                ]}
              >
                {completed && <Text style={styles.check}>✓</Text>}
              </View>

              {/* STEP CARD (CLICKABLE ONLY IF NEXT) */}
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={!isNext}
                onPress={() => updateStatus(step.key)}
                style={[
                  styles.card,
                  completed && styles.cardActive,
                  isNext && styles.cardNext,
                  !isNext && !completed && styles.cardDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.cardText,
                    completed && styles.cardTextActive,
                    isNext && styles.cardTextNext,
                  ]}
                >
                  {step.label}
                </Text>

                {isNext && (
                  <Text style={styles.tapHint}>
                    Tap to confirm
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

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

  /* ===== HEADER ===== */
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
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

  /* ===== CONTENT ===== */
  content: {
    paddingHorizontal: 10,
    marginTop: -10,
  },

  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 16,
  },

  /* ===== CHECKBOX ===== */
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: BROWN,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
  },
  checkboxActive: {
    backgroundColor: BROWN,
  },
  check: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },

  /* ===== CARD ===== */
  card: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardActive: {
    borderColor: BROWN,
  },
  cardNext: {
    borderColor: BROWN,
    backgroundColor: "#f7f1ef",
  },
  cardDisabled: {
    opacity: 0.5,
  },

  cardText: {
    fontSize: 14,
    color: "#777",
    textAlign: "right",
  },
  cardTextActive: {
    color: "#000",
    fontWeight: "700",
  },
  cardTextNext: {
    color: BROWN,
    fontWeight: "800",
  },
  tapHint: {
    marginTop: 4,
    fontSize: 11,
    color: BROWN,
    textAlign: "right",
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
