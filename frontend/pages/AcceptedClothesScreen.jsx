import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import config from "../config";

export default function AcceptedClothesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState({});
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedDate, setSelectedDate] = useState("ALL");
  const [filterVisible, setFilterVisible] = useState(false);

  const buildImageUrl = (raw) => {
    if (!raw) return null;
    return raw.startsWith("/") ? encodeURI(`${config.API_URL}${raw}`) : raw;
  };

  const getYMD = (created_at) => {
    if (!created_at) return "";
    const s = String(created_at);
    return s.includes("T") ? s.split("T")[0] : s.slice(0, 10);
  };

  const normalizeDonation = (x) => ({
    donation_id: x.donation_id,
    donor_name: x.donor_name ?? "Donor",
    item_image: buildImageUrl(x.item_image),
    note: x.note ?? "",
    created_at: x.created_at,
    status: x.status ?? "accepted",
    delivery_method: x.delivery_method ?? "donor",
    delivery_status: x.delivery_status ?? "pending",
  });

  const fetchData = async () => {
    try {
      setLoading(true);

      const userDataStr = await AsyncStorage.getItem("user_data");
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const associationId = userData?.association_id;

      const url = associationId
        ? `${config.API_URL}/donations/clothes/accepted?association_id=${associationId}`
        : `${config.API_URL}/donations/clothes/accepted`;
      const res = await axios.get(url);
      const arr = Array.isArray(res.data) ? res.data : [];
      setItems(arr.map(normalizeDonation));
    } catch {
      setErrorMsg("Failed to load accepted donations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const approveDonation = async (id) => {
    try {
      setSubmitting((s) => ({ ...s, [id]: true }));
      await axios.post(`${config.API_URL}/assoc/donations/${id}/approve`);
      setItems((prev) => prev.filter((d) => d.donation_id !== id));
    } catch {
      Alert.alert("Error", "Could not approve donation");
    } finally {
      setSubmitting((s) => {
        const c = { ...s };
        delete c[id];
        return c;
      });
    }
  };

  const allDates = useMemo(() => {
    const set = new Set(items.map((d) => getYMD(d.created_at)));
    return ["ALL", ...Array.from(set).filter(Boolean).sort().reverse()];
  }, [items]);

  const filteredItems =
    selectedDate === "ALL"
      ? items
      : items.filter((d) => getYMD(d.created_at) === selectedDate);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={
          item.item_image
            ? { uri: item.item_image }
            : require("../assets/icon.png")
        }
        style={styles.itemImage}
      />

      <Text style={styles.title}>{item.donor_name}</Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {item.note || "No description"}
      </Text>
      <Text style={styles.deadline}>Date: {getYMD(item.created_at)}</Text>

      {/* ✅ Delivery Method & Status */}
      <Text style={styles.deliveryInfo}>
        Delivery Method:{" "}
        {item.delivery_method === "donor"
          ? "Donor will deliver"
          : "Association Pickup"}
      </Text>
      <Text style={styles.deliveryInfo}>
        Delivery Status:{" "}
        {item.delivery_status === "pending"
          ? "Pending"
          : item.delivery_status === "on_the_way"
          ? "On the way"
          : "Delivered"}
      </Text>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => {
            setSelected(item);
            setDetailsVisible(true);
          }}
        >
          <Text style={styles.btnText}>Details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.approveBtn}
          onPress={() => approveDonation(item.donation_id)}
          disabled={submitting[item.donation_id]}
        >
          <Text style={styles.btnText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const filterLabel = selectedDate === "ALL" ? "All Accepted Dates" : selectedDate;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerLarge}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
        <Text style={styles.headerMainTitle}>Accepted Clothes Donations</Text>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterVisible(true)}>
          <Text style={styles.filterBtnTitle}>Filter by Date</Text>
          <Text style={styles.filterBtnValue}>{filterLabel}</Text>
        </TouchableOpacity>

        {selectedDate !== "ALL" && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setSelectedDate("ALL")}> 
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(i) => String(i.donation_id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              No accepted donations
            </Text>
          }
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFilterVisible(false)}>
          <Pressable style={styles.filterModalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <FlatList
              data={allDates}
              keyExtractor={(d) => d}
              style={{ maxHeight: 340 }}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              renderItem={({ item: d }) => {
                const active = selectedDate === d;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDate(d);
                      setFilterVisible(false);
                    }}
                    style={[styles.dateRow, active && styles.dateRowActive]}
                  >
                    <Text style={[styles.dateText, active && styles.dateTextActive]}>
                      {d === "ALL" ? "All Dates" : d}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <View style={{ height: 12 }} />
            <TouchableOpacity
              style={[styles.btn, styles.closeBtn, { alignSelf: "flex-end" }]}
              onPress={() => setFilterVisible(false)}
            >
              <Text style={styles.btnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* DETAILS MODAL */}
      <Modal transparent visible={detailsVisible} animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDetailsVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Donation Details</Text>
            <Text>{selected?.donor_name}</Text>
            <Text>{selected?.note}</Text>
            <Text>
              Delivery Method:{" "}
              {selected?.delivery_method === "donor"
                ? "Donor will deliver"
                : "Association Pickup"}
            </Text>
            <Text>
              Delivery Status:{" "}
              {selected?.delivery_status === "pending"
                ? "Pending"
                : selected?.delivery_status === "on_the_way"
                ? "On the way"
                : "Delivered"}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
// Keep only ONE const styles = StyleSheet.create({ ... }) at the end

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
  headerMainTitle: {
    fontFamily: "Times New Roman",
    fontSize: 22,
    marginTop: -55,
    marginLeft: -40,
    color: "#8b6f69",
  },

  errorBar: { backgroundColor: "#ffefef", padding: 10 },
  errorText: { color: "#9b1c1c", textAlign: "center" },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 15, marginBottom: 15, elevation: 3 },
  itemImage: { width: 70, height: 70, borderRadius: 10, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { color: "#555", marginVertical: 4 },
  deadline: { fontSize: 13, color: "#333" },
  deliveryInfo: { fontSize: 13, color: "#333", marginTop: 2 },

  actionButtons: { flexDirection: "row", gap: 10, marginTop: 10 },
  detailsBtn: { backgroundColor: "#8b6f69", padding: 8, borderRadius: 8 },
  assignBtn: { backgroundColor: "#A27571", padding: 8, borderRadius: 8 },
  approveBtn: { backgroundColor: "#3b82f6", padding: 8, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "700" },

  filterRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, marginBottom: 10 },
  filterBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, elevation: 2 },
  filterBtnTitle: { fontSize: 13, fontWeight: "800", color: "#8b6f69", marginBottom: 4, fontFamily: "Times New Roman" },
  filterBtnValue: { fontSize: 14, fontWeight: "700", color: "#333" },
  clearBtn: { backgroundColor: "#8b6f69", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  clearBtnText: { color: "#fff", fontWeight: "800" },
  filterModalCard: { width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: 16, padding: 16, elevation: 10 },
  sep: { height: 10 },
  dateRow: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#f3f3f3" },
  dateRowActive: { backgroundColor: "#8b6f69" },
  dateText: { fontSize: 14, fontWeight: "800", color: "#333" },
  dateTextActive: { color: "#fff" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalCard: { backgroundColor: "#fff", padding: 20, borderRadius: 14, width: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  btn: {},
  closeBtn: {},
});