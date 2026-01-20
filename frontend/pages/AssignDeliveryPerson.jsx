import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import config from "../config";

export default function AssignDeliveryPerson({ navigation, route }) {
  const donation_id = route?.params?.donation_id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [assigningId, setAssigningId] = useState(null);

  // ✅ Details modal (optional nice UX)
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchDrivers = async () => {
    try {
      setErrorMsg("");
      setLoading(true);

      const userDataStr = await AsyncStorage.getItem("user_data");
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const associationId = userData?.association_id;

      if (!associationId) {
        setErrorMsg("association_id missing. Please login again.");
        setDrivers([]);
        return;
      }

      const res = await axios.get(
        `${config.API_URL}/assoc/delivery-persons?association_id=${associationId}`
      );

      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setDrivers(arr);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to load delivery persons");
      setDrivers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!donation_id) {
      setErrorMsg("donation_id missing. Please go back and try again.");
      setLoading(false);
      return;
    }
    fetchDrivers();
  }, [donation_id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDrivers();
  };

  const assignDriver = async (delivery_person_id) => {
    if (!donation_id) return;

    try {
      setAssigningId(delivery_person_id);

      await axios.post(
        `${config.API_URL}/assoc/donations/${donation_id}/assign-delivery`,
        { delivery_person_id }
      );

      Alert.alert("Success", "Driver assigned successfully ✅", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not assign driver");
    } finally {
      setAssigningId(null);
    }
  };

  const renderItem = ({ item }) => {
    const id = item.delivery_person_id;
    const isAssigning = assigningId === id;

    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titleName}>{item.name || "Driver"}</Text>
          <Text style={styles.subtitleText}>Phone: {item.phone || "-"}</Text>
          {!!item.email && <Text style={styles.subtitleText}>Email: {item.email}</Text>}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.btn, styles.detailsBtn, isAssigning && { opacity: 0.6 }]}
            onPress={() => {
              setSelected(item);
              setDetailsVisible(true);
            }}
            disabled={isAssigning}
          >
            <Text style={styles.btnText}>Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.assignBtn, isAssigning && { opacity: 0.6 }]}
            onPress={() => assignDriver(id)}
            disabled={isAssigning}
          >
            {isAssigning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Assign</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header same theme */}
      <View style={styles.headerLarge}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerMainTitle}>Assign Delivery Person</Text>
          <Text style={styles.headerSubTitle}>Donation ID: {donation_id || "-"}</Text>
        </View>
      </View>

      {!!errorMsg && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* List */}
      <View style={styles.content}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#8b6f69" />
            <Text style={{ marginTop: 8, color: "#8b6f69" }}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={drivers}
            keyExtractor={(x) => String(x.delivery_person_id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", marginTop: 30 }}>
                No approved delivery persons found
              </Text>
            }
          />
        )}
      </View>

      {/* Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setDetailsVisible(false);
            setSelected(null);
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Driver Details</Text>

            <Text style={styles.modalRow}>
              Name: <Text style={{ fontWeight: "800" }}>{selected?.name || "-"}</Text>
            </Text>
            <Text style={styles.modalRow}>
              Phone: <Text style={{ fontWeight: "800" }}>{selected?.phone || "-"}</Text>
            </Text>
            {!!selected?.email && (
              <Text style={styles.modalRow}>
                Email: <Text style={{ fontWeight: "800" }}>{selected?.email}</Text>
              </Text>
            )}

            <View style={{ height: 12 }} />

            <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={[styles.btn, styles.assignBtn]}
                onPress={() => {
                  const id = selected?.delivery_person_id;
                  setDetailsVisible(false);
                  setSelected(null);
                  if (id) assignDriver(id);
                }}
              >
                <Text style={styles.btnText}>Assign</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.closeBtn]}
                onPress={() => {
                  setDetailsVisible(false);
                  setSelected(null);
                }}
              >
                <Text style={styles.btnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EBE1D7" },

  headerLarge: {
    backgroundColor: "#EBE1D7",
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  welcomeLogo: { width: 120, height: 120, marginRight: 10, marginLeft: -20, marginTop: -40 },
  headerTextContainer: { flex: 1 },
  headerMainTitle: {
    fontFamily: "Times New Roman",
    fontSize: 22,
    marginTop: -55,
    marginLeft: -40,
    color: "#8b6f69",
  },
  headerSubTitle: {
    marginLeft: -40,
    marginTop: 6,
    color: "#333",
    fontWeight: "700",
    fontSize: 13,
  },

  errorBar: { backgroundColor: "#ffefef", padding: 10, marginHorizontal: 20, borderRadius: 12 },
  errorText: { color: "#9b1c1c", textAlign: "center", fontWeight: "700" },

  content: { flex: 1, backgroundColor: "#EBE1D7" },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 15, marginBottom: 15, elevation: 3 },
  titleName: { fontSize: 16, fontWeight: "800", color: "#333" },
  subtitleText: { color: "#555", marginTop: 4, fontSize: 13 },

  actionButtons: { flexDirection: "row", gap: 10, marginTop: 12, justifyContent: "flex-end" },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignItems: "center" },
  detailsBtn: { backgroundColor: "#8b6f69" },
  assignBtn: { backgroundColor: "#A27571" },
  closeBtn: { backgroundColor: "#8b6f69" },
  btnText: { color: "#fff", fontWeight: "800" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: { width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: 16, padding: 16, elevation: 10 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#8b6f69",
    marginBottom: 12,
    textAlign: "center",
    fontFamily: "Times New Roman",
  },
  modalRow: { fontSize: 14, color: "#333", marginBottom: 8 },
});
