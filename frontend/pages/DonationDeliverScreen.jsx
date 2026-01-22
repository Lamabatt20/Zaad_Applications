import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import axios from "axios";
import config from "../config";

/* ======================
   🎨 Zaad Colors
====================== */
const BG = "#EBE1D7";
const PRIMARY = "#A27571";
const TEXT = "#4a3b38";
const CARD = "#f7f1ef";

/* ======================
   📍 Address Normalizer
====================== */
const normalizeAddress = (address) => {
  if (!address) return "Ramallah, West Bank, Palestine";

  const lower = address.toLowerCase();

  if (lower.includes("ramallah") || lower.includes("رام")) {
    return "Ramallah, West Bank, Palestine";
  }
  if (lower.includes("beitunia") || lower.includes("بيتونيا")) {
    return "Beitunia, West Bank, Palestine";
  }
  if (lower.includes("nablus") || lower.includes("نابلس")) {
    return "Nablus, West Bank, Palestine";
  }
  if (lower.includes("hebron") || lower.includes("الخليل")) {
    return "Hebron, West Bank, Palestine";
  }
  if (lower.includes("bethlehem") || lower.includes("بيت لحم")) {
    return "Bethlehem, West Bank, Palestine";
  }

  return "Ramallah, West Bank, Palestine";
};

export default function DonationDeliverScreen({ route, navigation }) {
  const { donation_id } = route.params;

  const [loading, setLoading] = useState(true);
  const [association, setAssociation] = useState(null);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    fetchAssociation();
  }, []);

  const fetchAssociation = async () => {
    try {
      const res = await axios.get(
        `${config.API_URL}/donations/${donation_id}/association`
      );

      setAssociation(res.data);

      /* 🌍 Normalize + Geocode */
      const query = normalizeAddress(res.data.address);

      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          query
        )}`
      );

      const geoData = await geoRes.json();

      if (geoData && geoData.length > 0) {
        setCoords({
          latitude: parseFloat(geoData[0].lat),
          longitude: parseFloat(geoData[0].lon),
        });
      }
    } catch (e) {
      Alert.alert("خطأ", "فشل تحميل بيانات الجمعية");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelivery = async () => {
  try {
    await axios.post(`${config.API_URL}/donor/deliver`, {
      donation_id,
    });

    Alert.alert("تم", "تم توصيل التبرع بنجاح", [
      {
        text: "حسناً",
        onPress: () => navigation.navigate("DonationHistoryScreen"),
      },
    ]);
  } catch (e) {
    Alert.alert("خطأ", "فشل تأكيد التوصيل");
  }
};

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.logo}
        />
        <Text style={styles.headerText}>Association address</Text>
      </View>

      {/* ===== ASSOCIATION CARD ===== */}
      <View style={styles.card}>
        <Text style={styles.name}>{association?.name}</Text>
        <Text style={styles.address}>{association?.address}</Text>
      </View>

      {/* ===== MAP ===== */}
      {coords ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
        >
          <Marker coordinate={coords} title={association?.name} />
        </MapView>
      ) : (
        <Text style={styles.mapFallback}>
          لا يمكن عرض الموقع حالياً
        </Text>
      )}

      {/* ===== CONFIRM BUTTON ===== */}
      <TouchableOpacity
        style={styles.btn}
        onPress={confirmDelivery}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>تم توصيل الطلب</Text>
      </TouchableOpacity>

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

/* ======================
   🎨 Styles
====================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    padding: 20,
    paddingLeft: 10,
    
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BG,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  logo: {
    width: 150,
    height: 150,
    resizeMode: "contain",
    marginLeft: -10,
    marginTop:-50,
  },

  headerText: {
    fontFamily: "Times New Roman",
    fontSize: 24,
    color: PRIMARY,
    marginLeft: -20,
    marginTop: -60,
  },

  card: {
    backgroundColor: CARD,
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    marginHorizontal: 6,
  },

  name: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 6,
  },

  address: {
    textAlign: "center",
    fontSize: 14,
    color: TEXT,
    lineHeight: 20,
  },

  map: {
    width: "100%",
    height: 260,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 20,
  },

  mapFallback: {
    textAlign: "center",
    color: TEXT,
    marginVertical: 30,
  },

  btn: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginHorizontal: 6,
  },

  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
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
