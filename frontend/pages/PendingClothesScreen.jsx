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
  const [selectedItem, setSelectedItem] = useState(null);

  // ✅ Image viewer (full-screen zoom)
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

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

const groupDonations = (donations) => {
  // Group by donor_id first
  const byDonor = {};
  donations.forEach((d) => {
    if (!byDonor[d.donor_id]) {
      byDonor[d.donor_id] = [];
    }
    byDonor[d.donor_id].push(d);
  });

  // Within each donor, group by time (5 minute windows)
  const groups = [];
  Object.values(byDonor).forEach((donorDonations) => {
    const sorted = donorDonations.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let currentGroup = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].created_at).getTime();
      const curr = new Date(sorted[i].created_at).getTime();
      const diffMinutes = (curr - prev) / (1000 * 60);

      if (diffMinutes <= 5) {
        currentGroup.push(sorted[i]);
      } else {
        groups.push(currentGroup);
        currentGroup = [sorted[i]];
      }
    }
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
  });

  return groups;
};

const acceptDonation = async (donation) => {
  try {
    const id = donation.donation_id;
    setSubmitting((s) => ({ ...s, [id]: "accept" }));

    // Remove from UI
    setPendingDonations((prev) => prev.filter((d) => d.donation_id !== id));

    console.log("🔵 Accepting donation:", id);

    const response = await axios.post(`${config.API_URL}/assoc/donations/${id}/accept`, {});
    console.log("✅ Accept response:", response.data);
  } catch (e) {
    console.error("❌ Accept error:", e.response?.data || e.message);
    Alert.alert("Error", e.response?.data?.error || e.response?.data?.details || "Could not accept. Restoring items.");
    fetchPending();
  } finally {
    setSubmitting((s) => {
      const c = { ...s };
      delete c[donation.donation_id];
      return c;
    });
  }
};

