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

export default function RejectedClothesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState({}); // { [id]: true }

  // ✅ Details modal
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState(null);

  // ✅ Date filter (Dropdown)
  const [selectedDate, setSelectedDate] = useState("ALL");

  // ✅ re-render every minute for restore countdown
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const RESTORE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

  const buildImageUrl = (raw) => {
    if (!raw) return null;
    const full = raw.startsWith("/") ? `${config.API_URL}${raw}` : raw;
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
    status: x.status ?? "rejected",
    rejected_at: x.rejected_at ?? null, // ✅ if API returns it
  });

  // ✅ prefer rejected_at if you have it; fallback to created_at
  const getRejectTime = (item) => item?.rejected_at || item?.created_at;

  const canRestore = (rejectTime) => {
    const t = new Date(rejectTime).getTime();
    if (!Number.isFinite(t)) return false;
    return Date.now() - t <= RESTORE_WINDOW_MS;
  };

  const minutesLeft = (rejectTime) => {
    const t = new Date(rejectTime).getTime();
    if (!Number.isFinite(t)) return 0;
    const msLeft = RESTORE_WINDOW_MS - (Date.now() - t);
    return Math.max(0, Math.ceil(msLeft / (60 * 1000)));
  };

  const fetchRejected = async () => {
    try {
      setErrorMsg("");
      setLoading(true);

      const res = await axios.get(`${config.API_URL}/donations/clothes/rejected`);
      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const normalized = arr.map(normalizeDonation);
      setItems(normalized);

      // ✅ if selected date not exists anymore -> reset ALL
      const dates = new Set(normalized.map((d) => getYMD(d.created_at)).filter(Boolean));
      if (selectedDate !== "ALL" && !dates.has(selectedDate)) setSelectedDate("ALL");
    } catch (e) {
      setErrorMsg("Failed to load rejected donations");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRejected();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRejected();
  };

  const removeFromUI = (id) => {
    setItems((prev) => prev.filter((d) => String(d.donation_id) !== String(id)));
  };

  const restoreDonation = async (id) => {
    try {
      setSubmitting((s) => ({ ...s, [id]: true }));
      removeFromUI(id); // optimistic

      await axios.post(`${config.API_URL}/assoc/donations/${id}/restore`);
    } catch (e) {
      const msg =
        e?.response?.status === 403
          ? "Restore time expired (2 hours)."
          : "Could not restore donation.";
      Alert.alert("Error", msg);
      fetchRejected();
    } finally {
      setSubmitting((s) => {
        const c = { ...s };
        delete c[id];
        return c;
      });
    }
  };

  // ✅ dropdown options
  const allDates = useMemo(() => {
    const set = new Set();
    items.forEach((d) => {
      const ymd = getYMD(d.created_at);
      if (ymd) set.add(ymd);
    });
    return ["ALL", ...Array.from(set).sort().reverse()];
  }, [items]);

  // ✅ filtered list
  const filteredItems =
    selectedDate === "ALL" ? items : items.filter((d) => getYMD(d.created_at) === selectedDate);

  const renderItem = ({ item }) => {
    const isSubmitting = !!submitting[item.donation_id];
    const dateStr = getYMD(item.created_at);

    const rejectTime = getRejectTime(item);
    const showRestore = canRestore(rejectTime);
    const left = minutesLeft(rejectTime);

    return (
      <View style={styles.card}>
        {item.item_image ? (
          <Image source={{ uri: item.item_image }} style={styles.itemImage} />
        ) : (
          <Image source={require("../assets/icon.png")} style={styles.itemImage} />
        )}

        <Text style={styles.title}>{item.donor_name}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {item.note || "No description"}
        </Text>
        <Text style={styles.date}>Date: {dateStr || "-"}</Text>

        <View style={styles.statusContainer}>
          <Text style={styles.statusRejected}>Rejected</Text>
        </View>

        <View style={styles.actions}>
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

          {showRestore && (
            <TouchableOpacity
              style={[styles.btn, styles.restoreBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={() => restoreDonation(item.donation_id)}
              disabled={isSubmitting}
            >
              <Text style={styles.btnText}>Restore</Text>
              <Text style={styles.timerText}>{left} min left</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* force re-render for countdown */}
        <Text style={{ display: "none" }}>{tick}</Text>
      </View>
    );
  };

  const modalDate = getYMD(selected?.created_at);
  const selectedRejectTime = selected ? getRejectTime(selected) : null;
  const modalCanRestore = selectedRejectTime ? canRestore(selectedRejectTime) : false;
  const modalLeft = selectedRejectTime ? minutesLeft(selectedRejectTime) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerLarge}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerMainTitle}>Rejected Donations</Text>
        </View>
      </View>

      {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

      {/* ✅ FILTER (Dropdown) */}
      <View style={styles.filterBox}>
          {selectedDate !== "ALL" && (
            <Text style={styles.filterTitle}>Filter Rejected by Date</Text>
          )}
          <View style={styles.pickerWrap}>
            <Picker
              mode="dropdown"
              selectedValue={selectedDate}
              onValueChange={(v) => setSelectedDate(v)}
              style={{ width: "100%", height: 40, color: "#333" }}
              itemStyle={{ height: 40 }}
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
          keyExtractor={(item) => String(item.donation_id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 30 }}>No rejected donations</Text>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* ✅ DETAILS MODAL */}
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

            <Text style={styles.modalDesc}>
              {selected?.note?.trim() ? selected.note : "No description"}
            </Text>

            <Text style={styles.modalDate}>Date: {modalDate || "-"}</Text>

            <Text style={styles.modalHint}>
              Restore window: {modalCanRestore ? `${modalLeft} min left` : "Expired"}
            </Text>

            <View style={styles.modalActions}>
              {modalCanRestore && (
                <TouchableOpacity
                  style={[styles.btn, styles.restoreBtn]}
                  onPress={() => {
                    const id = selected?.donation_id;
                    setDetailsVisible(false);
                    setSelected(null);
                    if (id) restoreDonation(id);
                  }}
                >
                  <Text style={styles.btnText}>Restore</Text>
                  <Text style={styles.timerText}>{modalLeft} min left</Text>
                </TouchableOpacity>
              )}

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

  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#8b6f69",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 6,
  },

  headerLarge: { backgroundColor: "#EBE1D7", paddingVertical: 16, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  welcomeLogo: { width: 135, height: 135, marginRight: 10, marginLeft: -35, marginTop: -50 },
  headerTextContainer: { flex: 1 },
  headerMainTitle: { fontFamily: "Times New Roman", fontSize: 23, marginTop: -50, marginLeft: -50, color: "#8b6f69" },

  error: {
    textAlign: "center",
    color: "#9b1c1c",
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
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 14,
    marginBottom: 20,
    elevation: 3,
  },

  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginBottom: 8,
  },

  title: { fontSize: 18, fontWeight: "700", color: "#333" },
  subtitle: { fontSize: 14, color: "#666", marginVertical: 4 },
  date: { fontSize: 13, color: "#444" },

  statusContainer: { position: "absolute", right: 10, top: 10 },
  statusRejected: {
    backgroundColor: "#ef4444",
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    fontWeight: "700",
  },

  actions: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" },

  btn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  detailsBtn: { backgroundColor: "#8b6f69" },
  restoreBtn: { backgroundColor: "#fea86e" },
  closeBtn: { backgroundColor: "#8b6f69" },

  btnText: { color: "#fff", fontWeight: "700" },
  timerText: { color: "#fff", fontSize: 10, marginTop: 2, opacity: 0.9 },

  // ✅ Modal
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
  modalDesc: { fontSize: 14, color: "#555", marginBottom: 10, lineHeight: 20 },
  modalDate: { fontSize: 13, color: "#666", marginBottom: 6 },
  modalHint: { fontSize: 12, color: "#8b6f69", marginBottom: 12 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
});
