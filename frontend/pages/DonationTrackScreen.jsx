import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
} from "react-native";

const BROWN = "#A27571";
const BG = "#EBE1D7";

/**
 * خطوات التتبع في الواجهة
 */
const steps = [
  { key: "ASSIGNED", label: "Order Assigned" },
  { key: "ON_THE_WAY_TO_DONOR", label: "On the way to donor" },
  { key: "PICKED_UP", label: "Donation picked up" },
  { key: "ON_THE_WAY_TO_ASSOCIATION", label: "On the way to association" },
  { key: "DELIVERED", label: "Donation delivered" },
];

/**
 * Mapping بين حالات الباك وحالات الواجهة
 */
const STATUS_MAP = {
  NEEDS_ASSIGNMENT: "ASSIGNED",
  WAITING_FOR_DONOR: "ON_THE_WAY_TO_DONOR",
  ASSIGNED: "ASSIGNED",
  PICKED_UP: "PICKED_UP",
  ON_THE_WAY_TO_ASSOCIATION: "ON_THE_WAY_TO_ASSOCIATION",
  DELIVERED: "DELIVERED",
};

export default function DonationTrackScreen({ route }) {
  const { delivery_status } = route.params || {};

  // توحيد الحالة القادمة من الباك
  const normalizedStatus =
    STATUS_MAP[delivery_status] || delivery_status || null;

  // تحديد أي خطوة مفعّلة
  const currentIndex = steps.findIndex(
    (s) => s.key === normalizedStatus
  );

  // DEBUG (اختياري)
  // console.log("RAW STATUS:", delivery_status);
  // console.log("NORMALIZED:", normalizedStatus);
  // console.log("INDEX:", currentIndex);

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
          const completed =
            currentIndex !== -1 && index <= currentIndex;

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

              {/* STEP CARD */}
              <View
                style={[
                  styles.card,
                  completed && styles.cardActive,
                ]}
              >
                <Text
                  style={[
                    styles.cardText,
                    completed && styles.cardTextActive,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

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

/* ================= STYLES ================= */

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
    backgroundColor: "#f7f1ef",
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