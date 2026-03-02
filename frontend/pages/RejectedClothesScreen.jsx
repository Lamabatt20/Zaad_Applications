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

  // ✅ Image viewer (full-screen zoom)
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // ✅ Date filter (Dropdown)
  const [selectedDate, setSelectedDate] = useState("ALL");
   const [filterVisible, setFilterVisible] = useState(false);

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
    donor_id: x.donor_id,
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

      // ✅ Get association_id from AsyncStorage
      const userDataStr = await AsyncStorage.getItem("user_data");
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const associationId = userData?.association_id;

      // ✅ CLOTHES rejected endpoint
      const url = associationId
        ? `${config.API_URL}/donations/clothes/rejected?association_id=${associationId}`
        : `${config.API_URL}/donations/clothes/rejected`;
      const res = await axios.get(url);
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

  // ✅ Group donations
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

  // ✅ Group the filtered items
  const groupedItems = useMemo(() => {
    return groupDonations(filteredItems);
  }, [filteredItems]);

  const filterLabel = selectedDate === "ALL" ? "All Rejected Dates" : selectedDate;

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
            <Text style={styles.statusRejected}>Rejected</Text>
          </View>
        </View>

        {/* Items in Group */}
        <View style={styles.itemsContainer}>
          {group.map((item, idx) => {
            const isSubmitting = !!submitting[item.donation_id];
            const dateStr = getYMD(item.created_at);
            const rejectTime = getRejectTime(item);
            const showRestore = canRestore(rejectTime);
            const left = minutesLeft(rejectTime);

            return (
              <View key={item.donation_id} style={[styles.groupItem, idx > 0 && styles.groupItemBorder]}>
                <View style={styles.itemContent}>
                  {item.item_image ? (
                    <Image source={{ uri: item.item_image }} style={styles.itemImage} />
                  ) : (
                    <Image source={require("../assets/icon.png")} style={styles.itemImage} />
                  )}

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.subtitle} numberOfLines={2}>
                      {item.note || "No description"}
                    </Text>
                    <Text style={styles.date}>Date: {dateStr || "-"}</Text>
                  </View>
                </View>

                {/* Item Action Buttons */}
                <View style={styles.itemActionButtons}>
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
                      <Text style={styles.timerText}>{left} min</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* force re-render for countdown */}
                <Text style={{ display: "none" }}>{tick}</Text>
              </View>
            );
          })}
        </View>
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

      {/* ✅ FILTER (button + modal like Pending) */}
      <View style={styles.filterBox}>
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
                        {d === "ALL" ? "All Rejected Dates" : d}
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
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={groupedItems}
          keyExtractor={(item, idx) => `group-${idx}`}
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

            {/* Clickable Image */}
            <TouchableOpacity
              onPress={() => {
                setSelectedImage(selected.item_image);
                setImageViewerVisible(true);
              }}
            >
              {selected?.item_image ? (
                <Image source={{ uri: selected.item_image }} style={styles.modalImage} />
              ) : (
                <Image source={require("../assets/icon.png")} style={styles.modalImage} />
              )}
              <Text style={{ fontSize: 12, color: "#8b6f69", marginBottom: 8, fontWeight: "600", textAlign: "center" }}>👆 Tap to zoom</Text>
            </TouchableOpacity>

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
    backgroundColor: "transparent",
    marginHorizontal: 0,
    marginBottom: 10,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
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

  filterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, paddingHorizontal: 16 },
  filterBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginRight: 8, elevation: 2 },
  filterBtnTitle: { fontSize: 12, color: "#8b6f69", fontWeight: "800" },
  filterBtnValue: { fontSize: 13, color: "#333", marginTop: 2, fontWeight: "700" },
  clearBtn: { backgroundColor: "#8b6f69", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  clearBtnText: { color: "#fff", fontWeight: "800" },

  filterModalCard: { width: "100%", maxWidth: 360, backgroundColor: "#fff", borderRadius: 12, padding: 10 },
  sep: { height: 8 },
  dateRow: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#f3f3f3" },
  dateRowActive: { backgroundColor: "#8b6f69" },
  dateText: { color: "#333" },
  dateTextActive: { color: "#fff", fontWeight: "700" },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 14,
    marginBottom: 20,
    elevation: 3,
  },

  groupHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  itemCount: { fontSize: 12, color: "#666", marginTop: 3 },
  itemsContainer: { marginBottom: 15 },
  groupItem: { paddingVertical: 10 },
  groupItemBorder: { borderTopWidth: 1, borderTopColor: "#e0e0e0" },
  itemContent: { flexDirection: "row", alignItems: "flex-start" },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  itemActionButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 5 },

  title: { fontSize: 18, fontWeight: "700", color: "#333" },
  subtitle: { fontSize: 14, color: "#666", marginVertical: 4 },
  date: { fontSize: 13, color: "#444" },

  statusContainer: { position: "absolute", right: 15, top: 15 },
  statusRejected: {
    backgroundColor: "#ef4444",
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    fontWeight: "700",
  },

  btn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },

  detailsBtn: { backgroundColor: "#8b6f69" },
  restoreBtn: { backgroundColor: "#fea86e" },
  closeBtn: { backgroundColor: "#8b6f69" },

  btnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  timerText: { color: "#fff", fontSize: 9, marginTop: 1, opacity: 0.9 },

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
