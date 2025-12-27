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
import axios from "axios";
import config from "../config";
import { Picker } from "@react-native-picker/picker";

export default function AcceptedClothesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState({});
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedDate, setSelectedDate] = useState("ALL");

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
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${config.API_URL}/donations/clothes/accepted`);
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

      {/* ✅ FILTER */}
      <View style={styles.filterBox}>
        <Text style={styles.filterTitle}>Filter by Date</Text>

        <View style={styles.pickerWrap}>
          <Picker
            mode="dropdown"
            selectedValue={selectedDate}
            onValueChange={(v) => setSelectedDate(v)}
            style={{ width: "100%" }}
          >
            {allDates.map((d) => (
              <Picker.Item key={d} label={d === "ALL" ? "All Dates" : d} value={d} />
            ))}
          </Picker>
        </View>
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
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EBE1D7" },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#8b6f69",
    textAlign: "center",
    marginVertical: 10,
  },

  filterBox: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },

  filterTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8b6f69",
    marginBottom: 6,
  },

  pickerWrap: {
    backgroundColor: "#f3f3f3",
    borderRadius: 10,
    width: 340,
    height: 44,
    justifyContent: "center",
  },

  headerLarge: {
    backgroundColor: "#EBE1D7",
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  welcomeLogo: {
    width: 120,
    height: 120,
    marginRight: 10,
    marginLeft: -20,
    marginTop: -40,
  },
  headerMainTitle: {
    fontFamily: "Times New Roman",
    fontSize: 22,
    marginTop: -55,
    marginLeft: -40,
    color: "#8b6f69",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
  },

  itemImage: { width: 70, height: 70, borderRadius: 10, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { color: "#555", marginVertical: 4 },
  deadline: { fontSize: 13, color: "#333" },

  actionButtons: { flexDirection: "row", gap: 10, marginTop: 10 },
  detailsBtn: { backgroundColor: "#8b6f69", padding: 8, borderRadius: 8 },
  approveBtn: { backgroundColor: "#3b82f6", padding: 8, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
});
