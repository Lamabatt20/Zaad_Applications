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
  Alert,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import config from "../config";

export default function PendingClothesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingDonations, setPendingDonations] = useState([]);
  const [submitting, setSubmitting] = useState({}); // { [id]: 'accept' | 'reject' }

  // ✅ Details modal
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState(null);

  // ✅ Date filter
  const [selectedDate, setSelectedDate] = useState("ALL");
  const [filterVisible, setFilterVisible] = useState(false);

  const buildImageUrl = (raw) => {
    if (!raw) return null;
    const full = String(raw).startsWith("/") ? `${config.API_URL}${raw}` : raw;
    return encodeURI(full);
  };

  const normalizeDonation = (x) => ({
  donation_id: x.donation_id ?? x.id,
  donor_id: x.donor_id,  // Add donor_id for grouping
  donor_name: x.donor_name ?? x.full_name ?? "Donor",
  item_image: buildImageUrl(x.item_image ?? x.photo_url ?? null),
  note: x.note ?? x.description ?? "",
  created_at: x.created_at ?? x.createdAt ?? new Date().toISOString(),
  status: x.status ?? "pending",
  delivery_method: String(x.delivery_method ?? x.deliveryMethod ?? "donor").trim().toLowerCase(),
});

const acceptDonation = async (donation) => {
  try {
    const id = donation.donation_id;
    setSubmitting((s) => ({ ...s, [id]: "accept" }));
    
    // Remove from UI
    setPendingDonations((prev) => prev.filter((d) => d.donation_id !== id));

    console.log('🔵 Accepting donation:', id);

    const response = await axios.post(`${config.API_URL}/assoc/donations/${id}/accept`, {});
    console.log('✅ Accept response:', response);
  } catch (e) {
    console.error('❌ Accept error:', e.response?.data || e.message);
    Alert.alert("Error", e.response?.data?.details || e.response?.data?.error || "Could not accept. Restoring items.");
    fetchPending();
  } finally {
    setSubmitting((s) => {
      const c = { ...s };
      delete c[donation.donation_id];
      return c;
    });
  }
};

  const getYMD = (created_at) => {
    if (typeof created_at === "string" && created_at.includes("T")) {
      return created_at.split("T")[0];
    }
    return String(created_at || "").slice(0, 10);
  };

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

  const fetchPending = async () => {
    if (!assertConfig()) return;

    try {
      setErrorMsg("");
      setLoading(true);

      // ✅ Get association_id from AsyncStorage
      const userDataStr = await AsyncStorage.getItem("user_data");
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const associationId = userData?.association_id;

      const url = associationId
        ? `${config.API_URL}/donations/clothes/pending?association_id=${associationId}`
        : `${config.API_URL}/donations/clothes/pending`;
      const res = await axios.get(url);
console.log("PENDING RAW FIRST:", res.data?.[0]);
console.log("delivery_method RAW:", res.data?.[0]?.delivery_method);

      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const normalized = arr.map(normalizeDonation);
      setPendingDonations(normalized);

      const datesSet = new Set(normalized.map((d) => getYMD(d.created_at)).filter(Boolean));
      if (selectedDate !== "ALL" && !datesSet.has(selectedDate)) setSelectedDate("ALL");
    } catch (error) {
      console.error(error);
      setErrorMsg("Failed to load pending donations");
      setPendingDonations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPending();
  };

  const removeFromUI = (id) => {
    setPendingDonations((prev) => prev.filter((d) => String(d.donation_id) !== String(id)));
  };


  const rejectDonation = async (donation) => {
    try {
      const id = donation.donation_id;
      setSubmitting((s) => ({ ...s, [id]: "reject" }));
      
      // Remove from UI
      setPendingDonations((prev) => prev.filter((d) => d.donation_id !== id));

      console.log('❌ Rejecting donation:', id);

      await axios.post(`${config.API_URL}/assoc/donations/${id}/reject`, {});
      console.log('✅ Donation rejected');
      
    } catch (e) {
      console.error('❌ Reject error:', e);
      Alert.alert("Error", "Could not reject. Restoring items.");
      fetchPending();
    } finally {
      setSubmitting((s) => {
        const c = { ...s };
        delete c[donation.donation_id];
        return c;
      });
    }
  };

  const allDates = useMemo(() => {
    const set = new Set();
    pendingDonations.forEach((d) => {
      const ymd = getYMD(d.created_at);
      if (ymd) set.add(ymd);
    });
    return ["ALL", ...Array.from(set).sort().reverse()];
  }, [pendingDonations]);

  const filteredPending =
    selectedDate === "ALL"
      ? pendingDonations
      : pendingDonations.filter((d) => getYMD(d.created_at) === selectedDate);

  const renderItem = ({ item }) => {
    const dateStr = getYMD(item.created_at);
    const isSubmitting = Boolean(submitting[item.donation_id]);

    return (
      <View style={styles.card}>
        {item.item_image ? (
          <Image source={{ uri: item.item_image }} style={styles.itemImage} />
        ) : (
          <Image source={require("../assets/icon.png")} style={styles.itemImage} />
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.donor_name}</Text>
          
          <Text numberOfLines={2} style={styles.subtitle}>
            {item.note || "No description"}
          </Text>
          
          <Text style={styles.deadline}>
            Date: <Text style={{ fontWeight: "700" }}>{dateStr || "-"}</Text>
          </Text>
          <Text style={styles.deadline}>
            Delivery:{" "}
            <Text style={{ fontWeight: "700" }}>
              {item.delivery_method === "association"
                ? "Association Pickup"
                : "Donor will deliver"}
            </Text>
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusPending}>Pending</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.btn, styles.acceptBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={() => acceptDonation(item)}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.rejectBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={() => rejectDonation(item)}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>

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
        </View>
      </View>
    );
  };

  const filterLabel = selectedDate === "ALL" ? "All Pending Dates" : selectedDate;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerLarge}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerMainTitle}>Pending Donations</Text>
        </View>
      </View>

      {!!errorMsg && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Filter Row */}
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

      {/* List */}
      <View style={styles.content}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#8b6f69" />
            <Text style={{ marginTop: 8, color: "#8b6f69" }}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPending}
            keyExtractor={(item) => String(item.donation_id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", marginTop: 30 }}>No pending donations</Text>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </View>

      {/* Filter Modal */}
      <Modal visible={filterVisible} transparent animationType="fade" onRequestClose={() => setFilterVisible(false)}>
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
                      {d === "ALL" ? "All Pending Dates" : d}
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

      {/* Details Modal */}
      <Modal visible={detailsVisible} transparent animationType="fade" onRequestClose={() => setDetailsVisible(false)}>
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
            <Text style={styles.modalDesc}>{selected?.note?.trim() ? selected.note : "No description"}</Text>
            <Text style={styles.modalDate}>Date: {getYMD(selected?.created_at) || "-"}</Text>
            <Text style={styles.modalDate}>
              Delivery:{" "}
              <Text style={{ fontWeight: "700" }}>
                {selected?.delivery_method === "association"
                  ? "Association Pickup"
                  : "Donor will deliver"}
              </Text>
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.acceptBtn]}
                onPress={() => {
                  setDetailsVisible(false);
                  if (selected) acceptDonation(selected);
                  setSelected(null);
                }}
              >
                <Text style={styles.btnText}>Accept</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.rejectBtn]}
                onPress={() => {
                  setDetailsVisible(false);
                  if (selected) rejectDonation(selected);
                  setSelected(null);
                }}
              >
                <Text style={styles.btnText}>Reject</Text>
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
  welcomeLogo: { width: 135, height: 135, marginRight: 10, marginLeft: -35, marginTop: -50 },
  headerTextContainer: { flex: 1 },
  headerMainTitle: { fontFamily: "Times New Roman", fontSize: 23, marginTop: -50, marginLeft: -50, color: "#8b6f69" },
  errorBar: { backgroundColor: "#ffefef", padding: 10 },
  errorText: { color: "#9b1c1c", textAlign: "center" },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, marginBottom: 10 },
  filterBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, elevation: 2 },
  filterBtnTitle: { fontSize: 13, fontWeight: "800", color: "#8b6f69", marginBottom: 4, fontFamily: "Times New Roman" },
  filterBtnValue: { fontSize: 14, fontWeight: "700", color: "#333" },
  clearBtn: { backgroundColor: "#8b6f69", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  clearBtnText: { color: "#fff", fontWeight: "800" },
  content: { flex: 1, backgroundColor: "#EBE1D7" },
  card: { backgroundColor: "#fff", padding: 15, borderRadius: 15, marginBottom: 20, elevation: 3 },
  itemImage: { width: 70, height: 70, borderRadius: 10, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: "700", color: "#333" },
  subtitle: { fontSize: 14, color: "#666", marginVertical: 5, width: "90%" },
  deadline: { marginTop: 5, fontSize: 14, color: "#333" },
  statusContainer: { position: "absolute", right: 10, top: 10 },
  statusPending: { backgroundColor: "#6ea8fe", color: "#fff", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontWeight: "700" },
  actionButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, alignItems: "center" },
  acceptBtn: { backgroundColor: "#4CAF50" },
  rejectBtn: { backgroundColor: "#f44336" },
  detailsBtn: { backgroundColor: "#A27571" },
  closeBtn: { backgroundColor: "#8b6f69" },
  btnText: { color: "#fff", fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 20 },
  filterModalCard: { width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: 16, padding: 16, elevation: 10 },
  sep: { height: 10 },
  dateRow: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#f3f3f3" },
  dateRowActive: { backgroundColor: "#8b6f69" },
  dateText: { fontSize: 14, fontWeight: "800", color: "#333" },
  dateTextActive: { color: "#fff" },
  modalCard: { width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: 16, padding: 16, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#8b6f69", marginBottom: 12, textAlign: "center", fontFamily: "Times New Roman" },
  modalImage: { width: "100%", height: 180, borderRadius: 12, marginBottom: 12, backgroundColor: "#f2f2f2" },
  modalName: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 6 },
  modalDesc: { fontSize: 14, color: "#555", marginBottom: 10, lineHeight: 20 },
  modalDate: { fontSize: 13, color: "#666", marginBottom: 14 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
});