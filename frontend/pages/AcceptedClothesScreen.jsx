import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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

export default function AcceptedClothesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState({});
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedDate, setSelectedDate] = useState("ALL");
  const [filterVisible, setFilterVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const buildImageUrl = (raw) => {
    if (!raw) return null;
    return raw.startsWith("/") ? encodeURI(`${config.API_URL}${raw}`) : raw;
  };

  const getYMD = (created_at) => {
    if (!created_at) return "";
    const s = String(created_at);
    return s.includes("T") ? s.split("T")[0] : s.slice(0, 10);
  };

  const prettyDeliveryStatus = (s) => {
    const v = String(s || "").toUpperCase();
    if (!v) return "-";
    if (v === "NEEDS_ASSIGNMENT") return "Needs assignment";
    if (v === "ASSIGNED") return "Assigned";
    if (v === "WAITING_FOR_DONOR") return "Waiting for donor";
    if (v === "PICKED_UP") return "Picked up";
    if (v === "ON_THE_WAY") return "On the way";
    if (v === "DELIVERED") return "Delivered";
    return s; // fallback
  };

  const normalizeDonation = (x) => ({
    donation_id: x.donation_id,
    donor_id: x.donor_id,
    donor_name: x.donor_name ?? "Donor",
    item_image: buildImageUrl(x.item_image),
    note: x.note ?? "",
    created_at: x.created_at,
    status: x.status ?? "accepted",
    delivery_method: x.delivery_method ?? "donor",
    delivery_status: x.delivery_status ?? null,
  });

  const fetchData = useCallback(async () => {
    try {
      setErrorMsg("");
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

      
      const datesSet = new Set(arr.map((d) => getYMD(d.created_at)).filter(Boolean));
      if (selectedDate !== "ALL" && !datesSet.has(selectedDate)) setSelectedDate("ALL");
    } catch (e) {
      setErrorMsg("Failed to load accepted donations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

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

  const approveGroup = async (group) => {
    try {
      const groupKey = group.map((d) => d.donation_id).join(",");
      setSubmitting((s) => ({ ...s, [groupKey]: true }));

      // Approve all in group
      await Promise.all(
        group.map((d) => axios.post(`${config.API_URL}/assoc/donations/${d.donation_id}/approve`, {}))
      );

      // Remove from UI
      const idsToRemove = new Set(group.map((d) => d.donation_id));
      setItems((prev) => prev.filter((d) => !idsToRemove.has(d.donation_id)));

      console.log("✅ Group approved successfully");
    } catch (e) {
      console.error("❌ Approve error:", e);
      Alert.alert("Error", "Could not approve group");
    } finally {
      const groupKey = group.map((d) => d.donation_id).join(",");
      setSubmitting((s) => {
        const c = { ...s };
        delete c[groupKey];
        return c;
      });
    }
  };

  const assignGroup = async (group) => {
    // Navigate to assign screen with first donation_id
    // In a real scenario, you might want to assign all at once
    if (group.length > 0) {
      navigation.navigate("AssignDeliveryPerson", {
        donation_id: group[0].donation_id,
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

  // Group the filtered items
  const groupedItems = useMemo(() => {
    return groupDonations(filteredItems);
  }, [filteredItems]);

  const renderItem = ({ item: group }) => {
    const firstDonation = group[0];
    const groupKey = group.map((d) => d.donation_id).join(",");
    const isSubmitting = !!submitting[groupKey];

    // Check if any item needs assignment
    const anyNeedsAssign = group.some((item) => {
      const isAssocPickup = String(item.delivery_method).toLowerCase() === "association";
      const isNeedsAssign = String(item.delivery_status || "").toUpperCase() === "NEEDS_ASSIGNMENT";
      return isAssocPickup && isNeedsAssign;
    });

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
        </View>

        {/* Items in Group */}
        <View style={styles.itemsContainer}>
          {group.map((item, idx) => (
            <View key={item.donation_id} style={[styles.groupItem, idx > 0 && styles.groupItemBorder]}>
              <Image
                source={
                  item.item_image
                    ? { uri: item.item_image }
                    : require("../assets/icon.png")
                }
                style={styles.itemImage}
              />

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.subtitle} numberOfLines={2}>
                  {item.note || "No description"}
                </Text>
                <Text style={styles.deadline}>Date: {getYMD(item.created_at)}</Text>
                <Text style={styles.deliveryInfo}>
                  Delivery:{" "}
                  {String(item.delivery_method).toLowerCase() === "association"
                    ? "Association Pickup"
                    : "Donor will deliver"}
                </Text>
                <Text style={styles.deliveryInfo}>
                  Status: {prettyDeliveryStatus(item.delivery_status)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Group Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.detailsBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={() => {
              setSelected(group);
              setDetailsVisible(true);
            }}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Details</Text>
          </TouchableOpacity>

          {anyNeedsAssign && (
            <TouchableOpacity
              style={[styles.assignBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={() => assignGroup(group)}
              disabled={isSubmitting}
            >
              <Text style={styles.btnText}>Assign</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.approveBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={() => approveGroup(group)}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filterLabel =
    selectedDate === "ALL" ? "All Accepted Dates" : selectedDate;

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

      {!!errorMsg && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setFilterVisible(true)}
        >
          <Text style={styles.filterBtnTitle}>Filter by Date</Text>
          <Text style={styles.filterBtnValue}>{filterLabel}</Text>
        </TouchableOpacity>

        {selectedDate !== "ALL" && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setSelectedDate("ALL")}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={groupedItems}
          keyExtractor={(item, idx) => `group-${idx}`}
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
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterVisible(false)}
        >
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
                    <Text
                      style={[styles.dateText, active && styles.dateTextActive]}
                    >
                      {d === "ALL" ? "All Dates" : d}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={{ height: 12 }} />

            <TouchableOpacity
              style={[styles.detailsBtn, { alignSelf: "flex-end" }]}
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
            <Text style={styles.modalTitle}>Group Details</Text>

            {Array.isArray(selected) ? (
              <>
                <Text style={{ fontWeight: "700", marginBottom: 6 }}>{selected[0]?.donor_name}</Text>
                <Text style={{ marginBottom: 12, color: "#666" }}>{selected.length} items in this group</Text>

                {/* Items List */}
                <View style={styles.groupDetailsList}>
                  {selected.map((item, idx) => (
                    <View key={item.donation_id} style={[idx > 0 && { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e0e0e0" }]}>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedImage(item.item_image);
                          setImageViewerVisible(true);
                        }}
                      >
                        <Image 
                          source={item.item_image ? { uri: item.item_image } : require("../assets/icon.png")}
                          style={{ width: "100%", height: 150, borderRadius: 8, marginBottom: 8 }}
                        />
                        <Text style={{ fontSize: 11, color: "#8b6f69", fontWeight: "600" }}>👆 Tap to zoom</Text>
                      </TouchableOpacity>
                      <Text style={{ fontWeight: "600", marginBottom: 4, marginTop: 8 }}>{item.note || "No description"}</Text>
                      <Text style={{ fontSize: 12, color: "#666" }}>
                        Delivery:{" "}
                        {String(item.delivery_method).toLowerCase() === "association"
                          ? "Association Pickup"
                          : "Donor will deliver"}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#666" }}>
                        Status: {prettyDeliveryStatus(item.delivery_status)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={{ fontWeight: "700" }}>{selected?.donor_name}</Text>
                <Text style={{ marginTop: 6 }}>{selected?.note}</Text>

                <Text style={{ marginTop: 10 }}>
                  Delivery Method:{" "}
                  {String(selected?.delivery_method).toLowerCase() === "association"
                    ? "Association Pickup"
                    : "Donor will deliver"}
                </Text>
                <Text>
                  Delivery Status: {prettyDeliveryStatus(selected?.delivery_status)}
                </Text>
              </>
            )}

            <TouchableOpacity
              style={[styles.detailsBtn, { alignSelf: "flex-end", marginTop: 16 }]}
              onPress={() => setDetailsVisible(false)}
            >
              <Text style={styles.btnText}>Close</Text>
            </TouchableOpacity>
          </View>
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

  errorBar: { backgroundColor: "#ffefef", padding: 10 },
  errorText: { color: "#9b1c1c", textAlign: "center" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
  },
  groupHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  itemCount: { fontSize: 12, color: "#666", marginTop: 3 },
  itemsContainer: { marginBottom: 15 },
  groupItem: { paddingVertical: 10, flexDirection: "row" },
  groupItemBorder: { borderTopWidth: 1, borderTopColor: "#e0e0e0" },
  itemImage: { width: 70, height: 70, borderRadius: 10 },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { color: "#555", marginVertical: 4 },
  deadline: { fontSize: 13, color: "#333" },
  deliveryInfo: { fontSize: 13, color: "#333", marginTop: 2 },

  actionButtons: { flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" },
  detailsBtn: { backgroundColor: "#8b6f69", padding: 8, borderRadius: 8 },
  assignBtn: { backgroundColor: "#A27571", padding: 8, borderRadius: 8 },
  approveBtn: { backgroundColor: "#3b82f6", padding: 8, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "700" },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filterBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    elevation: 2,
  },
  filterBtnTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#8b6f69",
    marginBottom: 4,
    fontFamily: "Times New Roman",
  },
  filterBtnValue: { fontSize: 14, fontWeight: "700", color: "#333" },
  clearBtn: {
    backgroundColor: "#8b6f69",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  clearBtnText: { color: "#fff", fontWeight: "800" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  filterModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 10,
  },
  sep: { height: 10 },
  dateRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#f3f3f3",
  },
  dateRowActive: { backgroundColor: "#8b6f69" },
  dateText: { fontSize: 14, fontWeight: "800", color: "#333" },
  dateTextActive: { color: "#fff" },

  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
  },
  groupDetailsList: { maxHeight: 280, marginVertical: 12 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#8b6f69",
    marginBottom: 10,
    textAlign: "center",
    fontFamily: "Times New Roman",
  },
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