const rejectDonation = async (donation) => {
  try {
    const id = donation.donation_id;
    setSubmitting((s) => ({ ...s, [id]: "reject" }));

    // Remove from UI
    setPendingDonations((prev) => prev.filter((d) => d.donation_id !== id));

    console.log("❌ Rejecting donation:", id);

    const response = await axios.post(`${config.API_URL}/assoc/donations/${id}/reject`, {});
    console.log("✅ Reject response:", response.data);
  } catch (e) {
    console.error("❌ Reject error:", e.response?.data || e.message);
    Alert.alert("Error", e.response?.data?.error || "Could not reject. Restoring items.");
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

  // Group the filtered donations
  const groupedPending = useMemo(() => {
    return groupDonations(filteredPending);
  }, [filteredPending]);

  const renderItem = ({ item: group }) => {
    const firstDonation = group[0];

    return (
      <View style={styles.card}>
        {/* Group Header */}
        <View style={styles.groupHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{firstDonation.donor_name}</Text>
            <Text style={styles.itemCount}>
              {group.length} item{group.length > 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <Text style={styles.statusPending}>Pending</Text>
          </View>
        </View>

        {/* Items in Group */}
        <View style={styles.itemsContainer}>
          {group.map((item, idx) => {
            const isSubmitting = Boolean(submitting[item.donation_id]);
            return (
              <View key={item.donation_id} style={[styles.groupItem, idx > 0 && styles.groupItemBorder]}>
                <View style={styles.itemContent}>
                  {item.item_image ? (
                    <Image source={{ uri: item.item_image }} style={styles.itemImage} />
                  ) : (
                    <Image source={require("../assets/icon.png")} style={styles.itemImage} />
                  )}

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text numberOfLines={2} style={styles.subtitle}>
                      {item.note || "No description"}
                    </Text>
                    <Text style={styles.deadline}>
                      Date: <Text style={{ fontWeight: "700" }}>{getYMD(item.created_at) || "-"}</Text>
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
                </View>

                {/* Item Action Buttons */}
                <View style={styles.itemActionButtons}>
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
                      setSelectedItem(item);
                      setDetailsVisible(true);
                    }}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.btnText}>Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
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
            data={groupedPending}
            keyExtractor={(item, idx) => `group-${idx}`}
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
            setSelectedItem(null);
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Donation Details</Text>

            {selectedItem && (
              <>
                {/* Clickable Image */}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImage(selectedItem.item_image);
                    setImageViewerVisible(true);
                  }}
                >
                  {selectedItem.item_image ? (
                    <Image source={{ uri: selectedItem.item_image }} style={styles.modalImage} />
                  ) : (
                    <Image source={require("../assets/icon.png")} style={styles.modalImage} />
                  )}
                  <Text style={{ fontSize: 12, color: "#8b6f69", marginBottom: 8, fontWeight: "600", textAlign: "center" }}>👆 Tap to zoom</Text>
                </TouchableOpacity>

                <Text style={styles.modalName}>{selectedItem.donor_name || "Donor"}</Text>
                <Text style={styles.modalDesc}>{selectedItem.note?.trim() ? selectedItem.note : "No description"}</Text>
                <Text style={styles.modalDate}>Date: {getYMD(selectedItem.created_at) || "-"}</Text>
                <Text style={styles.modalDate}>
                  Delivery:{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {selectedItem.delivery_method === "association"
                      ? "Association Pickup"
                      : "Donor will deliver"}
                  </Text>
                </Text>

                {/* Modal Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.btn, styles.acceptBtn]}
                    onPress={() => {
                      setDetailsVisible(false);
                      if (selectedItem) acceptDonation(selectedItem);
                      setSelectedItem(null);
                    }}
                  >
                    <Text style={styles.btnText}>Accept</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.rejectBtn]}
                    onPress={() => {
                      setDetailsVisible(false);
                      if (selectedItem) rejectDonation(selectedItem);
                      setSelectedItem(null);
                    }}
                  >
                    <Text style={styles.btnText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.closeBtn]}
                    onPress={() => {
                      setDetailsVisible(false);
                      setSelectedItem(null);
                    }}
                  >
                    <Text style={styles.btnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Full-Screen Image Viewer */}
      <Modal visible={imageViewerVisible} transparent animationType="fade" onRequestClose={() => setImageViewerVisible(false)}>
        <Pressable
          style={styles.imageViewerOverlay}
          onPress={() => setImageViewerVisible(false)}
        >
          <View style={styles.imageViewerContent}>
            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.imageViewerImage} resizeMode="contain" />
            ) : (
              <Image source={require("../assets/icon.png")} style={styles.imageViewerImage} resizeMode="contain" />
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={styles.imageCloseBtn}
              onPress={() => setImageViewerVisible(false)}
            >
              <Text style={styles.imageCloseBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
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
  groupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  itemCount: { fontSize: 12, color: "#666", marginTop: 3 },
  itemsContainer: { marginBottom: 15 },
  groupItem: { paddingVertical: 10 },
  groupItemBorder: { borderTopWidth: 1, borderTopColor: "#e0e0e0" },
  itemContent: { flexDirection: "row", alignItems: "flex-start" },
  itemImage: { width: 70, height: 70, borderRadius: 10 },
  itemActionButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 5 },
  title: { fontSize: 18, fontWeight: "700", color: "#333" },
  subtitle: { fontSize: 14, color: "#666", marginVertical: 5, width: "90%" },
  deadline: { marginTop: 5, fontSize: 14, color: "#333" },
  statusContainer: { position: "absolute", right: 15, top: 15 },
  statusPending: { backgroundColor: "#6ea8fe", color: "#fff", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontWeight: "700" },
  btn: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8, alignItems: "center", flex: 1 },
  acceptBtn: { backgroundColor: "#4CAF50" },
  rejectBtn: { backgroundColor: "#f44336" },
  detailsBtn: { backgroundColor: "#A27571" },
  closeBtn: { backgroundColor: "#8b6f69" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
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
  modalItemsList: { marginVertical: 12, maxHeight: 280 },
  modalItem: { flexDirection: "row", alignItems: "flex-start" },
  modalItemImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: "#f2f2f2" },
  modalName: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 6 },
  modalDesc: { fontSize: 14, color: "#555", marginBottom: 10, lineHeight: 20 },
  modalDate: { fontSize: 13, color: "#666", marginBottom: 14 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  // Image Viewer Styles
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  imageViewerContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerImage: {
    width: "100%",
    height: "80%",
  },
  imageCloseBtn: {
    backgroundColor: "#8b6f69",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  imageCloseBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});