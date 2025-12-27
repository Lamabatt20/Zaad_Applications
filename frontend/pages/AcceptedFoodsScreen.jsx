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

export default function AcceptedFoodScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState({}); // { [id]: true }

  // Details modal
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState(null);

  // Date filter (dropdown)
  const [selectedDate, setSelectedDate] = useState("ALL");

  const buildImageUrl = (raw) => {
    if (!raw) return null;
    const full = String(raw).startsWith("/") ? `${config.API_URL}${raw}` : raw;
    return encodeURI(full);
  };

  const getYMD = (created_at) => {
    if (!created_at) return "";
    const s = String(created_at);
    return s.includes("T") ? s.split("T")[0] : s.slice(0, 10);
  };

  const normalizeDonation = (x) => ({
    donation_id: x.donation_id ?? x.id,
    donor_name: x.donor_name ?? x.full_name ?? "Donor",
    item_image: buildImageUrl(x.item_image ?? x.photo_url ?? null),
    note: x.note ?? x.description ?? "",
    created_at: x.created_at ?? x.createdAt ?? new Date().toISOString(),
    status: x.status ?? "accepted",
    quantity: x.quantity ?? null,
  });

  const assertConfig = () => {
    if (!config?.API_URL) {
      const msg = "config.API_URL is missing. Set it in ../config.";
      console.warn(msg);
      setErrorMsg(msg);
      setLoading(false);
      return false;
    }
    return true;
  };

  const fetchData = async () => {
    if (!assertConfig()) return;

    try {
      setErrorMsg("");
      setLoading(true);

      // ✅ FOOD accepted endpoint
      console.log("[FETCH] GET", `${config.API_URL}/donations/food/accepted`);
      const res = await axios.get(`${config.API_URL}/donations/food/accepted`);

      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const normalized = arr.map(normalizeDonation);
      setItems(normalized);

      // لو التاريخ المختار اختفى بعد refresh رجّعه ALL
      const datesSet = new Set(normalized.map((d) => getYMD(d.created_at)).filter(Boolean));
      if (selectedDate !== "ALL" && !datesSet.has(selectedDate)) setSelectedDate("ALL");
    } catch (e) {
      setErrorMsg(typeof e?.message === "string" ? e.message : "Failed to load accepted food donations");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const removeFromUI = (id) => {
    setItems((prev) => prev.filter((d) => String(d.donation_id) !== String(id)));
  };

  const approveDonation = async (id) => {
    try {
      setSubmitting((s) => ({ ...s, [id]: true }));
      removeFromUI(id); // optimistic (رح يظهر في Approved)
      await axios.post(`${config.API_URL}/assoc/donations/${id}/approve`);
    } catch (e) {
      Alert.alert("Error", "Could not approve. Restoring item.");
      fetchData();
    } finally {
      setSubmitting((s) => {
        const c = { ...s };
        delete c[id];
        return c;
      });
    }
  };

  const allDates = useMemo(() => {
    const set = new Set();
    items.forEach((d) => {
      const ymd = getYMD(d.created_at);
      if (ymd) set.add(ymd);
    });
    // الأحدث فوق
    return ["ALL", ...Array.from(set).sort().reverse()];
  }, [items]);

  const filteredItems =
    selectedDate === "ALL" ? items : items.filter((d) => getYMD(d.created_at) === selectedDate);

  const renderItem = ({ item }) => {
    const dateStr = getYMD(item.created_at);
    const isSubmitting = !!submitting[item.donation_id];

    return (
      <View style={styles.card}>
        {item.item_image ? (
          <Image source={{ uri: item.item_image }} style={styles.itemImage} />
        ) : (
          <Image source={require("../assets/icon.png")} style={styles.itemImage} />
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.donor_name}</Text>

          {!!item.quantity && (
            <Text style={styles.metaText}>Quantity: <Text style={{ fontWeight: "800" }}>{item.quantity}</Text></Text>
          )}

          <Text numberOfLines={2} style={styles.subtitle}>
            {item.note || "No description"}
          </Text>

          <Text style={styles.deadline}>
            Date: <Text style={{ fontWeight: "700" }}>{dateStr || "-"}</Text>
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusAccepted}>Accepted</Text>
        </View>

        <View style={styles.actionButtons}>
          {/* Details -> modal */}
          <TouchableOpacity
            style={[styles.btn, styles.detailsBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={() => {
              setSelected(item);
              setDetailsVisible(true);
            }}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Details</Text>
          </TouchableOpacity>

          {/* Approve */}
          <TouchableOpacity
            style={[styles.btn, styles.approveBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={() => approveDonation(item.donation_id)}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerLarge}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
        <Text style={styles.headerMainTitle}>Accepted Food Donations</Text>
      </View>

      {!!errorMsg && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Date filter dropdown */}
      <View style={styles.filterBox}>
        <Text style={styles.filterTitle}>Filter by Date</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={selectedDate} onValueChange={(v) => setSelectedDate(v)}>
            {allDates.map((d) => (
              <Picker.Item
                key={d}
                label={d === "ALL" ? "All Dates" : d}
                value={d}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* List */}
      <View style={styles.content}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#8b6f69" />
            <Text style={{ marginTop: 8, color: "#8b6f69" }}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(it) => String(it.donation_id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", marginTop: 30 }}>
                No accepted food donations
              </Text>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
            <Text style={styles.modalTitle}>Donation Details</Text>

            {selected?.item_image ? (
              <Image source={{ uri: selected.item_image }} style={styles.modalImage} />
            ) : (
              <Image source={require("../assets/icon.png")} style={styles.modalImage} />
            )}

            <Text style={styles.modalName}>{selected?.donor_name || "Donor"}</Text>

            {!!selected?.quantity && (
              <Text style={styles.modalMeta}>Quantity: <Text style={{ fontWeight: "800" }}>{selected.quantity}</Text></Text>
            )}

            <Text style={styles.modalDesc}>
              {selected?.note?.trim() ? selected.note : "No description"}
            </Text>

            <Text style={styles.modalDate}>Date: {getYMD(selected?.created_at) || "-"}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.approveBtn]}
                onPress={() => {
                  const id = selected?.donation_id;
                  setDetailsVisible(false);
                  setSelected(null);
                  if (id) approveDonation(id);
                }}
              >
                <Text style={styles.btnText}>Approve</Text>
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
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  welcomeLogo: {
    width: 135,
    height: 135,
    marginRight: 10,
    marginLeft: -35,
    marginTop: -50,
  },
  headerMainTitle: {
    fontFamily: "Times New Roman",
    fontSize: 23,
    marginTop: -75,
    marginLeft: -50,
    color: "#8b6f69",
  },

  errorBar: { backgroundColor: "#ffefef", padding: 10 },
  errorText: { color: "#9b1c1c", textAlign: "center" },

  filterBox: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 10,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8b6f69",
    marginBottom: 6,
    fontFamily: "Times New Roman",
  },
  pickerWrap: {
    backgroundColor: "#f3f3f3",
    borderRadius: 10,
    overflow: "hidden",
  },

  content: { flex: 1, backgroundColor: "#EBE1D7" },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
  },
  itemImage: { width: 70, height: 70, borderRadius: 10, marginBottom: 10 },

  title: { fontSize: 18, fontWeight: "700", color: "#333" },
  metaText: { fontSize: 13, color: "#555", marginTop: 2 },
  subtitle: { fontSize: 14, color: "#666", marginVertical: 5, width: "90%" },
  deadline: { marginTop: 5, fontSize: 14, color: "#333" },

  statusContainer: { position: "absolute", right: 10, top: 10 },
  statusAccepted: {
    backgroundColor: "#22c55e",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "700",
  },

  actionButtons: { flexDirection: "row", gap: 10, marginTop: 15, flexWrap: "wrap" },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, alignItems: "center" },
  detailsBtn: { backgroundColor: "#8b6f69" },
  approveBtn: { backgroundColor: "#3b82f6" },
  closeBtn: { backgroundColor: "#8b6f69" },
  btnText: { color: "#fff", fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#8b6f69",
    marginBottom: 12,
    textAlign: "center",
    fontFamily: "Times New Roman",
  },
  modalImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#f2f2f2",
  },
  modalName: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 6 },
  modalMeta: { fontSize: 13, color: "#555", marginBottom: 8 },
  modalDesc: { fontSize: 14, color: "#555", marginBottom: 10, lineHeight: 20 },
  modalDate: { fontSize: 13, color: "#666", marginBottom: 12 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
});
